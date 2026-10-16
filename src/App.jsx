import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, FileText, Loader2, LogIn, LogOut, MapPin, RotateCcw, ShieldCheck, Trophy, UserRound, Medal, BookOpen, MessageCircle, Send, Reply, Trash2, AtSign } from "lucide-react";
import Pravilnik from "./pages/Pravilnik";
import QuizPlayer from "./pages/QuizPlayer";
import { fetchCities } from "./lib/cityQuiz";
import { getMainQuizCount } from "./lib/mainQuiz";
import { getDailyQuizKey } from "./lib/dailyQuiz";
import { getLeaderboard, getMyResults, getMyResultStats, hasPlayedDailyQuiz } from "./lib/results";
import { startQuizAttempt, finishQuizAttempt } from "./lib/attempts";
import { getMyProfile, saveMyNickname, saveMyAvatar } from "./lib/profile";
import { getMyProgress } from "./lib/progress";
import { getAdminDashboardStats, getAdminUsers, getAdminQuizResults, deleteAdminQuizResult } from "./lib/admin";
import { supabase } from "./lib/supabase";
import { getCommunityComments, createCommunityComment, deleteCommunityComment, getCommunityMembers, createCommunityNotification, getCommunityNotifications, markCommunityNotificationRead } from "./lib/community";

const categories = [
  ["opce", "Hrvatsko opće znanje", "Raznoliko znanje o Hrvatskoj."],
  ["povijest", "Povijest Hrvatske", "Ključni događaji i osobe hrvatske povijesti."],
  ["domovinski_rat", "Domovinski rat", "Sjećanje, znanje i povijesne činjenice."],
  ["geografija", "Geografija Hrvatske", "Gradovi, krajevi, otoci, rijeke i planine."],
  ["priroda", "Priroda Hrvatske", "Nacionalni parkovi i životinjski svijet."],
  ["bastina", "Kultura i baština", "Kultura, običaji i hrvatsko nasljeđe."],
  ["glagoljica", "Glagoljica", "Pismo i glagoljska kulturna baština Hrvata."],
  ["vjera", "Vjera i sakralna baština", "Vjera, crkvena baština i sakralna kultura."],
  ["sport", "Sport", "Hrvatski sportaši, klubovi i reprezentacije."],
  ["znanost", "Znanost i izumi", "Hrvatski znanstvenici, izumitelji i otkrića."],
];

