-- Prevent repeated question text within a single quiz attempt.
-- Keep one representative row for each normalized question text before random selection.
CREATE OR REPLACE FUNCTION public.start_quiz_attempt(
  p_quiz_type text,
  p_category text DEFAULT NULL::text,
  p_city_slug text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  uid uuid := (SELECT auth.uid());
  v_attempt_id uuid;
  normalized_category text := p_category;
  rows_json jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Prijava je potrebna';
  END IF;

  IF p_quiz_type NOT IN ('croatian','city','daily') THEN
    RAISE EXCEPTION 'Nepoznata vrsta kviza';
  END IF;

  IF p_quiz_type = 'croatian' THEN
    IF normalized_category = 'domovinski-rat' THEN
      normalized_category := 'domovinski_rat';
    END IF;
    IF normalized_category IS NULL THEN
      RAISE EXCEPTION 'Kategorija je obavezna';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.quiz_questions
      WHERE active AND category = normalized_category
    ) THEN
      RAISE EXCEPTION 'Kategorija nema aktivnih pitanja';
    END IF;
  ELSIF p_quiz_type = 'city' THEN
    IF p_city_slug IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.cities WHERE active AND slug = p_city_slug
    ) THEN
      RAISE EXCEPTION 'Grad nije dostupan';
    END IF;
    IF (
      SELECT count(*)
      FROM public.city_questions cq
      JOIN public.cities c ON c.id = cq.city_id
      WHERE cq.active AND c.active AND c.slug = p_city_slug
    ) < 10 THEN
      RAISE EXCEPTION 'Grad nema dovoljno pitanja';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.quiz_results r
      WHERE r.user_id = uid
        AND r.quiz_type = 'daily'
        AND (r.created_at AT TIME ZONE 'Europe/Zagreb')::date
            = (now() AT TIME ZONE 'Europe/Zagreb')::date
    ) THEN
      RAISE EXCEPTION 'Današnji Dnevni kviz je već odigran';
    END IF;
  END IF;

  -- Resume only an active attempt whose question texts are unique.
  SELECT a.id
    INTO v_attempt_id
  FROM public.quiz_attempts a
  WHERE a.user_id = uid
    AND a.submitted_at IS NULL
    AND a.expires_at > now()
    AND a.quiz_type = p_quiz_type
    AND (
      (p_quiz_type = 'croatian' AND a.category = normalized_category)
      OR (p_quiz_type = 'city' AND a.city_slug = p_city_slug)
      OR p_quiz_type = 'daily'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.quiz_attempt_questions aq
      JOIN LATERAL (
        SELECT qq.question
        FROM public.quiz_questions qq
        WHERE qq.id = aq.question_id
          AND a.quiz_type IN ('croatian','daily')
        UNION ALL
        SELECT cq.question
        FROM public.city_questions cq
        WHERE cq.id = aq.question_id
          AND a.quiz_type = 'city'
      ) qtxt ON true
      WHERE aq.attempt_id = a.id
      GROUP BY lower(regexp_replace(trim(qtxt.question), '\s+', ' ', 'g'))
      HAVING count(*) > 1
    )
  ORDER BY a.started_at DESC
  LIMIT 1;

  IF v_attempt_id IS NULL THEN
    INSERT INTO public.quiz_attempts(
      user_id, quiz_type, category, city_slug, expires_at
    )
    VALUES (
      uid,
      p_quiz_type,
      CASE WHEN p_quiz_type = 'croatian' THEN normalized_category END,
      CASE WHEN p_quiz_type = 'city' THEN p_city_slug END,
      now() + interval '15 minutes'
    )
    RETURNING id INTO v_attempt_id;

    IF p_quiz_type = 'city' THEN
      WITH candidates AS (
        SELECT
          cq.id,
          cq.correct_index,
          lower(regexp_replace(trim(cq.question), '\s+', ' ', 'g')) AS normalized
        FROM public.city_questions cq
        JOIN public.cities c ON c.id = cq.city_id
        WHERE cq.active AND c.active AND c.slug = p_city_slug
      ),
      unique_candidates AS (
        SELECT DISTINCT ON (normalized) id, correct_index
        FROM candidates
        ORDER BY normalized, id
      ),
      ranked AS (
        SELECT
          id,
          correct_index,
          row_number() OVER (
            ORDER BY md5(id::text || ':' || v_attempt_id::text)
          )::smallint AS position
        FROM unique_candidates
      )
      INSERT INTO public.quiz_attempt_questions(
        attempt_id, position, question_id, correct_index
      )
      SELECT v_attempt_id, position, id, correct_index
      FROM ranked
      ORDER BY position
      LIMIT 10;
    ELSE
      WITH candidates AS (
        SELECT
          q.id,
          q.correct_index,
          lower(regexp_replace(trim(q.question), '\s+', ' ', 'g')) AS normalized
        FROM public.quiz_questions q
        WHERE q.active
          AND (p_quiz_type = 'daily' OR q.category = normalized_category)
      ),
      unique_candidates AS (
        SELECT DISTINCT ON (normalized) id, correct_index
        FROM candidates
        ORDER BY normalized, id
      ),
      ranked AS (
        SELECT
          id,
          correct_index,
          row_number() OVER (
            ORDER BY md5(
              id::text || ':' ||
              CASE
                WHEN p_quiz_type = 'daily'
                  THEN (now() AT TIME ZONE 'Europe/Zagreb')::date::text
                ELSE v_attempt_id::text
              END
            )
          )::smallint AS position
        FROM unique_candidates
      )
      INSERT INTO public.quiz_attempt_questions(
        attempt_id, position, question_id, correct_index
      )
      SELECT v_attempt_id, position, id, correct_index
      FROM ranked
      ORDER BY position
      LIMIT 10;
    END IF;
  END IF;

  IF (
    SELECT count(*)
    FROM public.quiz_attempt_questions aq
    WHERE aq.attempt_id = v_attempt_id
  ) <> 10 THEN
    RAISE EXCEPTION 'Nije moguće pripremiti 10 jedinstvenih pitanja';
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', x.id,
      'category', x.category,
      'question', x.question,
      'answers', jsonb_build_array(
        x.answer_a, x.answer_b, x.answer_c, x.answer_d
      ),
      'sourceUrl', x.source_url
    )
    ORDER BY x.position
  )
  INTO rows_json
  FROM (
    SELECT
      aq.position, cq.id, cq.category, cq.question,
      cq.answer_a, cq.answer_b, cq.answer_c, cq.answer_d, cq.source_url
    FROM public.quiz_attempt_questions aq
    JOIN public.city_questions cq ON cq.id = aq.question_id
    JOIN public.quiz_attempts a
      ON a.id = aq.attempt_id AND a.quiz_type = 'city'
    WHERE aq.attempt_id = v_attempt_id

    UNION ALL

    SELECT
      aq.position, qq.id, qq.category, qq.question,
      qq.answer_a, qq.answer_b, qq.answer_c, qq.answer_d, qq.source_url
    FROM public.quiz_attempt_questions aq
    JOIN public.quiz_questions qq ON qq.id = aq.question_id
    JOIN public.quiz_attempts a
      ON a.id = aq.attempt_id
      AND a.quiz_type IN ('croatian','daily')
    WHERE aq.attempt_id = v_attempt_id
  ) x;

  RETURN jsonb_build_object(
    'attemptId', v_attempt_id,
    'startedAt', (
      SELECT started_at FROM public.quiz_attempts WHERE id = v_attempt_id
    ),
    'expiresAt', (
      SELECT expires_at FROM public.quiz_attempts WHERE id = v_attempt_id
    ),
    'questions', coalesce(rows_json, '[]'::jsonb)
  );
END;
$function$;
