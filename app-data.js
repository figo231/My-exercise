/* =========================================================
   جيمك — طبقة البيانات (Store)
   كل حاجة بتتخزن في localStorage تحت بادئة gymak_
   ========================================================= */
(function (global) {
  const KEY = "gymak_state_v1";

  function todayISO() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  function daysBetween(a, b) {
    const d1 = new Date(a + "T00:00:00");
    const d2 = new Date(b + "T00:00:00");
    return Math.round((d2 - d1) / 86400000);
  }

  function defaultState() {
    return {
      profile: { name: "", level: 1, xp: 0, xpNext: 500, heightCm: null, memberSince: todayISO() },
      weightLogs: [], // {date, weight, bodyFat}
      goalWeight: null,
      exerciseLogs: {}, // exerciseId: [{date, weight, sets, reps}]
      workoutDays: [],
      bestStreak: 0,
      exercises: SEED_EXERCISES.slice(),
      prHistory: [], // {exerciseId, exerciseName, weight, prevWeight, date}
      activeProgramId: null,
    };
  }

  const PROGRAMS = [
    {
      id: "arnold-split", name: "Arnold Split", level: "متقدم", daysPerWeek: "6 أيام / أسبوع",
      dayChips: ["صدر وظهر", "أكتاف وذراعين", "أرجل", "×2 تكرار"],
      desc: "برنامج آرنولد شوارزنيغر الكلاسيكي، يركّز على تدريب كل عضلة مرتين أسبوعيًا بحجم تدريبي عالي. مناسب لمن عنده خبرة سابقة وقادر على التمرين 6 أيام.",
    },
    {
      id: "push-pull-legs", name: "Push Pull Legs", level: "متوسط", daysPerWeek: "5-6 أيام / أسبوع",
      dayChips: ["دفع (صدر/أكتاف/ترايسبس)", "سحب (ظهر/بايسبس)", "أرجل"],
      desc: "تقسيم شائع وفعّال بيقسم التمارين حسب حركة العضلة (دفع/سحب/أرجل) بدل العضلة نفسها، وده بيدي راحة أفضل وتكرار مناسب.",
    },
    {
      id: "upper-lower", name: "Upper Lower", level: "مبتدئ", daysPerWeek: "4 أيام / أسبوع",
      dayChips: ["علوي 1", "سفلي 1", "علوي 2", "سفلي 2"],
      desc: "تقسيم بسيط يناسب اللي وقته محدود — 4 أيام بس في الأسبوع، وبيدي توازن كويس بين الجزء العلوي والسفلي مع راحة كافية.",
    },
    {
      id: "full-body", name: "Full Body", level: "مبتدئ", daysPerWeek: "3 أيام / أسبوع",
      dayChips: ["جسم كامل A", "جسم كامل B", "جسم كامل C"],
      desc: "أفضل اختيار لو بتبدأ لأول مرة أو وقتك محدود جدًا. كل جلسة بتشغّل الجسم كله بحركات أساسية مركّبة.",
    },
  ];

  function shiftDate(iso, delta) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  const SEED_EXERCISES = [
    { id: "bench-press-barbell", name: "بنش برس بار", muscle: "chest", muscleLabel: "صدر", secondary: "ترايسبس", sets: 4, reps: 8, custom: false },
    { id: "incline-dumbbell-press", name: "بنش برس دمبل مائل", muscle: "chest", muscleLabel: "صدر علوي", secondary: "أكتاف", sets: 3, reps: 10, custom: false },
    { id: "cable-crossover", name: "كابل كروس أوفر", muscle: "chest", muscleLabel: "صدر داخلي", secondary: "", sets: 3, reps: 12, custom: false },
    { id: "shoulder-press-barbell", name: "ضغط أكتاف بار", muscle: "shoulders", muscleLabel: "أكتاف أمامية", secondary: "", sets: 3, reps: 10, custom: false },
    { id: "lateral-raise", name: "رفرفة جانبية دمبل", muscle: "shoulders", muscleLabel: "أكتاف جانبية", secondary: "", sets: 4, reps: 15, custom: false },
    { id: "lat-pulldown", name: "سحب أمامي (Lat Pulldown)", muscle: "back", muscleLabel: "ظهر علوي", secondary: "بايسبس", sets: 4, reps: 10, custom: false },
    { id: "deadlift", name: "ديدليفت", muscle: "back", muscleLabel: "ظهر سفلي", secondary: "أرجل خلفية", sets: 4, reps: 6, custom: false },
  ];

  const MUSCLE_META = {
    chest: { label: "صدر", color: "#3B82F6", light: "#93C5FD" },
    back: { label: "ظهر", color: "#22C55E", light: "#86EFAC" },
    shoulders: { label: "أكتاف", color: "#A855F7", light: "#DDD6FE" },
    legs: { label: "أرجل", color: "#F59E0B", light: "#FDE68A" },
    arms: { label: "ذراعين", color: "#EC4899", light: "#FBCFE8" },
    core: { label: "بطن", color: "#14B8A6", light: "#99F6E4" },
  };

  function slugify(name) {
    return "ex-" + name.trim().toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const s = defaultState();
        save(s);
        return s;
      }
      const parsed = JSON.parse(raw);
      if (!parsed.exercises) parsed.exercises = SEED_EXERCISES.slice();
      if (!parsed.profile) parsed.profile = defaultState().profile;
      if (parsed.profile.heightCm === undefined) parsed.profile.heightCm = null;
      if (!parsed.profile.memberSince) parsed.profile.memberSince = todayISO();
      if (!parsed.prHistory) parsed.prHistory = [];
      if (parsed.activeProgramId === undefined) parsed.activeProgramId = null;
      return parsed;
    } catch (e) {
      const s = defaultState();
      save(s);
      return s;
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error("gymak store save failed", e);
    }
  }

  const Store = {
    get() {
      return load();
    },

    // ===== Exercise catalog =====
    getExercises() {
      return load().exercises || SEED_EXERCISES.slice();
    },

    getExerciseById(id) {
      const list = this.getExercises();
      return list.find((e) => e.id === id) || null;
    },

    addExercise({ name, muscle, secondary, sets, reps }) {
      const s = load();
      if (!s.exercises) s.exercises = SEED_EXERCISES.slice();
      const meta = MUSCLE_META[muscle] || MUSCLE_META.chest;
      const ex = {
        id: slugify(name),
        name: name.trim(),
        muscle,
        muscleLabel: meta.label,
        secondary: secondary || "",
        sets: Number(sets) || 3,
        reps: Number(reps) || 10,
        custom: true,
      };
      s.exercises.push(ex);
      save(s);
      return ex;
    },

    deleteExercise(id) {
      const s = load();
      s.exercises = (s.exercises || []).filter((e) => e.id !== id);
      save(s);
    },

    getMuscleMeta(muscle) {
      return MUSCLE_META[muscle] || MUSCLE_META.chest;
    },

    getAllMuscles() {
      return MUSCLE_META;
    },

    // ===== Weight =====
    addWeight(weight, bodyFat) {
      const s = load();
      const today = todayISO();
      const existingIdx = s.weightLogs.findIndex((w) => w.date === today);
      const entry = { date: today, weight: Number(weight), bodyFat: bodyFat != null ? Number(bodyFat) : (s.weightLogs.at(-1)?.bodyFat ?? null) };
      if (existingIdx >= 0) s.weightLogs[existingIdx] = entry;
      else s.weightLogs.push(entry);
      s.weightLogs.sort((a, b) => (a.date > b.date ? 1 : -1));
      this._markWorkoutDay(s, today);
      save(s);
      return s;
    },

    getLatestWeight() {
      const s = load();
      return s.weightLogs.at(-1) || null;
    },

    getWeightDiffVsLastWeek() {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const weekAgoTarget = shiftDate(latest.date, -7);
      // find closest log on/before weekAgoTarget
      let ref = null;
      for (const w of s.weightLogs) {
        if (w.date <= weekAgoTarget) ref = w;
      }
      if (!ref) ref = s.weightLogs[0];
      return { diff: +(latest.weight - ref.weight).toFixed(1), from: ref.weight, to: latest.weight };
    },

    // ===== Exercises =====
    logSet(exerciseId, weight, sets, reps) {
      const s = load();
      const today = todayISO();
      const w = Number(weight);
      const prevLogs = s.exerciseLogs[exerciseId] || [];
      const prevMax = prevLogs.reduce((m, l) => Math.max(m, l.weight), 0);
      if (!s.exerciseLogs[exerciseId]) s.exerciseLogs[exerciseId] = [];
      s.exerciseLogs[exerciseId].push({ date: today, weight: w, sets: Number(sets), reps: Number(reps) });
      if (w > prevMax && prevLogs.length > 0) {
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        s.prHistory.unshift({
          exerciseId, exerciseName: ex ? ex.name : exerciseId,
          weight: w, prevWeight: prevMax, date: today,
        });
        s.prHistory = s.prHistory.slice(0, 30);
      }
      // award XP
      s.profile.xp += 25;
      while (s.profile.xp >= s.profile.xpNext) {
        s.profile.xp -= s.profile.xpNext;
        s.profile.level += 1;
        s.profile.xpNext = Math.round(s.profile.xpNext * 1.15);
      }
      this._markWorkoutDay(s, today);
      save(s);
      return s;
    },

    getLastExerciseLog(exerciseId) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId];
      if (!logs || !logs.length) return null;
      return logs.at(-1);
    },

    getPreviousBest(exerciseId) {
      const s = load();
      const logs = s.exerciseLogs[exerciseId] || [];
      if (logs.length < 2) return null;
      return logs[logs.length - 2];
    },

    // ===== Streak =====
    _markWorkoutDay(s, dateISO) {
      if (!s.workoutDays.includes(dateISO)) {
        s.workoutDays.push(dateISO);
        s.workoutDays.sort();
      }
      // recompute current streak against this updated set and persist the best
      const set = new Set(s.workoutDays);
      let streak = 0;
      let cursor = todayISO();
      if (!set.has(cursor)) cursor = shiftDate(cursor, -1);
      while (set.has(cursor)) { streak++; cursor = shiftDate(cursor, -1); }
      s.bestStreak = Math.max(s.bestStreak || 0, streak);
    },

    getStreak() {
      const s = load();
      const set = new Set(s.workoutDays);
      let streak = 0;
      let cursor = todayISO();
      // if today not logged yet, streak counts up to yesterday still (don't break it)
      if (!set.has(cursor)) cursor = shiftDate(cursor, -1);
      while (set.has(cursor)) {
        streak++;
        cursor = shiftDate(cursor, -1);
      }
      return streak;
    },

    getBestStreak() {
      const s = load();
      const current = this.getStreak();
      return Math.max(s.bestStreak || 0, current);
    },

    getLast7DaysStatus() {
      const s = load();
      const set = new Set(s.workoutDays);
      const today = todayISO();
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = shiftDate(today, -i);
        out.push({ date: d, done: set.has(d) });
      }
      return out;
    },

    // ===== Profile / XP =====
    getProfile() {
      return load().profile;
    },

    setProfileName(name) {
      const s = load();
      s.profile.name = (name || "").trim().slice(0, 40);
      save(s);
      return s.profile;
    },

    setHeight(cm) {
      const s = load();
      s.profile.heightCm = cm ? Number(cm) : null;
      save(s);
      return s.profile;
    },

    getBMI() {
      const s = load();
      const h = s.profile.heightCm;
      const latest = s.weightLogs.at(-1);
      if (!h || !latest) return null;
      const m = h / 100;
      return +(latest.weight / (m * m)).toFixed(1);
    },

    getGoalWeight() {
      return load().goalWeight;
    },

    setGoalWeight(kg) {
      const s = load();
      s.goalWeight = kg ? Number(kg) : null;
      save(s);
      return s.goalWeight;
    },

    // ===== Weight diff over an arbitrary window =====
    getWeightDiffOverDays(days) {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const target = shiftDate(latest.date, -days);
      let ref = null;
      for (const w of s.weightLogs) { if (w.date <= target) ref = w; }
      if (!ref) ref = s.weightLogs[0];
      if (ref === latest) return null;
      return { diff: +(latest.weight - ref.weight).toFixed(1), from: ref.weight, to: latest.weight };
    },

    getWeightHistory(limit = 12) {
      const s = load();
      return s.weightLogs.slice(-limit);
    },

    // ===== PRs =====
    getRecentPRs(limit = 5) {
      return load().prHistory.slice(0, limit);
    },

    // ===== Tonnage & activity within a window =====
    getTonnage(days = null) {
      const s = load();
      const cutoff = days != null ? shiftDate(todayISO(), -days) : null;
      let total = 0;
      Object.values(s.exerciseLogs).forEach((logs) => {
        logs.forEach((l) => {
          if (!cutoff || l.date >= cutoff) total += l.weight * l.sets * l.reps;
        });
      });
      return total;
    },

    getSetsInRange(days) {
      const s = load();
      const cutoff = shiftDate(todayISO(), -days);
      let count = 0;
      Object.values(s.exerciseLogs).forEach((logs) => {
        logs.forEach((l) => { if (l.date >= cutoff) count++; });
      });
      return count;
    },

    getWorkoutDaysInRange(days) {
      const s = load();
      const cutoff = shiftDate(todayISO(), -days);
      return s.workoutDays.filter((d) => d >= cutoff).length;
    },

    // ===== Strength progress (first logged weight vs latest, per exercise) =====
    getStrengthProgress(limit = 3) {
      const s = load();
      const rows = [];
      Object.keys(s.exerciseLogs).forEach((exerciseId) => {
        const logs = s.exerciseLogs[exerciseId];
        if (!logs || logs.length < 2) return;
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        const first = logs[0].weight;
        const last = logs.at(-1).weight;
        if (first <= 0) return;
        const pct = ((last - first) / first) * 100;
        rows.push({ exerciseId, name: ex ? ex.name : exerciseId, from: first, to: last, pct: Math.round(pct) });
      });
      rows.sort((a, b) => b.pct - a.pct);
      return rows.slice(0, limit);
    },

    // ===== Programs =====
    getPrograms() {
      return PROGRAMS;
    },

    getActiveProgram() {
      const s = load();
      if (!s.activeProgramId) return null;
      return PROGRAMS.find((p) => p.id === s.activeProgramId) || null;
    },

    applyProgram(id) {
      const s = load();
      s.activeProgramId = id;
      save(s);
      return this.getActiveProgram();
    },

    // ===== Achievements (computed live from real data, never hardcoded) =====
    getAchievements() {
      const s = load();
      const totalSets = Object.values(s.exerciseLogs).reduce((sum, arr) => sum + arr.length, 0);
      const bestStreak = this.getBestStreak();
      const level = s.profile.level;
      const hasPR = s.prHistory.length > 0;
      const goalHit = s.goalWeight != null && s.weightLogs.length > 0 &&
        Math.abs(s.weightLogs.at(-1).weight - s.goalWeight) <= 0.5;

      return [
        { id: "streak7", name: "أسبوع كامل", unlocked: bestStreak >= 7 },
        { id: "streak14", name: "14 يوم متتالي", unlocked: bestStreak >= 14 },
        { id: "streak30", name: "30 يوم متتالي", unlocked: bestStreak >= 30 },
        { id: "sets10", name: "10 مجموعات مسجّلة", unlocked: totalSets >= 10 },
        { id: "sets50", name: "50 مجموعة مسجّلة", unlocked: totalSets >= 50 },
        { id: "sets100", name: "100 مجموعة مسجّلة", unlocked: totalSets >= 100 },
        { id: "level5", name: "مستوى 5", unlocked: level >= 5 },
        { id: "firstPR", name: "أول رقم قياسي", unlocked: hasPR },
        { id: "goal", name: "تحقيق هدف الوزن", unlocked: goalHit },
      ];
    },

    getRecentExerciseLogs(limit = 3) {
      const s = load();
      const rows = [];
      Object.keys(s.exerciseLogs).forEach((exerciseId) => {
        const ex = (s.exercises || []).find((e) => e.id === exerciseId);
        (s.exerciseLogs[exerciseId] || []).forEach((l) => {
          rows.push({
            exerciseId, date: l.date, weight: l.weight, sets: l.sets, reps: l.reps,
            name: ex ? ex.name : exerciseId,
            muscle: ex ? ex.muscle : "chest",
            muscleLabel: ex ? ex.muscleLabel : "",
          });
        });
      });
      rows.sort((a, b) => (a.date < b.date ? 1 : -1));
      return rows.slice(0, limit);
    },

    // ===== Danger zone =====
    resetAllData() {
      const fresh = defaultState();
      save(fresh);
      return fresh;
    },
  };

  global.GymakStore = Store;
})(window);