export default function App() {
  const [screen, setScreen] = useState("home");
  const [round, setRound] = useState([]);
  const [attemptId, setAttemptId] = useState(null);
  const [result, setResult] = useState(null);
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState(null);
  const [activeQuizType, setActiveQuizType] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [loadingMainCount, setLoadingMainCount] = useState(true);
  const [mainCount, setMainCount] = useState(0);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardType, setLeaderboardType] = useState(null);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordConfirm, setAuthPasswordConfirm] = useState("");
  const [authRulesAccepted, setAuthRulesAccepted] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [dailyPlayed, setDailyPlayed] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [accountResults, setAccountResults] = useState([]);
  const [accountStatsResults, setAccountStatsResults] = useState([]);
  const [accountResultCount, setAccountResultCount] = useState(0);
  const [accountPage, setAccountPage] = useState(1);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const accountPageSize = 20;
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHelp, setInstallHelp] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [profile, setProfile] = useState(null);
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [savingNickname, setSavingNickname] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [playerProgress, setPlayerProgress] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminResults, setAdminResults] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState(null);
  const pendingCategoryRef = useRef(null);
  const pendingCategoryStorageKey = "patriasoul_pending_category_v3";
  const [communityComments, setCommunityComments] = useState([]);
  const [communityMembers, setCommunityMembers] = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityLoadingMore, setCommunityLoadingMore] = useState(false);
  const [communityPage, setCommunityPage] = useState(1);
  const [communityHasMore, setCommunityHasMore] = useState(false);
  const [communitySending, setCommunitySending] = useState(false);
  const [communityText, setCommunityText] = useState("");
  const [communityReplyTo, setCommunityReplyTo] = useState(null);
  const [communityMentionQuery, setCommunityMentionQuery] = useState("");
  const [communityMentionOpen, setCommunityMentionOpen] = useState(false);
  const [communityNotifications, setCommunityNotifications] = useState([]);
  const [communityNotificationsOpen, setCommunityNotificationsOpen] = useState(false);

  const accountStats = (() => {
    const results = Array.isArray(accountStatsResults) ? accountStatsResults : [];
    const played = results.length;
    const correct = results.reduce((sum, r) => sum + Number(r.score || 0), 0);
    const total = results.reduce((sum, r) => sum + Number(r.total || 0), 0);
    const accuracy = total ? (correct / total) * 100 : 0;
    const best = results.reduce((bestScore, r) => {
      const percentage = Number(r.percentage ?? ((Number(r.score || 0) / Math.max(Number(r.total || 1), 1)) * 100));
      return Math.max(bestScore, percentage);
    }, 0);
    const city = results.filter((r) => r.quiz_type === "city").length;
    const croatian = results.filter((r) => r.quiz_type === "croatian").length;
    const daily = results.filter((r) => r.quiz_type === "daily").length;
    return { played, correct, total, accuracy, best, city, croatian, daily };
  })();

  const badgeMilestones = [
    [10, "Čuvar početaka", "Prvi korak u čuvanju hrvatskog znanja."],
    [20, "Istraživač Hrvatske", "Upoznaješ Hrvatsku kroz igru i znanje."],
    [30, "Čuvar baštine", "Baština više nije samo prošlost — čuvaš je znanjem."],
    [40, "Čuvar Domovine", "Znanje, povijest i identitet postaju tvoj put."],
    [50, "PatriaSoul znalac", "Dosegnuo si polovicu puta do najviše značke."],
    [60, "Čuvar znanja", "Svoje znanje gradiš i prenosiš dalje."],
    [70, "PatriaSoul učitelj", "Iskustvo pretvaraš u trajno znanje."],
    [80, "Čuvar identiteta", "Hrvatska, povijest i baština postaju dio tvog rezultata."],
    [90, "PatriaSoul legenda", "Još samo jedan korak do najviše značke."],
    [100, "Čuvar nasljeđa", "Najviša PatriaSoul značka — čuvar priče koja se prenosi dalje."]
  ];
  const totalPlayerXp = playerProgress.reduce((sum, row) => sum + Number(row.xp || 0), 0);
  const playerLevel = Math.min(100, Math.max(1, Math.floor(totalPlayerXp / 100) + 1));
  const currentBadge = [...badgeMilestones].reverse().find(([level]) => playerLevel >= level) || [0, "PatriaSoul početnik", "Tvoj put tek počinje."];
  const nextBadge = badgeMilestones.find(([level]) => playerLevel < level) || null;
  const xpIntoLevel = totalPlayerXp % 100;
  const xpToNextLevel = playerLevel >= 100 ? 0 : 100 - xpIntoLevel;
  const xpToNextBadge = nextBadge ? Math.max(0, nextBadge[0] * 100 - totalPlayerXp) : 0;

  const accountDisplayName = profile?.display_name || "PatriaSoul igrač";
  const accountUsername = profile?.display_name || "";
  const accountAvatar =
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    user?.user_metadata?.photo_url ||
    "";

  useEffect(() => {
    if (!supabase) return undefined;

    let mounted = true;
    let subscription = null;

    // Supabase preporučuje da se inicijalna sesija učita prije
    // registracije auth listenera. Time izbjegavamo race/deadlock
    // između getUser() i onAuthStateChange() tijekom inicijalizacije.
    const loadInitialAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (!mounted) return;

        const currentUser = data?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          try {
            const currentProfile = await getMyProfile();
            if (!mounted) return;
            setProfile(currentProfile);
            if (!currentProfile?.display_name?.trim()) {
              setNickname("");
              setNicknameOpen(true);
            }
          } catch (profileError) {
            if (mounted) setError(profileError.message || "Profil se nije mogao učitati.");
          }
        } else {
          setProfile(null);
          setNicknameOpen(false);
          setAuthMode("login");
          setAuthOpen(true);
        }
      } catch (authError) {
        if (mounted) setError(authError.message || "Prijava se trenutno ne može provjeriti.");
      }

      if (!mounted) return;

      const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Ne pozivamo druge Supabase API-je unutar auth callbacka.
        // Profil učitavamo nakon što callback završi.
        window.setTimeout(async () => {
          if (!mounted) return;

          if (!currentUser) {
            setProfile(null);
            setNicknameOpen(false);
            setAuthMode("login");
            setAuthOpen(true);
            return;
          }

          if (event === "SIGNED_IN") {
            setAuthOpen(false);
            setScreen("home");
          }

          try {
            const currentProfile = await getMyProfile();
            if (!mounted) return;
            setProfile(currentProfile);
            if (!currentProfile?.display_name?.trim()) {
              setNickname("");
              setNicknameOpen(true);
            }
          } catch (profileError) {
            if (mounted) setError(profileError.message || "Profil se nije mogao učitati.");
          }
        }, 0);
      });

      subscription = listener?.subscription ?? null;
    };

    loadInitialAuth();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const submitAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSavingAvatar(true);
    setError("");
    try {
      const saved = await saveMyAvatar(file);
      setProfile(saved);
    } catch (avatarError) {
      setError(avatarError.message || "Profilna slika nije spremljena.");
    } finally {
      setSavingAvatar(false);
      event.target.value = "";
    }
  };

  const submitNickname = async () => {
    const clean = nickname.trim();
    if (clean.length < 3 || clean.length > 24) {
      setError("Nadimak mora imati između 3 i 24 znaka.");
      return;
    }
    setSavingNickname(true);
    setError("");
    try {
      const saved = await saveMyNickname(clean);
      setProfile(saved);
      setNicknameOpen(false);
    } catch (nicknameError) {
      setError(nicknameError.message || "Nadimak nije spremljen.");
    } finally {
      setSavingNickname(false);
    }
  };

  useEffect(() => {
    const media = window.matchMedia("(display-mode: standalone)");
    const standalone = media.matches || window.navigator.standalone === true;
    setIsStandalone(standalone);

    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallHelp(false);
      setIsStandalone(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const installPatriaSoul = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setInstallPrompt(null);
      }
      return;
    }
    setInstallHelp(true);
  };

  useEffect(() => {
    let cancelled = false;
    getMainQuizCount().then((count) => {
      if (!cancelled) setMainCount(count);
    }).catch(() => {
      if (!cancelled) setMainCount(0);
    }).finally(() => {
      if (!cancelled) setLoadingMainCount(false);
    });
    return () => { cancelled = true; };
  }, []);

  const requireAuth = (action) => {
    if (user) {
      action();
      return true;
    }
    setAuthMode("login");
    setAuthRulesAccepted(false);
    setAuthName("");
    setAuthUsername("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthPasswordConfirm("");
    setError("");
    setAuthOpen(true);
    return false;
  };

  const signIn = () => {
    setAuthRulesAccepted(false);
    setAuthEmail("");
    setError("");
    setAuthOpen(true);
  };

  const getAuthRedirectUrl = () => {
    const baseUrl = import.meta.env.BASE_URL || "/";
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (isLocal) return new URL(baseUrl, window.location.origin).toString();
    return "https://cn-dom.github.io/kviz/";
  };

  const validateAuth = () => {
    if (!authRulesAccepted) {
      setError("Za nastavak moraš prihvatiti Pravilnik o igranju kvizova.");
      return false;
    }
    if (!supabase) {
      setError("Supabase nije konfiguriran.");
      return false;
    }
    if (!authEmail.trim()) {
      setError("Upiši svoju e-mail adresu.");
      return false;
    }
    if (authPassword.length < 6) {
      setError("Lozinka mora imati najmanje 6 znakova.");
      return false;
    }
    return true;
  };

  const submitAuth = async () => {
    setError("");
    if (!validateAuth()) return;
    if (authMode === "register") {
      if (!authName.trim() || !authUsername.trim()) {
        setError("Upiši ime i prezime te nadimak.");
        return;
      }
      if (authPassword !== authPasswordConfirm) {
        setError("Lozinke se ne podudaraju.");
        return;
      }
    }

    setAuthLoading(true);
    const result = authMode === "register"
      ? await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
            data: { full_name: authName.trim(), username: authUsername.trim() },
          },
        })
      : await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
    setAuthLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (authMode === "register" && !result.data.session) {
      setAuthOpen(false);
      setError("Račun je napravljen. Provjeri e-mail i potvrdi adresu prije prve prijave.");
      return;
    }

    setAuthOpen(false);
    setError("");
  };

  const signInWithProvider = async (provider) => {
    setError("");
    if (!authRulesAccepted) {
      setError("Za nastavak moraš prihvatiti Pravilnik o igranju kvizova.");
      return;
    }
    if (!supabase) {
      setError("Supabase nije konfiguriran.");
      return;
    }
    setAuthLoading(true);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getAuthRedirectUrl() },
    });
    setAuthLoading(false);
    if (authError) setError(authError.message);
  };

  const resetPassword = async () => {
    setError("");
    if (!supabase || !authEmail.trim()) {
      setError("Upiši e-mail adresu za obnovu lozinke.");
      return;
    }
    setAuthLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
      redirectTo: getAuthRedirectUrl(),
    });
    setAuthLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setError("Poslan je e-mail za obnovu lozinke.");
  };

  const signOut = async () => {
    setError("");
    setAuthOpen(false);
    setNicknameOpen(false);
    setUser(null);
    setProfile(null);
    setAccountResults([]);
    setAccountStatsResults([]);
    setAccountResultCount(0);
    setAccountPage(1);
    setPlayerProgress([]);
    setScreen("home");
    setRound([]);
    setResult(null);
    setAttemptId(null);
    setActiveQuizType(null);
    setActiveCategory(null);
    setCity(null);

    const { error: signOutError } = await supabase?.auth.signOut() ?? {};
    if (signOutError) {
      setError(signOutError.message || "Odjava nije uspjela.");
    }
  };

  const openAccount = async () => {
    if (!user) {
      signIn();
      return;
    }
    setError("");
    setScreen("account");
    setAccountPage(1);
    setLoadingAccount(true);
    try {
      const [pageResult, statsResult, progressResult] = await Promise.all([
        getMyResults(1, accountPageSize),
        getMyResultStats(),
        getMyProgress(),
      ]);
      setAccountResults(pageResult.data);
      setAccountResultCount(pageResult.count);
      setAccountStatsResults(statsResult);
      setPlayerProgress(progressResult);
    } catch (e) {
      setError(e.message || "Podaci računa trenutno se ne mogu učitati.");
      setAccountResults([]);
      setAccountStatsResults([]);
      setAccountResultCount(0);
    } finally {
      setLoadingAccount(false);
    }
  };

  const openAdmin = async () => {
    if (!user || profile?.role !== "admin") {
      setError("Administracija je dostupna samo administratoru.");
      return;
    }
    setError("");
    setScreen("admin");
    setLoadingAdmin(true);
    try {
      const [stats, users, results] = await Promise.all([
        getAdminDashboardStats(),
        getAdminUsers(),
        getAdminQuizResults(),
      ]);
      setAdminStats(stats);
      setAdminUsers(users);
      setAdminResults(results);
    } catch (e) {
      setError(e.message || "Administracija se trenutno ne može učitati.");
    } finally {
      setLoadingAdmin(false);
    }
  };

  const removeAdminResult = async (resultId) => {
    if (!user || profile?.role !== "admin") return;
    if (!window.confirm("Obrisati ovaj rezultat?")) return;
    try {
      await deleteAdminQuizResult(resultId);
      setAdminResults((rows) => rows.filter((row) => row.id !== resultId));
      const stats = await getAdminDashboardStats();
      setAdminStats(stats);
    } catch (e) {
      setError(e.message || "Rezultat se ne može obrisati.");
    }
  };

  const loadAccountPage = async (page) => {
    if (!user) return;
    const totalPages = Math.max(1, Math.ceil(accountResultCount / accountPageSize));
    const nextPage = Math.min(Math.max(1, page), totalPages);
    setLoadingAccount(true);
    try {
      const pageResult = await getMyResults(nextPage, accountPageSize);
      setAccountResults(pageResult.data);
      setAccountResultCount(pageResult.count);
      setAccountPage(nextPage);
    } catch (e) {
      setError(e.message || "Rezultati se trenutno ne mogu učitati.");
    } finally {
      setLoadingAccount(false);
    }
  };

  const openCities = async () => {
    if (!user) {
      requireAuth(openCities);
      return;
    }
    setError("");
    setScreen("cities");
    if (cities.length) return;
    setLoadingCities(true);
    try {
      setCities(await fetchCities());
    } catch (e) {
      setError(e.message || "Gradovi se trenutno ne mogu učitati.");
    } finally {
      setLoadingCities(false);
    }
  };

  const openDaily = async () => {
    if (!user) {
      requireAuth(openDaily);
      return;
    }
    setError("");
    setScreen("daily");
    setLoadingDaily(true);
    try {
      setDailyPlayed(await hasPlayedDailyQuiz(user.id));
    } catch (e) {
      setError(e.message || "Dnevni kviz trenutno nije moguće provjeriti.");
    } finally {
      setLoadingDaily(false);
    }
  };

  const startDaily = async () => {
    if (!user) {
      requireAuth(startDaily);
      return;
    }
    setError("");
    setLoadingQuiz(true);
    try {
      const alreadyPlayed = await hasPlayedDailyQuiz(user.id);
      setDailyPlayed(alreadyPlayed);
      if (alreadyPlayed) {
        setScreen("daily");
        throw new Error("Današnji Dnevni kviz već je odigran. Novi kviz bit će dostupan sutra.");
      }
      const attempt = await startQuizAttempt({ quizType: "daily" });
      setCity(null);
      setActiveQuizType("daily");
      setActiveCategory(null);
      setAttemptId(attempt.attemptId);
      setRound(attempt.questions);
      setResult(null);
      setScreen("quiz");
    } catch (e) {
      setError(e.message || "Dnevni kviz trenutno nije moguće pokrenuti.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const loadCommunityNotifications = async () => { if (!user) return; try { setCommunityNotifications(await getCommunityNotifications()); } catch (e) { setError(e.message || "Obavijesti se trenutno ne mogu učitati."); } };

  const openCommunity = async () => {
    if (!user) {
      requireAuth(openCommunity);
      return;
    }
    setError("");
    setScreen("community");
    setCommunityLoading(true);
    setCommunityPage(1);
    setCommunityHasMore(false);
    try {
      const [commentsPage, members, notifications] = await Promise.all([getCommunityComments(1, 20), getCommunityMembers(), getCommunityNotifications()]);
      setCommunityComments(commentsPage.data);
      setCommunityPage(1);
      setCommunityHasMore(commentsPage.hasMore);
      setCommunityMembers(members);
      setCommunityNotifications(notifications);
    } catch (e) {
      setError(e.message || "Zajednica se trenutno ne može učitati.");
    } finally {
      setCommunityLoading(false);
    }
  };

  const loadMoreCommunityComments = async () => {
    if (!user || communityLoadingMore || !communityHasMore) return;
    const nextPage = communityPage + 1;
    setCommunityLoadingMore(true);
    try {
      const commentsPage = await getCommunityComments(nextPage, 20);
      setCommunityComments((current) => [...current, ...commentsPage.data]);
      setCommunityPage(nextPage);
      setCommunityHasMore(commentsPage.hasMore);
    } catch (e) {
      setError(e.message || "Još komentara se trenutno ne može učitati.");
    } finally {
      setCommunityLoadingMore(false);
    }
  };

  const refreshCommunity = async () => {
    try {
      const commentsPage = await getCommunityComments(1, 20);
      setCommunityComments(commentsPage.data);
      setCommunityPage(1);
      setCommunityHasMore(commentsPage.hasMore);
    } catch (e) {
      setError(e.message || "Komentari se trenutno ne mogu učitati.");
    }
  };

  const selectCommunityMention = (member) => {
    const token = communityMentionQuery ? "@" + communityMentionQuery : "@";
    const value = communityText;
    const index = value.lastIndexOf(token);
    const prefix = index >= 0 ? value.slice(0, index) : value;
    const next = prefix + "@" + member.display_name + " ";
    setCommunityText(next);
    setCommunityMentionQuery("");
    setCommunityMentionOpen(false);
  };

  const handleCommunityTextChange = (value) => {
    setCommunityText(value.slice(0, 1000));
    const match = value.match(/(?:^|\s)@([^\s@]{0,24})$/);
    if (match) {
      setCommunityMentionQuery(match[1]);
      setCommunityMentionOpen(true);
    } else {
      setCommunityMentionQuery("");
      setCommunityMentionOpen(false);
    }
  };

  const submitCommunityComment = async () => {
    if (!user) {
      requireAuth(openCommunity);
      return;
    }
    const clean = communityText.trim();
    if (!clean) {
      setError("Napiši komentar prije slanja.");
      return;
    }
    setCommunitySending(true);
    setError("");
    try {
      const created = await createCommunityComment({ content: clean, parentId: communityReplyTo?.id || null });
      for (const member of communityMembers) {
        const name = String(member.display_name || "").trim();
        if (!name || member.id === user.id) continue;
        const escaped = name.replace(/[.*+?^\${}()|[\]\\]/g, "\\$&");
        if (new RegExp("(^|\\s)@" + escaped + "(?=\\s|$|[,.!?])", "i").test(clean)) {
          await createCommunityNotification({ userId: member.id, commentId: created.id, type: "mention" });
        }
      }
      if (communityReplyTo?.user_id && communityReplyTo.user_id !== user.id) {
        await createCommunityNotification({ userId: communityReplyTo.user_id, commentId: created.id, type: "reply" });
      }
      setCommunityText("");
      setCommunityReplyTo(null);
      setCommunityMentionQuery("");
      setCommunityMentionOpen(false);
      await refreshCommunity();
    } catch (e) {
      setError(e.message || "Komentar nije poslan.");
    } finally {
      setCommunitySending(false);
    }
  };

  const removeCommunityComment = async (commentId) => {
    if (!user) return;
    try {
      await deleteCommunityComment(commentId);
      await refreshCommunity();
    } catch (e) {
      setError(e.message || "Komentar nije moguće obrisati.");
    }
  };

  const openCommunityNotification = async (notification) => { await markCommunityNotificationRead(notification.id); setCommunityNotifications((items) => items.filter((item) => item.id !== notification.id)); setCommunityNotificationsOpen(false); setScreen("community"); await refreshCommunity(); window.setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0); };

  const formatCommunityTime = (value) => {
    const date = new Date(value);
    return date.toLocaleString("hr-HR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!supabase || !user) return undefined;
    const channel = supabase.channel("patriasoul-community-live").on("postgres_changes", { event: "*", schema: "public", table: "community_comments" }, () => { if (screen === "community") refreshCommunity(); }).on("postgres_changes", { event: "INSERT", schema: "public", table: "community_notifications", filter: "user_id=eq." + user.id }, () => { loadCommunityNotifications(); }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, screen]);

  const openLeaderboard = async (type = null) => {
    setError("");
    setScreen("leaderboard");
    setLeaderboardType(type);
    setLoadingLeaderboard(true);
    try {
      setLeaderboard(await getLeaderboard(type, 50));
    } catch (e) {
      setError(e.message || "Rang-lista se trenutno ne može učitati.");
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const startCity = async (selectedCity) => {
    if (!user) {
      requireAuth(() => startCity(selectedCity));
      return;
    }
    setError("");
    setLoadingQuiz(true);
    try {
      const attempt = await startQuizAttempt({ quizType: "city", citySlug: selectedCity.slug });
      setCity(selectedCity);
      setActiveQuizType("city");
      setActiveCategory(null);
      setAttemptId(attempt.attemptId);
      setRound(attempt.questions);
      setResult(null);
      setScreen("quiz");
    } catch (e) {
      setError(e.message || "Pitanja se trenutno ne mogu učitati.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const startMainCategory = async (category, authenticatedUser = null) => {
    let currentUser = authenticatedUser || user;

    // Auth stanje se održava centralno u listeneru iznad.
    // Ako korisnik nije prijavljen, odmah otvori prijavu bez dodatnog
    // mrežnog poziva koji bi mogao blokirati otvaranje modala.
    if (!currentUser) {
      const pending = { type: "category", category };
      pendingCategoryRef.current = pending;
      try {
        localStorage.setItem(pendingCategoryStorageKey, JSON.stringify(pending));
      } catch {}
      setAuthMode("login");
      setAuthRulesAccepted(false);
      setAuthName("");
      setAuthUsername("");
      setAuthEmail("");
      setAuthPassword("");
      setAuthPasswordConfirm("");
      setError("");
      setAuthOpen(true);
      return;
    }
    setError("");
    setLoadingQuiz(true);
    try {
      const attempt = await startQuizAttempt({ quizType: "croatian", category: category[0] });
      const questions = Array.isArray(attempt?.questions) ? attempt.questions : [];

      if (!attempt?.attemptId || questions.length !== 10) {
        throw new Error("Kviz je pokrenut, ali 10 pitanja se nije moglo učitati. Pokušaj ponovno.");
      }

      setCity(null);
      setActiveQuizType("croatian");
      setActiveCategory(category[0]);
      setAttemptId(attempt.attemptId);
      setRound(questions);
      setResult(null);
      setError("");
      setScreen("quiz");
    } catch (e) {
      setError(e.message || "Pitanja se trenutno ne mogu učitati.");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const openCroatianQuiz = () => {
    setScreen("home");
    window.history.replaceState({}, "", window.location.pathname + "#kategorije");
    setError("");
    setRound([]);
    setResult(null);
    setActiveQuizType(null);
    setActiveCategory(null);
    setAttemptId(null);
    setCity(null);
    window.setTimeout(() => {
      document.getElementById("kategorije")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleDeepLink = (mode) => {
    if (mode === "croatian") {
      openCroatianQuiz();
      return;
    }
    if (mode === "city" || mode === "cities") {
      openCities();
      return;
    }
    if (mode === "daily") {
      openDaily();
      return;
    }
    if (mode === "leaderboard") {
      openLeaderboard();
      return;
    }
    if (mode === "account") {
      openAccount();
    }
  };

  const home = () => {
    setScreen("home");
    setRound([]);
    setResult(null);
    setError("");
    setActiveQuizType(null);
    setActiveCategory(null);
    setAttemptId(null);
    setCity(null);
  };

  const completeQuiz = async () => {
    if (!user || !attemptId) {
      setResult({ score: 0, total: round.length, timeSeconds: 0, saving: false, saveError: "Pokušaj kviza nije pronađen." });
      setScreen("result");
      return;
    }
    setResult({ score: 0, total: 10, timeSeconds: 0, saving: true });
    setScreen("result");
    try {
      const saved = await finishQuizAttempt(attemptId);
      setResult({ ...saved, saving: false, saved: true });
    } catch (e) {
      setResult((current) => ({ ...current, saving: false, saveError: e.message }));
    }
  };

  const restartQuiz = () => {
    if (activeQuizType === "daily") {
      setScreen("daily");
      return;
    }
    if (activeQuizType === "city" && city) {
      startCity(city);
      return;
    }
    const selected = categories.find(([id]) => id === activeCategory);
    if (selected) startMainCategory(selected);
  };

  useEffect(() => {
    if (screen === "quiz") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [screen]);

  useEffect(() => {
    const mode = new URLSearchParams(window.location.search).get("mode");
    if (!mode || !["croatian", "city", "cities", "daily", "leaderboard", "account"].includes(mode)) return;

    window.history.replaceState({}, "", window.location.pathname + window.location.hash);

    if (mode === "croatian") {
      handleDeepLink(mode);
      return;
    }

    supabase?.auth.getUser().then(({ data }) => {
      if (data?.user) {
        handleDeepLink(mode);
        return;
      }
      setPendingDeepLink(mode);
      signIn();
    });
  }, []);

  useEffect(() => {
    const scrollToCategories = () => {
      if (window.location.hash !== "#kategorije") return;
      window.setTimeout(() => {
        document.getElementById("kategorije")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    };
    scrollToCategories();
    window.addEventListener("hashchange", scrollToCategories);
    return () => window.removeEventListener("hashchange", scrollToCategories);
  }, [screen]);

  useEffect(() => {
    if (!user) return;

    let pending = pendingCategoryRef.current;
    if (!pending?.category) {
      try {
        const stored = localStorage.getItem(pendingCategoryStorageKey);
        if (stored) pending = JSON.parse(stored);
      } catch {}
    }

    if (pending?.type === "category" && Array.isArray(pending.category)) {
      // Ako je ovo prvi ulazak i profil još nema nadimak, prvo tražimo nadimak.
      // Kviz se ne smije pokrenuti ispod modalnog prozora za nadimak.
      if (nicknameOpen) return;

      pendingCategoryRef.current = null;
      try { localStorage.removeItem(pendingCategoryStorageKey); } catch {}
      window.setTimeout(() => startMainCategory(pending.category, user), 0);
      return;
    }

    if (pendingDeepLink) {
      const mode = pendingDeepLink;
      setPendingDeepLink(null);
      handleDeepLink(mode);
    }
  }, [user, profile, nicknameOpen, pendingDeepLink]);

  const activeCategoryTitle = categories.find(([id]) => id === activeCategory)?.[1] ?? "Hrvatski kviz";
  const quizTitle = activeQuizType === "city"
    ? `Brani svoj grad: ${city?.name ?? ""}`
    : activeQuizType === "daily"
      ? "Dnevni kviz"
      : activeCategoryTitle;
  const quizSubtitle = activeQuizType === "city"
    ? "75 pitanja u bazi · 10 pitanja po rundi"
    : activeQuizType === "daily"
      ? `10 pomiješanih pitanja · ${getDailyQuizKey()}`
      : `${mainCount.toLocaleString("hr-HR")} pitanja u glavnoj bazi · 10 pitanja po rundi`;

  return <div className="min-h-screen text-foreground">
    <div className="patria-stripe" />
    <header className="patria-header text-primary-foreground">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <button onClick={home} className="patria-logo-button flex shrink-0 items-center text-left" aria-label="PatriaSoul početna">
          <span className="patria-brand-mark flex items-center">
            <img src="https://raw.githubusercontent.com/cn-dom/cuvari-nasljeda/main/public/assets/images/1000000982.png" alt="PatriaSoul" className="patria-main-logo object-contain" />
          </span>
        </button>

        <nav className="patria-nav-desktop ml-auto flex items-center gap-1">
          <button onClick={home} className="patria-nav-link">⌂ Početna</button>
          <button onClick={openCroatianQuiz} className="patria-nav-link"><BookOpen className="h-4 w-4" /> Hrvatski kviz</button>
          <button onClick={openCities} className="patria-nav-link"><MapPin className="h-4 w-4" /> Brani svoj grad</button>
          <button onClick={openDaily} className="patria-nav-link">📅 Dnevni kviz</button>
          <button onClick={() => openLeaderboard()} className="patria-nav-link"><Medal className="h-4 w-4" /> Rang-lista</button>
          {user && <button onClick={openCommunity} className="patria-nav-link"><MessageCircle className="h-4 w-4" /> Zajednica</button>}
          {user && <button onClick={() => { setCommunityNotificationsOpen((v) => !v); loadCommunityNotifications(); }} className="patria-nav-link relative"><span className="relative"><AtSign className="h-4 w-4" />{communityNotifications.length > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">{communityNotifications.length > 9 ? "9+" : communityNotifications.length}</span>}</span> Obavijesti</button>}
          {user ? <button onClick={openAccount} className="patria-nav-link"><UserRound className="h-4 w-4" /> {accountDisplayName}</button> : <button onClick={signIn} className="patria-nav-link"><LogIn className="h-4 w-4" /> Prijava</button>}
        </nav>

        <details className="patria-mobile-menu">
        <summary className="patria-mobile-menu-button" aria-label="Otvori izbornik"><span aria-hidden="true">☰</span><span className="sr-only">Izbornik</span></summary>
        <nav id="patria-mobile-nav" className="patria-mobile-nav">
          <button onClick={home} className="patria-mobile-nav-link">⌂ <span>Početna</span></button>
          <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openCroatianQuiz(); }} className="patria-mobile-nav-link"><BookOpen className="h-5 w-5" /><span>Hrvatski kviz</span></button>
          <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openCities(); }} className="patria-mobile-nav-link"><MapPin className="h-5 w-5" /><span>Brani svoj grad</span></button>
          <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openDaily(); }} className="patria-mobile-nav-link">📅 <span>Dnevni kviz</span></button>
          <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openLeaderboard(); }} className="patria-mobile-nav-link"><Medal className="h-5 w-5" /><span>Rang-lista</span></button>
          {user && <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openCommunity(); }} className="patria-mobile-nav-link"><MessageCircle className="h-5 w-5" /><span>Zajednica</span></button>}
          {user ? <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); openAccount(); }} className="patria-mobile-nav-link"><UserRound className="h-5 w-5" /><span>{accountDisplayName}</span></button> : <button onClick={(event) => { event.currentTarget.closest("details")?.removeAttribute("open"); signIn(); }} className="patria-mobile-nav-link"><LogIn className="h-5 w-5" /><span>Prijava</span></button>}
        </nav>
      </details>
      </div>
    </header>

    <div className="patria-portal-bar"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6"><div className="patria-quiz-title" aria-label="PatriaSoul Kviz - Hrvatska, povijest, znanje, identitet"><span className="patria-quiz-name">PatriaSoul Kviz</span><span className="patria-quiz-separator">-</span><span className="patria-quiz-tagline">Hrvatska · povijest · znanje · identitet</span></div><a href="https://cn-dom.github.io/ps/" className="patria-portal-button" aria-label="Povratak na PatriaSoul portal"><ArrowLeft className="h-5 w-5" /> Povratak na PatriaSoul portal</a></div></div>
    {!isStandalone && <div className="patria-install-bar"><div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6"><div className="flex min-w-0 items-center gap-3"><img src="https://raw.githubusercontent.com/cn-dom/cuvari-nasljeda/main/public/assets/images/1000000982.png" alt="" className="patria-install-logo" /><div className="min-w-0"><p className="truncate text-sm font-bold text-white">Instaliraj PatriaSoul</p><p className="hidden text-xs text-white/55 sm:block">Pokreni kviz kao aplikaciju na računalu ili telefonu.</p></div></div><button onClick={installPatriaSoul} className="patria-install-button" aria-label="Instaliraj PatriaSoul">Instaliraj</button></div></div>}
    {installHelp && !isStandalone && <div className="mx-auto max-w-[1400px] px-4 pt-3 sm:px-6"><div className="patria-install-help"><strong>Instalacija nije dostupna automatski u ovom pregledniku.</strong> Na računalu potraži opciju <b>Instaliraj PatriaSoul</b> u izborniku preglednika. Na iPhoneu/iPadu odaberi <b>Dijeli → Dodaj na početni zaslon</b>.</div></div>}
    {authOpen && <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 px-4 py-4 sm:items-center sm:py-8" onClick={() => user && !authLoading && setAuthOpen(false)}>
      <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl sm:max-h-[calc(100vh-4rem)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">PatriaSoul račun</p>
          <h2 className="mt-2 font-display text-3xl font-bold">{authMode === "login" ? "Prijava" : "Registracija"}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {authMode === "login" ? "Prijavi se i nastavi igrati PatriaSoul." : "Izradi svoj PatriaSoul račun."}
          </p>
        </div>

        <div className="grid gap-2">
          <button disabled={authLoading} onClick={() => signInWithProvider("google")} className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-background px-4 py-3 font-semibold transition hover:bg-secondary disabled:opacity-60">
            <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.35 12.23c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"/><path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.5Z"/><path fill="#FBBC05" d="M6.54 13.59A5.85 5.85 0 0 1 6.24 12c0-.55.1-1.09.3-1.59V7.88H3.3A9.74 9.74 0 0 0 2.25 12c0 1.57.38 3.06 1.05 4.12l3.24-2.53Z"/><path fill="#EA4335" d="M12 6.38c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.84 3.35 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.38l3.24 2.53C7.31 8.1 9.46 6.38 12 6.38Z"/></svg>
            </span>
            Nastavi s Googleom
          </button>

        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" /> ili <span className="h-px flex-1 bg-border" /></div>

        {authMode === "register" && <>
          <label className="block text-sm font-semibold">
            Ime i prezime
            <input value={authName} onChange={(e) => setAuthName(e.target.value)} type="text" autoComplete="name" placeholder="Ime i prezime" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent" />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Nadimak za kviz
            <input value={authUsername} onChange={(e) => setAuthUsername(e.target.value)} type="text" autoComplete="username" placeholder="npr. Hrvat_1991" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent" />
          </label>
        </>}

        <label className="mt-4 block text-sm font-semibold">
          E-mail adresa
          <input value={authEmail} onChange={(e) => setAuthEmail(e.target.value)} type="email" autoComplete="email" placeholder="tvoj@email.com" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent" />
        </label>

        <label className="mt-4 block text-sm font-semibold">
          Lozinka
          <input value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} placeholder="Najmanje 6 znakova" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent" />
        </label>

        {authMode === "register" && <label className="mt-4 block text-sm font-semibold">
          Potvrda lozinke
          <input value={authPasswordConfirm} onChange={(e) => setAuthPasswordConfirm(e.target.value)} type="password" autoComplete="new-password" placeholder="Ponovi lozinku" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:ring-2 focus:ring-accent" />
        </label>}

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4">
          <input type="checkbox" checked={authRulesAccepted} onChange={(e) => setAuthRulesAccepted(e.target.checked)} className="mt-1 h-4 w-4 accent-red-700" />
          <span className="text-sm leading-6">Prihvaćam <button type="button" onClick={() => setScreen("rules")} className="font-semibold text-accent underline">Pravilnik o igranju</button>, <a href="./terms.html" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">Uvjeti korištenja</a> i <a href="./privacy.html" target="_blank" rel="noreferrer" className="font-semibold text-accent underline">Politiku privatnosti</a>.</span>
        </label>

        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}

        <button disabled={authLoading} onClick={submitAuth} className="patria-button-accent mt-5 w-full">
          {authLoading ? "Obrađujem..." : authMode === "login" ? "Prijavi se" : "Registriraj se"}
        </button>

        {authMode === "login" && <button disabled={authLoading} onClick={resetPassword} className="mt-3 w-full text-center text-sm font-semibold text-accent hover:underline">Zaboravili ste lozinku?</button>}

        <div className="mt-5 text-center text-sm text-muted-foreground">
          {authMode === "login" ? "Nemate račun?" : "Već imate račun?"}{" "}
          <button type="button" onClick={() => { setError(""); setAuthMode(authMode === "login" ? "register" : "login"); }} className="font-semibold text-accent hover:underline">
            {authMode === "login" ? "Registrirajte se" : "Prijavite se"}
          </button>
        </div>
      </div>
    </div>}

    {nicknameOpen && user && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">PatriaSoul igrač</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Odaberi svoj nadimak</h2>
        <p className="mt-2 text-sm text-muted-foreground">E-mail ostaje samo za prijavu. Na kvizu i rang-listi prikazivat ćemo samo tvoj nadimak.</p>
        <label className="mt-5 block text-sm font-semibold">
          Nadimak
          <input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={24} autoFocus placeholder="npr. Hrvat_1991" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-3 outline-none focus:ring-2 focus:ring-accent" />
        </label>
        <p className="mt-2 text-xs text-muted-foreground">3–24 znaka. Nadimak mora biti jedinstven.</p>
        {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
        <button disabled={savingNickname} onClick={submitNickname} className="patria-button-accent mt-5 w-full">
          {savingNickname ? "Spremam..." : "Spremi nadimak"}
        </button>
      </div>
    </div>}

    {screen === "rules" && <Pravilnik onBack={() => setScreen("home")} />}

    {screen === "home" && <main>
      <section className="patria-hero"><div className="patria-hero-content mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24"><div className="max-w-4xl">
        <div className="patria-kicker mb-5"><Flag className="h-4 w-4" /> Znanje · ponos · nasljeđe</div>
        <h1 className="font-display text-5xl font-bold leading-tight sm:text-6xl">Hrvatski kviz</h1>
        <p className="mt-6 max-w-3xl text-lg text-white/80">Provjeri svoje znanje o Hrvatskoj — od povijesti i Domovinskog rata do geografije, prirode, baštine, glagoljice, vjere, sporta i znanosti.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="#kategorije" className="patria-button-accent"><BookOpen className="mr-2 h-4 w-4" /> Testiraj svoje znanje</a>
          <button onClick={openCities} className="patria-button"><MapPin className="mr-2 h-4 w-4" /> Brani svoj grad</button>
          <button onClick={() => openLeaderboard()} className="patria-button"><Medal className="mr-2 h-4 w-4" /> Rang-lista</button>
        </div>
        <div className="mt-7 flex flex-wrap gap-2 text-sm text-white/70">
          <span className="rounded-full border border-white/15 bg-black/20 px-3 py-1.5">{loadingMainCount ? "Učitavam bazu…" : `${mainCount.toLocaleString("hr-HR")} pitanja`}</span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5">10 kategorija</span>
          <span className="rounded-full border border-border bg-card px-3 py-1.5">10 pitanja po rundi</span>
        </div>
        {user && <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm"><UserRound className="h-4 w-4 text-accent" /> <strong>{accountDisplayName}</strong><span className="text-muted-foreground">je prijavljen</span></div>}
      </div></div></section>

      <section id="igre" className="patria-section-dark border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[.22em] text-[#f1d078]">PatriaSoul · Igre</p>
            <h2 className="mt-3 text-3xl text-white sm:text-4xl">Odaberi svoju igru.</h2>
            <p className="mt-4 text-base leading-8 text-white/65">Svaka igra ima svoj karakter. Možeš istraživati široko znanje o Hrvatskoj, braniti svoj grad ili svaki dan prihvatiti novi izazov.</p>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            <a href="?mode=croatian#kategorije" className="patria-game-card group">
              <div className="patria-game-number">01</div><div className="patria-icon-ring"><BookOpen className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#f1d078]">Glavna igra</p>
              <h3 className="mt-2 text-2xl text-white">Hrvatski kviz</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">Deset područja znanja i velika baza pitanja. Odaberi temu i kreni u novu rundu.</p>
              <span className="mt-6 inline-flex items-center font-semibold text-white">Igraj Hrvatski kviz <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
            <a href="?mode=city" className="patria-game-card group">
              <div className="patria-game-number">02</div><div className="patria-icon-ring"><MapPin className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#f1d078]">Grad po grad</p>
              <h3 className="mt-2 text-2xl text-white">Brani svoj grad</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">Odaberi grad i pokaži koliko poznaješ njegovu povijest, ljude, mjesta i posebnosti.</p>
              <span className="mt-6 inline-flex items-center font-semibold text-white">Odaberi grad <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
            <a href="?mode=daily" className="patria-game-card group">
              <div className="patria-game-number">03</div><div className="patria-icon-ring"><Trophy className="h-5 w-5" /></div>
              <p className="mt-5 text-xs font-bold uppercase tracking-[.18em] text-[#f1d078]">Novi izazov svaki dan</p>
              <h3 className="mt-2 text-2xl text-white">Dnevni kviz</h3>
              <p className="mt-3 text-sm leading-7 text-white/60">Jedan službeni pokušaj dnevno. Isti dnevni skup pitanja za sve igrače.</p>
              <span className="mt-6 inline-flex items-center font-semibold text-white">Igraj danas <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </a>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <a href="?mode=leaderboard" className="patria-feature group"><Medal className="h-6 w-6 text-[#f1d078]" /><h3 className="mt-4 text-lg text-white">Rang-lista</h3><p className="mt-2 text-sm text-white/60">Prati rezultate i vidi kako stojiš među igračima.</p><span className="mt-4 inline-flex items-center text-sm font-semibold text-white">Otvori rang-listu <ArrowRight className="ml-2 h-4 w-4" /></span></a>
            <button onClick={openAccount} className="patria-feature text-left"><UserRound className="h-6 w-6 text-[#f1d078]" /><h3 className="mt-4 text-lg text-white">Moj račun</h3><p className="mt-2 text-sm text-white/60">Statistika, rezultati, napredak i značke na jednom mjestu.</p><span className="mt-4 inline-flex items-center text-sm font-semibold text-white">Otvori moj račun <ArrowRight className="ml-2 h-4 w-4" /></span></button>
          </div>
        </div>
      </section>

<section id="nasljede" className="patria-section-dark border-b border-white/10"><div className="mx-auto max-w-6xl px-4 py-12 sm:px-6"><div className="mb-7"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f1d078]">Zašto PatriaSoul?</p><h2 className="mt-2 text-3xl text-white sm:text-4xl">Testiraj. Čuvaj. Nauči. Prenesi.</h2></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><button onClick={() => document.getElementById("kategorije")?.scrollIntoView({ behavior: "smooth" })} className="patria-feature text-left"><span className="patria-icon-ring"><BookOpen className="h-5 w-5" /></span><h3 className="mt-4 text-lg text-white">TESTIRAJ SVOJE ZNANJE</h3><p className="mt-2 text-sm text-white/60">Provjeri koliko znaš o Hrvatskoj i njezinoj povijesti.</p></button><button onClick={() => document.getElementById("kategorije")?.scrollIntoView({ behavior: "smooth" })} className="patria-feature text-left"><span className="patria-icon-ring"><ShieldCheck className="h-5 w-5" /></span><h3 className="mt-4 text-lg text-white">ČUVAJ NASLJEĐE</h3><p className="mt-2 text-sm text-white/60">Upoznaj priče, mjesta, običaje i vrijednosti koje vrijedi sačuvati.</p></button><button onClick={() => startMainCategory(categories.find(([id]) => id === "povijest"))} className="patria-feature text-left"><span className="patria-icon-ring"><FileText className="h-5 w-5" /></span><h3 className="mt-4 text-lg text-white">NAUČI ŠTO JE I KAKO JE BILO</h3><p className="mt-2 text-sm text-white/60">Povijest nam pomaže razumjeti Hrvatsku danas.</p></button><button onClick={openCities} className="patria-feature text-left"><span className="patria-icon-ring"><MapPin className="h-5 w-5" /></span><h3 className="mt-4 text-lg text-white">BUDI DIO PRIČE</h3><p className="mt-2 text-sm text-white/60">Istražuj gradove, upoznaj Hrvatsku i ostavi svoj rezultat.</p></button></div></div></section>

      <section className="border-y border-border bg-background">
  <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
    <div className="grid gap-4 md:grid-cols-2">
      <article className="patria-feature">
        <span className="text-xs font-bold uppercase tracking-[.18em] text-accent">O PatriaSoul</span>
        <h2 className="mt-2 text-2xl text-white">Zašto postoji PatriaSoul?</h2>
        <p className="mt-3 text-sm leading-7 text-white/65">PatriaSoul je prostor za upoznavanje Hrvatske kroz povijest, znanje, baštinu, gradove i priče koje vrijedi sačuvati i prenijeti dalje.</p>
        <a href="./about.html" className="patria-button mt-5">Pročitaj više <ArrowRight className="ml-2 h-4 w-4" /></a>
      </article>
      <article className="patria-feature">
        <span className="text-xs font-bold uppercase tracking-[.18em] text-accent">Kontakt</span>
        <h2 className="mt-2 text-2xl text-white">Želiš nam se javiti?</h2>
        <p className="mt-3 text-sm leading-7 text-white/65">Za pitanja, prijedloge, prijavu pogreške ili poruku vezanu uz PatriaSoul pogledaj kontakt stranicu.</p>
        <a href="./contact.html" className="patria-button mt-5">Otvori kontakt <ArrowRight className="ml-2 h-4 w-4" /></a>
      </article>
    </div>
  </div>
</section>

<section id="kategorije" className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20"><p className="text-sm font-bold uppercase tracking-[.16em] text-accent">10 područja</p><h2 className="patria-accent-line mt-2 text-3xl">Odaberi kategoriju</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{categories.map(([id, title, desc], i) => <button key={id} disabled={loadingQuiz} onClick={() => startMainCategory([id, title, desc])} className="patria-card group p-5 text-left disabled:opacity-60"><div className="flex items-start justify-between gap-4"><span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-sm font-bold text-primary">{String(i + 1).padStart(2, "0")}</span><ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" /></div><h3 className="mt-5 text-xl">{title}</h3><p className="mt-2 text-sm text-muted-foreground">{desc}</p><p className="mt-4 text-xs font-semibold text-accent">Pokreni 10 pitanja →</p></button>)}</div>
        {error && <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        {loadingQuiz && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"><div className="rounded-xl bg-card px-6 py-5 shadow-xl"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam pitanja...</div></div></div>}
      </section>

      <section id="dnevni-kviz" className="border-y border-border bg-secondary/40">
  <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-bold uppercase tracking-[.16em] text-accent">Dnevni izazov</p>
        <h2 className="mt-2 text-3xl">10 pomiješanih pitanja svaki dan.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">Svi sudionici na isti dan dobivaju isti skup od 10 pitanja iz glavne baze. Jedan službeni pokušaj vrijedi za taj dan.</p>
      </div>
      <button onClick={openDaily} className="patria-button-accent shrink-0">Otvori Dnevni kviz</button>
    </div>
  </div>
</section>

<section className="border-b border-border bg-background">
  <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
    <div>
      <p className="text-sm font-bold uppercase tracking-[.16em] text-accent">PatriaSoul</p>
      <h2 className="mt-2 text-3xl">Tri načina igranja.</h2>
      <p className="mt-3 max-w-2xl text-muted-foreground">Hrvatski kviz, Brani svoj grad i Dnevni kviz odvojeni su sustavi s vlastitim pravilima i rezultatima.</p>
    </div>
    <ShieldCheck className="h-12 w-12 shrink-0 text-accent" />
  </div>
</section>

    </main>}

    {screen === "cities" && <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><div className="mb-8 flex items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-accent">Brani svoj grad</p><h1 className="mt-2 font-display text-4xl font-bold">Odaberi grad</h1><p className="mt-2 text-muted-foreground">Svaki grad ima vlastiti paket od 75 pitanja.</p></div><button onClick={home} className="patria-button"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag</button></div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loadingCities ? <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam gradove...</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cities.map((item) => <button key={item.id} disabled={loadingQuiz} onClick={() => startCity(item)} className="patria-card group p-4 text-left disabled:opacity-60"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-bold">{item.name}</h2><p className="mt-1 text-xs text-muted-foreground">{item.county || "Hrvatska"}</p></div><ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1" /></div></button>)}</div>}
      {loadingQuiz && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"><div className="rounded-xl bg-card px-6 py-5 shadow-xl"><div className="flex items-center gap-3"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam pitanja...</div></div></div>}
    </main>}

    {screen === "daily" && <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="patria-card overflow-hidden">
        <div className="bg-primary px-6 py-10 text-primary-foreground">
          <p className="text-sm font-bold uppercase tracking-[.16em] text-red-200">Dnevni kviz</p>
          <h1 className="mt-2 font-display text-4xl font-bold">Današnji izazov</h1>
          <p className="mt-3 text-white/75">{getDailyQuizKey()} · 10 pomiješanih pitanja</p>
        </div>
        <div className="p-8">
          {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
          {loadingDaily ? <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Provjeravam današnji pokušaj...</div> : dailyPlayed ? (
            <div className="text-center">
              <Trophy className="mx-auto h-10 w-10 text-accent" />
              <h2 className="mt-4 text-2xl font-bold">Današnji kviz je već odigran.</h2>
              <p className="mt-2 text-muted-foreground">Za svakog igrača vrijedi jedan službeni pokušaj dnevno. Novi skup pitanja bit će dostupan sutra.</p>
              <button onClick={() => openLeaderboard("daily")} className="patria-button-accent mt-6">Pogledaj rang-listu</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-lg font-semibold">Isti skup pitanja vrijedi za sve sudionike danas.</p>
              <p className="mt-2 text-muted-foreground">Pitanja su deterministički odabrana iz svih aktivnih pitanja glavnog kviza i pomiješana kroz glavne kategorije.</p>
              <button onClick={startDaily} className="patria-button-accent mt-6">Započni današnji kviz</button>
            </div>
          )}
          <button onClick={home} className="patria-button mt-4 w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag</button>
        </div>
      </div>
    </main>}

    {screen === "quiz" && <QuizPlayer questions={round} title={quizTitle} subtitle={quizSubtitle} timeLimit={20} attemptId={attemptId} onComplete={completeQuiz} onQuit={() => activeQuizType === "city" ? setScreen("cities") : activeQuizType === "daily" ? setScreen("daily") : setScreen("home")} />}

    {screen === "result" && result && <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20"><div className="patria-card overflow-hidden text-center"><div className="bg-primary px-6 py-10 text-primary-foreground"><Trophy className="mx-auto h-12 w-12 text-red-300" /><p className="mt-4 text-sm font-bold uppercase tracking-[.16em] text-red-200">Rezultat</p><h1 className="mt-2 font-display text-5xl font-bold">{result.score} / {result.total}</h1><p className="mt-2 opacity-75">Vrijeme: {result.timeSeconds} s</p></div><div className="p-8"><p className="text-lg font-semibold">{result.saved ? "Rezultat je spremljen." : user ? "Rezultat se obrađuje." : "Rezultat je prikazan."}</p><p className="mt-2 text-muted-foreground">{result.saveError || (user ? "Tvoj rezultat je povezan s tvojim profilom." : "Prijavi se kako bi se rezultat mogao spremiti u tvoj račun.")}</p><div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">{activeQuizType !== "daily" && <button onClick={restartQuiz} className="patria-button-accent"><RotateCcw className="mr-2 h-4 w-4" /> Igraj ponovno</button>}
          {activeQuizType === "daily" && <button onClick={() => setScreen("daily")} className="patria-button-accent">Dnevni kviz</button>}<button onClick={activeQuizType === "city" ? () => setScreen("cities") : home} className="patria-button">{activeQuizType === "city" ? "Odaberi drugi grad" : "Odaberi kategoriju"}</button><button onClick={() => openLeaderboard(activeQuizType)} className="patria-button">Rang-lista</button></div></div></div></main>}

    {screen === "account" && <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-accent">PatriaSoul račun</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Moj račun</h1>
          <p className="mt-2 text-muted-foreground">Tvoj PatriaSoul profil, statistika i spremljeni rezultati.</p>
        </div>
        <button onClick={home} className="patria-button self-start sm:self-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag</button>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <section className="patria-card overflow-hidden">
        <div className="relative bg-primary px-6 py-7 text-primary-foreground sm:px-8">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(135deg, transparent 0%, transparent 48%, rgba(255,255,255,.8) 49%, transparent 50%, transparent 100%)", backgroundSize: "34px 34px" }} />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-white/10 shadow-lg">
              {accountAvatar ? <img src={accountAvatar} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : <UserRound className="h-9 w-9 text-white/80" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[.16em] text-red-200">PatriaSoul igrač</p>
              <h2 className="mt-1 truncate text-2xl font-bold sm:text-3xl">{accountDisplayName}</h2>
              <p className="mt-1 truncate text-sm text-white/70">{user?.email || "Prijavljen korisnik"}</p>
              {accountUsername && <><p className="mt-2 text-sm text-white/80">Nadimak: @{accountUsername}</p><button onClick={() => { setNickname(accountUsername); setError(""); setNicknameOpen(true); }} className="mt-2 text-left text-xs font-semibold text-[#f1d078] hover:underline">Promijeni nadimak</button></>}
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-left sm:min-w-[150px]">
              <p className="text-xs uppercase tracking-wider text-white/60">Najbolji rezultat</p>
              <p className="mt-1 text-2xl font-bold text-white">{accountStats.best.toFixed(0)}%</p>
              <p className="text-xs text-white/55">iz cijele povijesti</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
          <div className="bg-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Odigrano</p><p className="mt-1 text-3xl font-bold">{accountStats.played}</p><p className="mt-1 text-xs text-muted-foreground">ukupno</p></div>
          <div className="bg-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Točnost</p><p className="mt-1 text-3xl font-bold">{accountStats.accuracy.toFixed(0)}%</p><p className="mt-1 text-xs text-muted-foreground">{accountStats.correct} / {accountStats.total} odgovora</p></div>
          <div className="bg-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Brani svoj grad</p><p className="mt-1 text-3xl font-bold">{accountStats.city}</p><p className="mt-1 text-xs text-muted-foreground">odigranih rundi</p></div>
          <div className="bg-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dnevni kviz</p><p className="mt-1 text-3xl font-bold">{accountStats.daily}</p><p className="mt-1 text-xs text-muted-foreground">odigranih dana</p></div>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.7fr]">
        <section className="space-y-6">
          <div className="patria-card overflow-hidden">
            <div className="relative bg-primary px-6 py-6 text-primary-foreground">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "linear-gradient(135deg, transparent 0%, transparent 48%, rgba(255,255,255,.8) 49%, transparent 50%, transparent 100%)", backgroundSize: "28px 28px" }} />
              <div className="relative flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#f1d078]/50 bg-[#f1d078]/10 text-2xl shadow-lg">🛡️</div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-red-200">Tvoja značka</p>
                  <h2 className="mt-1 text-xl font-bold text-white">{currentBadge[1]}</h2>
                  <p className="mt-1 text-sm text-white/70">PatriaSoul razina {playerLevel} · {totalPlayerXp} XP</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span>Napredak prema sljedećoj razini</span>
                <span className="text-accent">{playerLevel >= 100 ? "Maksimalna razina" : "${xpIntoLevel} / 100 XP"}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-accent transition-all" style={{ width: "${playerLevel >= 100 ? 100 : xpIntoLevel}%" }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{playerLevel >= 100 ? "Dosegnuo si najvišu PatriaSoul značku — Čuvar nasljeđa." : "Još ${xpToNextLevel} XP do razine ${playerLevel + 1}."}</p>
              <div className="mt-5 rounded-xl border border-border bg-secondary/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sljedeća značka</p>
                {nextBadge ? <><p className="mt-1 font-bold">{nextBadge[1]} · razina {nextBadge[0]}</p><p className="mt-1 text-sm text-muted-foreground">Još ${xpToNextBadge} XP do nove značke.</p></> : <><p className="mt-1 font-bold text-accent">🛡️ Čuvar nasljeđa</p><p className="mt-1 text-sm text-muted-foreground">Najviša PatriaSoul značka.</p></>}
              </div>
            </div>
          </div>

          <div className="patria-card p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary"><Trophy className="h-5 w-5" /></div>
              <div><h2 className="font-bold">Tvoj napredak</h2><p className="text-sm text-muted-foreground">Pregled načina na koje igraš.</p></div>
            </div>
            <div className="mt-5 space-y-4">
              <div><div className="mb-1 flex justify-between text-sm"><span>Hrvatski kviz</span><strong>{accountStats.croatian}</strong></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: "${Math.min(accountStats.croatian * 10, 100)}%" }} /></div></div>
              <div><div className="mb-1 flex justify-between text-sm"><span>Brani svoj grad</span><strong>{accountStats.city}</strong></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: "${Math.min(accountStats.city * 10, 100)}%" }} /></div></div>
              <div><div className="mb-1 flex justify-between text-sm"><span>Dnevni kviz</span><strong>{accountStats.daily}</strong></div><div className="h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-accent" style={{ width: "${Math.min(accountStats.daily * 10, 100)}%" }} /></div></div>
            </div>
          </div>          {profile?.role === "admin" && <div className="patria-card border-accent/40 bg-accent/5 p-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-accent" />
              <div><h2 className="font-bold">Administracija</h2><p className="text-sm text-muted-foreground">Samo za PatriaSoul administratora.</p></div>
            </div>
            <button onClick={openAdmin} className="patria-button-accent mt-4 w-full justify-center"><ShieldCheck className="mr-2 h-4 w-4" /> Otvori administraciju</button>
          </div>}

          <div className="patria-card p-6">
            <h2 className="font-bold">Brzi pristup</h2>
            <div className="mt-4 grid gap-2">
              <button onClick={openCroatianQuiz} className="patria-button w-full justify-center">Hrvatski kviz</button>
              <button onClick={openCities} className="patria-button w-full justify-center"><MapPin className="mr-2 h-4 w-4" /> Brani svoj grad</button>
              <button onClick={openDaily} className="patria-button w-full justify-center">📅 Dnevni kviz</button>
              <button onClick={() => openLeaderboard()} className="patria-button w-full justify-center"><Medal className="mr-2 h-4 w-4" /> Rang-lista</button>
            </div>
          </div>

          <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 font-semibold transition hover:bg-secondary"><LogOut className="h-4 w-4" /> Odjavi se</button>
        </section>

        <section className="patria-card overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-6 py-5">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="text-xl font-bold">Moji rezultati</h2><p className="mt-1 text-sm text-muted-foreground">Svi rezultati su spremljeni. Prikazano 20 po stranici · ukupno {accountResultCount}.</p></div>
              <Trophy className="hidden h-6 w-6 text-accent sm:block" />
            </div>
          </div>
          {loadingAccount ? <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam rezultate...</div> : accountResults.length === 0 ? (
            <div className="p-10 text-center"><Trophy className="mx-auto h-10 w-10 text-accent" /><h3 className="mt-4 text-xl font-bold">Još nema spremljenih rezultata</h3><p className="mt-2 text-sm text-muted-foreground">Odigraj prvi kviz i rezultat će se automatski pojaviti na tvom profilu.</p></div>
          ) : (
            <div className="divide-y divide-border">
              {accountResults.map((r) => {
                const typeLabel = r.quiz_type === "daily" ? "Dnevni kviz" : r.quiz_type === "city" ? `Brani svoj grad${r.city_slug ? `: ${r.city_slug}` : ""}` : r.category ? `Hrvatski kviz · ${r.category}` : "Hrvatski kviz";
                return <div key={r.id} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                  <div className="min-w-0"><p className="truncate font-semibold">{typeLabel}</p><p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("hr-HR")}{r.time_seconds != null ? ` · ${r.time_seconds}s` : ""}</p></div>
                  <div className="shrink-0 text-right"><p className="font-bold text-accent">{r.score} / {r.total}</p><p className="text-xs text-muted-foreground">{Number(r.percentage ?? ((r.score / Math.max(r.total, 1)) * 100)).toFixed(0)}%</p></div>
                </div>;
              })}
            </div>
          )}
          {accountResultCount > accountPageSize && !loadingAccount && (
            <div className="flex flex-col gap-3 border-t border-border bg-secondary/30 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-muted-foreground">
                Stranica {accountPage} od {Math.max(1, Math.ceil(accountResultCount / accountPageSize))}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadAccountPage(accountPage - 1)}
                  disabled={accountPage === 1}
                  className="patria-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" /> Prethodna
                </button>
                <button
                  onClick={() => loadAccountPage(accountPage + 1)}
                  disabled={accountPage >= Math.ceil(accountResultCount / accountPageSize)}
                  className="patria-button disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Sljedeća <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>}

    {screen === "admin" && <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-accent">PatriaSoul · Administrator</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Administracija</h1>
          <p className="mt-2 text-muted-foreground">Upravljanje korisnicima, rezultatima i osnovnom statistikom.</p>
        </div>
        <button onClick={openAccount} className="patria-button self-start sm:self-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na profil</button>
      </div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loadingAdmin ? <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam administraciju...</div> : <>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Korisnici", adminStats?.total_users ?? 0],
            ["Aktivni 30 dana", adminStats?.active_users_30d ?? 0],
            ["Rezultati", adminStats?.total_results ?? 0],
            ["Rezultati 30 dana", adminStats?.results_30d ?? 0],
            ["Ukupno XP", adminStats?.total_xp ?? 0],
          ].map(([label, value]) => <div key={label} className="patria-card p-5"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-bold">{Number(value).toLocaleString("hr-HR")}</p></div>)}
        </section>

        <section className="mt-6 patria-card overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-6 py-5"><h2 className="text-xl font-bold">Korisnici</h2><p className="mt-1 text-sm text-muted-foreground">{adminUsers.length} korisnika</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Nadimak</th><th className="px-5 py-3">E-mail</th><th className="px-5 py-3">Uloga</th><th className="px-5 py-3">Kvizovi</th><th className="px-5 py-3">XP</th><th className="px-5 py-3">Zadnji kviz</th></tr></thead><tbody className="divide-y divide-border">{adminUsers.map((row) => <tr key={row.id}><td className="px-5 py-3 font-semibold">{row.display_name || "Bez nadimka"}</td><td className="px-5 py-3 text-muted-foreground">{row.email}</td><td className="px-5 py-3"><span className="rounded-full bg-secondary px-2 py-1 text-xs font-bold">{row.role}</span></td><td className="px-5 py-3">{row.total_quizzes}</td><td className="px-5 py-3">{row.total_xp}</td><td className="px-5 py-3 text-muted-foreground">{row.last_quiz_at ? new Date(row.last_quiz_at).toLocaleString("hr-HR") : "—"}</td></tr>)}</tbody></table></div>
        </section>

        <section className="mt-6 patria-card overflow-hidden">
          <div className="border-b border-border bg-secondary/40 px-6 py-5"><h2 className="text-xl font-bold">Rezultati kvizova</h2><p className="mt-1 text-sm text-muted-foreground">{adminResults.length} rezultata</p></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-secondary/30 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-5 py-3">Igrač</th><th className="px-5 py-3">Kviz</th><th className="px-5 py-3">Rezultat</th><th className="px-5 py-3">Postotak</th><th className="px-5 py-3">Datum</th><th className="px-5 py-3"></th></tr></thead><tbody className="divide-y divide-border">{adminResults.map((row) => <tr key={row.id}><td className="px-5 py-3"><p className="font-semibold">{row.user_name || "Bez nadimka"}</p><p className="text-xs text-muted-foreground">{row.user_email}</p></td><td className="px-5 py-3">{row.quiz_type === "city" ? "Brani svoj grad" : row.quiz_type === "daily" ? "Dnevni kviz" : row.category || "Hrvatski kviz"}</td><td className="px-5 py-3 font-bold">{row.score} / {row.total}</td><td className="px-5 py-3">{Number(row.percentage).toFixed(0)}%</td><td className="px-5 py-3 text-muted-foreground">{new Date(row.created_at).toLocaleString("hr-HR")}</td><td className="px-5 py-3 text-right"><button onClick={() => removeAdminResult(row.id)} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50">Obriši</button></td></tr>)}</tbody></table></div>
        </section>
      </>}
    </main>}

    {communityNotificationsOpen && user && <div className="fixed right-4 top-20 z-[60] w-[min(390px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-accent/25 bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border bg-primary/80 px-4 py-3"><div><p className="text-sm font-bold">Obavijesti</p><p className="text-xs text-muted-foreground">{communityNotifications.length ? "Netko te je spomenuo ili ti odgovorio." : "Nema novih obavijesti."}</p></div><button type="button" onClick={() => setCommunityNotificationsOpen(false)} className="text-xs font-bold text-accent">Zatvori</button></div><div className="max-h-[60vh] overflow-y-auto">{communityNotifications.length === 0 ? <div className="p-6 text-center text-sm text-muted-foreground">Sve je pročitano. 👌</div> : communityNotifications.map((notification) => <button key={notification.id} type="button" onClick={() => openCommunityNotification(notification)} className="block w-full border-b border-border px-4 py-4 text-left hover:bg-white/5"><div className="flex items-start gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"><AtSign className="h-4 w-4" /></span><div><p className="text-sm"><strong>{notification.actor_name}</strong> {notification.type === "reply" ? "ti je odgovorio/la." : "te je spomenuo/la."}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.comment_text}</p></div></div></button>)}</div></div>}

    {screen === "community" && <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.16em] text-accent">PatriaSoul zajednica</p>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Zajednica</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Pozdravi druge igrače, podijeli rezultat ili odgovori na komentar. Nadimci ostaju dio PatriaSoul zajednice.</p>
        </div>
        <button onClick={home} className="patria-button self-start sm:self-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag</button>
      </div>

      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}

      <section className="patria-card mb-7 overflow-visible">
        <div className="border-b border-border bg-primary/70 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="patria-icon-ring"><MessageCircle className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-bold">Napiši nešto</h2>
              <p className="text-sm text-muted-foreground">Možeš odgovoriti i tako da nekoga označiš s @nadimak.</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          {communityReplyTo && <div className="mb-3 flex items-center justify-between rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-muted-foreground"><Reply className="h-4 w-4 text-accent" /> Odgovaraš korisniku <strong className="text-foreground">@{communityReplyTo.display_name}</strong></span>
            <button type="button" onClick={() => setCommunityReplyTo(null)} className="text-xs font-bold text-accent hover:text-white">Odustani</button>
          </div>}
          <div className="relative">
            <textarea
              value={communityText}
              onChange={(e) => handleCommunityTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setCommunityMentionOpen(false);
                if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                  e.preventDefault();
                  submitCommunityComment();
                }
              }}
              maxLength={1000}
              rows={4}
              placeholder={communityReplyTo ? `Odgovori @${communityReplyTo.display_name}...` : "Pozdravi ekipu, napiši kako ti je prošao kviz..."}
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            {communityMentionOpen && communityMembers.length > 0 && <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-xl border border-accent/30 bg-card shadow-2xl">
              <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Označi igrača</div>
              {communityMembers.filter((member) => member.display_name?.toLowerCase().includes(communityMentionQuery.toLowerCase())).slice(0, 6).map((member) => (
                <button key={member.id} type="button" onClick={() => selectCommunityMention(member)} className="flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-white/5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-xs font-bold text-accent">{member.display_name?.slice(0,1).toUpperCase()}</span>
                  <span className="font-semibold">{member.display_name}</span>
                </button>
              ))}
            </div>}
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted-foreground">{communityText.length}/1000 · Ctrl+Enter za slanje</span>
            <button disabled={communitySending || !communityText.trim()} onClick={submitCommunityComment} className="patria-button-accent disabled:cursor-not-allowed disabled:opacity-50">
              {communitySending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {communitySending ? "Šaljem..." : "Objavi komentar"}
            </button>
          </div>
        </div>
      </section>

      {communityLoading ? <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam zajednicu...</div> :
        communityComments.length === 0 ? <div className="patria-card p-10 text-center"><MessageCircle className="mx-auto h-10 w-10 text-accent" /><h2 className="mt-4 text-2xl font-bold">Budi prvi koji će nešto napisati</h2><p className="mt-2 text-muted-foreground">Pozdravi ostale igrače i pokreni prvi razgovor.</p></div> :
        <>
        <section className="space-y-3">
          {communityComments.filter((comment) => !comment.parent_id).map((comment) => {
            const replies = communityComments.filter((reply) => reply.parent_id === comment.id);
            const canDelete = user?.id === comment.user_id || profile?.role === "admin";
            return <article key={comment.id} className="patria-card p-5 sm:p-6">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent/10 font-bold text-accent">{comment.display_name?.slice(0,1).toUpperCase() || "P"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong>{comment.display_name || "PatriaSoul igrač"}</strong>
                    <span className="text-xs text-muted-foreground">{formatCommunityTime(comment.created_at)}</span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[.95rem] leading-7 text-foreground/90">{comment.content}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" onClick={() => { setCommunityReplyTo(comment); setCommunityText(""); setCommunityMentionQuery(""); setCommunityMentionOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-white"><Reply className="h-3.5 w-3.5" /> Odgovori</button>
                    {canDelete && <button type="button" onClick={() => removeCommunityComment(comment.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-red-300 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /> Obriši</button>}
                  </div>
                  {replies.length > 0 && <div className="mt-4 space-y-2 border-l-2 border-accent/25 pl-4">
                    {replies.map((reply) => {
                      const canDeleteReply = user?.id === reply.user_id || profile?.role === "admin";
                      return <div key={reply.id} className="rounded-lg border border-border bg-background/50 p-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{reply.display_name?.slice(0,1).toUpperCase() || "P"}</span>
                          <strong className="text-sm">{reply.display_name || "PatriaSoul igrač"}</strong>
                          <span className="text-xs text-muted-foreground">{formatCommunityTime(reply.created_at)}</span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground/85">{reply.content}</p>
                        <div className="mt-2 flex gap-3">
                          <button type="button" onClick={() => { setCommunityReplyTo(reply); setCommunityText(""); setCommunityMentionQuery(""); setCommunityMentionOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 text-xs font-bold text-accent hover:text-white"><Reply className="h-3.5 w-3.5" /> Odgovori</button>
                          {canDeleteReply && <button type="button" onClick={() => removeCommunityComment(reply.id)} className="inline-flex items-center gap-1 text-xs font-bold text-red-300 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" /> Obriši</button>}
                        </div>
                      </div>;
                    })}
                  </div>}
                </div>
              </div>
            </article>;
          })}
        </section>
        {communityHasMore && <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={loadMoreCommunityComments}
            disabled={communityLoadingMore}
            className="patria-button min-w-48 justify-center"
          >
            {communityLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {communityLoadingMore ? "Učitavam..." : "Učitaj još komentara"}
          </button>
        </div>}
        </>
      }
    </main>}

    {screen === "leaderboard" && <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16"><div className="mb-8 flex items-center justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.16em] text-accent">PatriaSoul</p><h1 className="mt-2 font-display text-4xl font-bold">Rang-lista</h1><p className="mt-2 text-muted-foreground">Rezultati igrača koji su svoje rezultate spremili u PatriaSoul.</p></div><button onClick={home} className="patria-button"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag</button></div>
      <div className="mb-6 flex flex-wrap gap-2"><button onClick={() => openLeaderboard(null)} className={leaderboardType === null ? "patria-button-accent" : "patria-button"}>Sve</button><button onClick={() => openLeaderboard("city")} className={leaderboardType === "city" ? "patria-button-accent" : "patria-button"}>Brani svoj grad</button><button onClick={() => openLeaderboard("croatian")} className={leaderboardType === "croatian" ? "patria-button-accent" : "patria-button"}>Hrvatski kviz</button><button onClick={() => openLeaderboard("daily")} className={leaderboardType === "daily" ? "patria-button-accent" : "patria-button"}>Dnevni kviz</button></div>
      {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
      {loadingLeaderboard ? <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> Učitavam rang-listu...</div> : leaderboard.length === 0 ? <div className="patria-card p-10 text-center"><Medal className="mx-auto h-10 w-10 text-accent" /><h2 className="mt-4 text-2xl font-bold">Još nema rezultata</h2><p className="mt-2 text-muted-foreground">Prvi spremljeni rezultati pojavit će se ovdje.</p></div> : <div className="overflow-hidden rounded-xl border border-border bg-card"><div className="grid grid-cols-[48px_1fr_90px_110px] gap-3 border-b border-border bg-secondary/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground"><span>#</span><span>Igrač</span><span>Najbolje</span><span>Odigrano</span></div>{leaderboard.map((player, index) => <div key={`${player.display_name}-${index}`} className="grid grid-cols-[48px_1fr_90px_110px] items-center gap-3 border-b border-border px-4 py-4 last:border-0"><span className="font-bold text-muted-foreground">{index + 1}</span><div><p className="font-semibold">{player.display_name}</p><p className="text-xs text-muted-foreground">Prosjek {Number(player.average_percentage).toFixed(1)}%</p></div><span className="font-bold text-accent">{Number(player.best_percentage).toFixed(0)}%</span><span className="text-sm">{player.quizzes_played}</span></div>)}</div>}
    </main>}

    <footer className="patria-footer">
      <div className="patria-footer-glow" aria-hidden="true" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr_1.45fr]">
          <div className="patria-footer-brand">
            <div className="patria-footer-logo-wrap">
              <img
                src="https://raw.githubusercontent.com/cn-dom/cuvari-nasljeda/main/public/assets/images/1000000982.png"
                alt="PatriaSoul"
                className="patria-footer-logo"
              />
            </div>
            <p className="mt-5 max-w-md text-sm leading-7 text-white/65">
              Hrvatska · povijest · znanje · identitet.
              <br />
              Prostor za učenje, igru i čuvanje priča koje čine naše nasljeđe.
            </p>
            <div className="patria-footer-motto">
              <span>Znanje</span>
              <span>·</span>
              <span>Ponos</span>
              <span>·</span>
              <span>Nasljeđe</span>
            </div>
          </div>

          <div>
            <p className="patria-footer-heading">PatriaSoul</p>
            <div className="mt-4 grid gap-2.5 text-sm">
              <button onClick={home} className="patria-footer-link">Početna</button>
              <a href="https://cn-dom.github.io/ps/" className="patria-footer-link">📰 PatriaSoul portal</a>
              <button onClick={openCroatianQuiz} className="patria-footer-link">🎯 Hrvatski kviz</button>
              <button onClick={openCities} className="patria-footer-link">Brani svoj grad</button>
              <button onClick={openDaily} className="patria-footer-link">Dnevni kviz</button>
              <button onClick={() => openLeaderboard()} className="patria-footer-link">Rang-lista</button>
              <button onClick={openAccount} className="patria-footer-link">{user ? "Moj račun" : "Prijava"}</button>
            </div>
          </div>

          <div>
            <p className="patria-footer-heading">Prati nas</p>

            <div className="patria-social-card">
              <div className="patria-social-copy">
                <span className="patria-social-label">PatriaSoul</span>
                <p>Prati PatriaSoul na TikToku i budi uz nas dok kroz kratke priče, zanimljivosti i kvizove upoznajemo Hrvatsku.</p>
              </div>
              <a
                href="https://www.tiktok.com/@patriasoul"
                target="_blank"
                rel="noreferrer"
                className="patria-social-button"
                aria-label="Prati PatriaSoul na TikToku"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M16.6 3c.3 1.8 1.3 3.1 3.4 3.5v3.1c-1.5-.1-2.8-.6-4-1.5v6.4c0 4.1-2.8 6.5-6.3 6.5-3.3 0-5.7-2.2-5.7-5.3 0-3.4 2.7-5.7 6.3-5.7.3 0 .7 0 1 .1v3.2c-.3-.1-.6-.2-1-.2-1.5 0-2.9.9-2.9 2.5 0 1.4 1 2.4 2.4 2.4 1.8 0 2.8-1.3 2.8-3.6V3h4z"/>
                </svg>
                <span>Prati nas</span>
              </a>
            </div>

            <div className="patria-social-card patria-social-card-faith">
              <div className="patria-social-copy">
                <span className="patria-social-label">Vjera · Yeshua</span>
                <p>Vjera, nada i istina kroz priču o Yeshui — Isusu Kristu. Sadržaj za one koji žele upoznati Njegovu riječ, život i poruku.</p>
              </div>
              <a
                href="https://www.tiktok.com/@hajdi331?lang=hr"
                target="_blank"
                rel="noreferrer"
                className="patria-social-button"
                aria-label="Prati vjerski kanal na TikToku"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M16.6 3c.3 1.8 1.3 3.1 3.4 3.5v3.1c-1.5-.1-2.8-.6-4-1.5v6.4c0 4.1-2.8 6.5-6.3 6.5-3.3 0-5.7-2.2-5.7-5.3 0-3.4 2.7-5.7 6.3-5.7.3 0 .7 0 1 .1v3.2c-.3-.1-.6-.2-1-.2-1.5 0-2.9.9-2.9 2.5 0 1.4 1 2.4 2.4 2.4 1.8 0 2.8-1.3 2.8-3.6V3h4z"/>
                </svg>
                <span>Prati vjerski kanal</span>
              </a>
            </div>

            <div className="patria-footer-legal">
              <a href="./rules.html" className="patria-footer-link">Pravilnik o igranju</a>
              <a href="./terms.html" className="patria-footer-link">Uvjeti korištenja</a>
              <a href="./privacy.html" className="patria-footer-link">Politika privatnosti</a>
              <a href="./about.html" className="patria-footer-link">O PatriaSoul</a>
              <a href="./contact.html" className="patria-footer-link">Kontakt</a>
            </div>
          </div>
        </div>

        <div className="patria-divider mt-10" />
        <div className="flex flex-col gap-3 pt-5 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 PatriaSoul. Sva prava pridržana.</span>
          <span>Hrvatska · Povijest · Znanje · Identitet</span>
        </div>
      </div>
    </footer>
  </div>;
}