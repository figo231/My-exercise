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
      profile: { name: "", level: 1, xp: 0, xpNext: 500 },
      weightLogs: [], // {date, weight, bodyFat}
      goalWeight: null,
      exerciseLogs: {}, // exerciseId: [{date, weight, sets, reps}]
      workoutDays: [],
      bestStreak: 0,
    };
  }

  function shiftDate(iso, delta) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const s = defaultState();
        save(s);
        return s;
      }
      return JSON.parse(raw);
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
      if (!s.exerciseLogs[exerciseId]) s.exerciseLogs[exerciseId] = [];
      s.exerciseLogs[exerciseId].push({ date: today, weight: Number(weight), sets: Number(sets), reps: Number(reps) });
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

    getGoalWeight() {
      return load().goalWeight;
    },
  };

  global.GymakStore = Store;
})(window);
