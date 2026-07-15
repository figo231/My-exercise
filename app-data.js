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
      profile: { name: "", username: "", bio: "", avatar: null, cover: null, coverGradient: "g1", level: 1, xp: 0, xpNext: 500, heightCm: null, gender: null, memberSince: todayISO() },
      weightLogs: [], // {date, weight, bodyFat}
      goalWeight: null,
      exerciseLogs: {}, // exerciseId: [{date, weight, sets, reps}]
      workoutDays: [],
      bestStreak: 0,
      exercises: SEED_EXERCISES.slice(),
      prHistory: [], // {exerciseId, exerciseName, weight, prevWeight, date}
      activeProgramId: null,
      foodLog: [], // {date, items:[{name,grams,kcal,protein,carbs,fat}], totalKcal, totalProtein, totalCarbs, totalFat}
      settings: { unit: "kg", notifEnabled: false, notifTime: "19:00", lang: "ar" },
    };
  }

  const KG_PER_LB = 0.45359237;

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

  // ===== Food database (approximate values per 100g, unless pieceWeight given) =====
  // kcal/protein/carbs/fat per 100g. pieceWeight (grams) used when someone counts by حبة/رغيف/etc.
  const FOOD_DB = [
    { names: ["فراخ مشوية", "صدور فراخ", "صدر فراخ", "فراخ مسلوقة", "chicken grilled", "فراخ"], per100: { kcal: 165, protein: 31, carbs: 0, fat: 3.6 } },
    { names: ["فراخ مقلية", "فراخ بانيه"], per100: { kcal: 260, protein: 22, carbs: 12, fat: 15 } },
    { names: ["لحمة مفرومة", "كفتة", "لحمة"], per100: { kcal: 250, protein: 26, carbs: 0, fat: 17 } },
    { names: ["كباب", "كباب حلة"], per100: { kcal: 230, protein: 25, carbs: 1, fat: 14 } },
    { names: ["سمك بلطي", "سمك مشوي", "سمك", "بوري"], per100: { kcal: 128, protein: 26, carbs: 0, fat: 3 } },
    { names: ["تونة", "تونة معلبة"], per100: { kcal: 130, protein: 26, carbs: 0, fat: 3 } },
    { names: ["كبدة"], per100: { kcal: 175, protein: 26, carbs: 4, fat: 6 } },
    { names: ["سجق"], per100: { kcal: 300, protein: 15, carbs: 3, fat: 25 } },
    { names: ["بسطرمة"], per100: { kcal: 190, protein: 30, carbs: 2, fat: 7 } },
    { names: ["بيضة مسلوقة", "بيضة", "بيض", "بيضة مقلية"], pieceWeight: 50, per100: { kcal: 155, protein: 13, carbs: 1.1, fat: 11 } },
    { names: ["زبادي", "زبادي كامل الدسم"], per100: { kcal: 61, protein: 3.5, carbs: 4.7, fat: 3.3 } },
    { names: ["لبن", "لبن كامل الدسم"], per100: { kcal: 61, protein: 3.2, carbs: 4.8, fat: 3.3 } },
    { names: ["جبنة قريش"], per100: { kcal: 98, protein: 11, carbs: 3.4, fat: 4.3 } },
    { names: ["جبنة بيضاء", "جبنة فيتا"], per100: { kcal: 264, protein: 14, carbs: 4, fat: 21 } },
    { names: ["جبنة رومي"], per100: { kcal: 380, protein: 25, carbs: 2, fat: 30 } },
    { names: ["فول مدمس", "فول"], per100: { kcal: 110, protein: 7.6, carbs: 18, fat: 0.6 } },
    { names: ["طعمية", "فلافل"], pieceWeight: 25, per100: { kcal: 333, protein: 13, carbs: 32, fat: 18 } },
    { names: ["عدس", "شوربة عدس"], per100: { kcal: 116, protein: 9, carbs: 20, fat: 0.4 } },
    { names: ["كشري"], per100: { kcal: 180, protein: 5, carbs: 30, fat: 5 } },
    { names: ["ملوخية"], per100: { kcal: 65, protein: 4.5, carbs: 8, fat: 1.5 } },
    { names: ["بامية"], per100: { kcal: 55, protein: 2, carbs: 8, fat: 1.5 } },
    { names: ["حمام محشي", "حمام"], per100: { kcal: 210, protein: 20, carbs: 12, fat: 9 } },
    { names: ["رز أبيض", "رز", "أرز"], per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    { names: ["مكرونة", "مكرونة بالبشاميل", "باستا"], per100: { kcal: 158, protein: 5.8, carbs: 31, fat: 1 } },
    { names: ["عيش بلدي", "خبز بلدي"], pieceWeight: 90, per100: { kcal: 265, protein: 9, carbs: 52, fat: 2 } },
    { names: ["عيش فينو", "خبز فينو"], pieceWeight: 70, per100: { kcal: 280, protein: 9, carbs: 55, fat: 3 } },
    { names: ["خبز توست", "توست"], pieceWeight: 25, per100: { kcal: 270, protein: 9, carbs: 50, fat: 3.5 } },
    { names: ["بطاطس مسلوقة", "بطاطس"], per100: { kcal: 87, protein: 2, carbs: 20, fat: 0.1 } },
    { names: ["بطاطس مقلية", "بطاطا مقلية"], per100: { kcal: 312, protein: 3.4, carbs: 41, fat: 15 } },
    { names: ["شيبسي", "شيبس"], per100: { kcal: 536, protein: 6.6, carbs: 53, fat: 34 } },
    { names: ["خضار مشكل", "خضار سوتيه"], per100: { kcal: 65, protein: 2.5, carbs: 10, fat: 1.5 } },
    { names: ["سلطة خضراء", "سلطة"], per100: { kcal: 25, protein: 1.2, carbs: 4, fat: 0.2 } },
    { names: ["موز", "موزة"], pieceWeight: 120, per100: { kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    { names: ["تفاح", "تفاحة"], pieceWeight: 150, per100: { kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { names: ["برتقال", "برتقالة"], pieceWeight: 130, per100: { kcal: 47, protein: 0.9, carbs: 12, fat: 0.1 } },
    { names: ["تمر"], pieceWeight: 8, per100: { kcal: 282, protein: 2.5, carbs: 75, fat: 0.4 } },
    { names: ["مانجو", "عصير مانجو"], per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
    { names: ["لوز"], per100: { kcal: 579, protein: 21, carbs: 22, fat: 50 } },
    { names: ["فول سوداني", "سوداني"], per100: { kcal: 567, protein: 26, carbs: 16, fat: 49 } },
    { names: ["زيت زيتون", "زيت"], per100: { kcal: 884, protein: 0, carbs: 0, fat: 100 } },
    { names: ["عسل"], per100: { kcal: 304, protein: 0.3, carbs: 82, fat: 0 } },
    { names: ["حلاوة طحينية", "طحينة"], per100: { kcal: 545, protein: 15, carbs: 47, fat: 34 } },
    { names: ["فطير مشلتت", "فطير"], per100: { kcal: 330, protein: 6, carbs: 40, fat: 16 } },
    { names: ["كنافة"], per100: { kcal: 350, protein: 5, carbs: 45, fat: 17 } },
    { names: ["بقلاوة"], per100: { kcal: 430, protein: 6, carbs: 50, fat: 23 } },
    { names: ["آيس كريم", "ايس كريم"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["شوكولاتة", "شيكولاتة"], per100: { kcal: 545, protein: 5, carbs: 60, fat: 31 } },
    { names: ["بيبسي", "كولا", "كوكاكولا", "مياه غازية"], per100: { kcal: 42, protein: 0, carbs: 10.6, fat: 0 } },
    { names: ["شاي بسكر", "شاي محلى"], per100: { kcal: 20, protein: 0, carbs: 5, fat: 0 } },
    { names: ["قهوة"], per100: { kcal: 5, protein: 0.3, carbs: 0.8, fat: 0 } },
    { names: ["ماء", "مياه"], per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },

    // ===== لحوم وبروتينات إضافية =====
    { names: ["لحمة ضاني", "ضاني"], per100: { kcal: 294, protein: 25, carbs: 0, fat: 21 } },
    { names: ["لحمة بقري مشوية", "استيك"], per100: { kcal: 271, protein: 26, carbs: 0, fat: 18 } },
    { names: ["فراخ بانيه", "بانيه"], per100: { kcal: 290, protein: 20, carbs: 18, fat: 16 } },
    { names: ["شاورما فراخ", "شاورما"], per100: { kcal: 220, protein: 18, carbs: 8, fat: 13 } },
    { names: ["برجر لحمة", "برجر"], per100: { kcal: 250, protein: 17, carbs: 20, fat: 12 } },
    { names: ["هوت دوج"], per100: { kcal: 290, protein: 10, carbs: 22, fat: 18 } },
    { names: ["جمبري", "روبيان"], per100: { kcal: 99, protein: 24, carbs: 0.2, fat: 0.3 } },
    { names: ["سلمون"], per100: { kcal: 208, protein: 20, carbs: 0, fat: 13 } },
    { names: ["بط", "بطة"], per100: { kcal: 337, protein: 19, carbs: 0, fat: 28 } },
    { names: ["حبش", "ديك رومي"], per100: { kcal: 135, protein: 30, carbs: 0, fat: 1 } },
    { names: ["مسقعة"], per100: { kcal: 145, protein: 4, carbs: 12, fat: 9 } },
    { names: ["محشي كرنب", "محشي ورق عنب", "محشي"], per100: { kcal: 150, protein: 3, carbs: 22, fat: 6 } },
    { names: ["فتة"], per100: { kcal: 220, protein: 12, carbs: 20, fat: 10 } },

    // ===== ألبان ومشتقاتها =====
    { names: ["حليب قليل الدسم", "لبن خالي الدسم"], per100: { kcal: 42, protein: 3.4, carbs: 5, fat: 0.1 } },
    { names: ["جبنة موتزاريلا", "موتزاريلا"], per100: { kcal: 280, protein: 22, carbs: 2, fat: 22 } },
    { names: ["جبنة شيدر", "شيدر"], per100: { kcal: 402, protein: 25, carbs: 1.3, fat: 33 } },
    { names: ["زبادي يوناني", "يوناني"], per100: { kcal: 97, protein: 10, carbs: 4, fat: 5 } },
    { names: ["زبدة"], per100: { kcal: 717, protein: 0.9, carbs: 0.1, fat: 81 } },
    { names: ["قشطة", "كريمة"], per100: { kcal: 340, protein: 2.8, carbs: 2.9, fat: 36 } },
    { names: ["آيس كريم فانيليا"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["رايب"], per100: { kcal: 65, protein: 3.4, carbs: 4.5, fat: 3.5 } },

    // ===== حبوب ونشويات إضافية =====
    { names: ["شوفان"], per100: { kcal: 389, protein: 17, carbs: 66, fat: 7 } },
    { names: ["كورن فليكس"], per100: { kcal: 357, protein: 7.5, carbs: 84, fat: 0.9 } },
    { names: ["فريكة"], per100: { kcal: 340, protein: 12, carbs: 70, fat: 2.5 } },
    { names: ["برغل"], per100: { kcal: 342, protein: 12, carbs: 76, fat: 1.3 } },
    { names: ["حمص", "حمص بالطحينة"], per100: { kcal: 164, protein: 8, carbs: 27, fat: 2.6 } },
    { names: ["فاصوليا بيضاء", "فاصوليا"], per100: { kcal: 127, protein: 8.7, carbs: 23, fat: 0.5 } },
    { names: ["بيتزا"], per100: { kcal: 266, protein: 11, carbs: 33, fat: 10 } },
    { names: ["ساندوتش جبنة", "ساندوتش"], per100: { kcal: 250, protein: 10, carbs: 30, fat: 10 } },
    { names: ["كرواسون"], per100: { kcal: 406, protein: 8, carbs: 46, fat: 21 } },
    { names: ["دونات"], per100: { kcal: 452, protein: 5, carbs: 51, fat: 25 } },
    { names: ["بسكويت"], per100: { kcal: 435, protein: 6, carbs: 68, fat: 16 } },

    // ===== خضار وفاكهة إضافية =====
    { names: ["طماطم", "طماطم مقطعة"], per100: { kcal: 18, protein: 0.9, carbs: 3.9, fat: 0.2 } },
    { names: ["خيار", "خيارة"], pieceWeight: 100, per100: { kcal: 15, protein: 0.7, carbs: 3.6, fat: 0.1 } },
    { names: ["جزر", "جزرة"], pieceWeight: 60, per100: { kcal: 41, protein: 0.9, carbs: 10, fat: 0.2 } },
    { names: ["فلفل ألوان", "فلفل"], per100: { kcal: 31, protein: 1, carbs: 6, fat: 0.3 } },
    { names: ["كوسة"], per100: { kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 } },
    { names: ["باذنجان"], per100: { kcal: 25, protein: 1, carbs: 6, fat: 0.2 } },
    { names: ["جوافة"], pieceWeight: 100, per100: { kcal: 68, protein: 2.6, carbs: 14, fat: 1 } },
    { names: ["بطيخ"], per100: { kcal: 30, protein: 0.6, carbs: 8, fat: 0.2 } },
    { names: ["شمام"], per100: { kcal: 34, protein: 0.8, carbs: 8, fat: 0.2 } },
    { names: ["عنب"], per100: { kcal: 69, protein: 0.7, carbs: 18, fat: 0.2 } },
    { names: ["فراولة"], per100: { kcal: 32, protein: 0.7, carbs: 7.7, fat: 0.3 } },
    { names: ["مانجا", "مانجو حبة"], pieceWeight: 200, per100: { kcal: 60, protein: 0.8, carbs: 15, fat: 0.4 } },
    { names: ["أفوكادو", "افوكادو"], pieceWeight: 150, per100: { kcal: 160, protein: 2, carbs: 8.5, fat: 15 } },
    { names: ["كيوي"], pieceWeight: 75, per100: { kcal: 61, protein: 1.1, carbs: 15, fat: 0.5 } },
    { names: ["أناناس", "اناناس"], per100: { kcal: 50, protein: 0.5, carbs: 13, fat: 0.1 } },

    // ===== مكسرات وزيوت إضافية =====
    { names: ["جوز", "عين جمل"], per100: { kcal: 654, protein: 15, carbs: 14, fat: 65 } },
    { names: ["كاجو"], per100: { kcal: 553, protein: 18, carbs: 30, fat: 44 } },
    { names: ["بندق"], per100: { kcal: 628, protein: 15, carbs: 17, fat: 61 } },
    { names: ["فستق"], per100: { kcal: 560, protein: 20, carbs: 28, fat: 45 } },
    { names: ["زبدة فول سوداني"], per100: { kcal: 588, protein: 25, carbs: 20, fat: 50 } },

    // ===== مشروبات ومكملات =====
    { names: ["عصير برتقال طبيعي", "عصير برتقال"], per100: { kcal: 45, protein: 0.7, carbs: 10.4, fat: 0.2 } },
    { names: ["عصير قصب"], per100: { kcal: 60, protein: 0.2, carbs: 15, fat: 0 } },
    { names: ["حليب صويا", "لبن صويا"], per100: { kcal: 33, protein: 3.3, carbs: 1.8, fat: 1.8 } },
    { names: ["بروتين شيك", "بروتين واي", "واي بروتين"], per100: { kcal: 400, protein: 80, carbs: 8, fat: 5 } },
    { names: ["جينر", "مشروب طاقة"], per100: { kcal: 45, protein: 0, carbs: 11, fat: 0 } },
    { names: ["نسكافيه", "قهوة بالحليب"], per100: { kcal: 40, protein: 1.5, carbs: 5, fat: 1.5 } },

    // ===== حلويات ووجبات خفيفة إضافية =====
    { names: ["رز باللبن"], per100: { kcal: 120, protein: 3.5, carbs: 20, fat: 3 } },
    { names: ["أم علي", "ام علي"], per100: { kcal: 250, protein: 5, carbs: 30, fat: 12 } },
    { names: ["بسبوسة"], per100: { kcal: 350, protein: 4, carbs: 55, fat: 13 } },
    { names: ["كيك", "كيكة"], per100: { kcal: 371, protein: 5, carbs: 55, fat: 15 } },
    { names: ["بوظة", "جيلاتي"], per100: { kcal: 207, protein: 3.5, carbs: 24, fat: 11 } },
    { names: ["كورن دوج"], per100: { kcal: 300, protein: 9, carbs: 25, fat: 18 } },
    { names: ["بوشار", "فشار"], per100: { kcal: 387, protein: 12, carbs: 78, fat: 4.5 } },
  ];

  const UNIT_GRAMS = {
    "جم": 1, "جرام": 1, "غرام": 1, "g": 1,
    "كيلو": 1000, "كجم": 1000,
    "كوب": 200, "كوباية": 200,
    "معلقة كبيرة": 15, "ملعقة كبيرة": 15,
    "معلقة صغيرة": 5, "ملعقة صغيرة": 5,
  };
  const AR_NUMBER_WORDS = { "واحد": 1, "واحدة": 1, "اتنين": 2, "أتنين": 2, "تلاتة": 3, "ثلاثة": 3, "أربعة": 4, "اربعة": 4, "خمسة": 5, "زوج": 2 };
  const DUAL_SUFFIX = /(تين|ين)$/; // e.g. حبتين، رغيفين → 2

  function normalizeDigits(text) {
    const map = { "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9" };
    return text.replace(/[٠-٩]/g, (d) => map[d]);
  }

  function parseFoodText(rawText) {
    const items = [];
    const usedRanges = [];
    const lower = normalizeDigits(rawText);
    for (const food of FOOD_DB) {
      for (const alias of food.names) {
        let idx = lower.indexOf(alias);
        if (idx === -1) continue;
        // avoid double-matching overlapping ranges
        const overlaps = usedRanges.some((r) => idx < r.end && idx + alias.length > r.start);
        if (overlaps) continue;
        usedRanges.push({ start: idx, end: idx + alias.length });

        // look at a small window before the match for a quantity/unit
        const windowStart = Math.max(0, idx - 18);
        const before = lower.slice(windowStart, idx);
        let grams = null;

        const numMatch = before.match(/(\d+(\.\d+)?)\s*(جم|جرام|غرام|g|كيلو|كجم|كوب|كوباية|معلقة كبيرة|ملعقة كبيرة|معلقة صغيرة|ملعقة صغيرة|حبة|حبات|رغيف|رغفان|قطعة)?\s*$/);
        if (numMatch) {
          const n = parseFloat(numMatch[1]);
          const unit = numMatch[3];
          if (unit && UNIT_GRAMS[unit] !== undefined) grams = n * UNIT_GRAMS[unit];
          else if (food.pieceWeight) grams = n * food.pieceWeight;
          else grams = n * 100; // fallback: treat bare number as "×100g servings"
        } else {
          // check for dual/plural word forms like "حبتين" or Arabic number words
          const wordMatch = before.match(/(واحد[ة]?|اتنين|أتنين|تلاتة|ثلاثة|أربعة|اربعة|خمسة|زوج|\S*تين|\S*ين)\s*$/);
          if (wordMatch) {
            const w = wordMatch[1];
            let n = AR_NUMBER_WORDS[w];
            if (n === undefined && DUAL_SUFFIX.test(w)) n = 2;
            if (n && food.pieceWeight) grams = n * food.pieceWeight;
          }
        }
        if (grams === null) {
          grams = food.pieceWeight || 100; // default: 1 piece or 100g serving
        }

        const factor = grams / 100;
        items.push({
          name: alias,
          grams: Math.round(grams),
          kcal: Math.round(food.per100.kcal * factor),
          protein: Math.round(food.per100.protein * factor * 10) / 10,
          carbs: Math.round(food.per100.carbs * factor * 10) / 10,
          fat: Math.round(food.per100.fat * factor * 10) / 10,
        });
        break; // move to next food after first alias match
      }
    }
    return items;
  }

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

  // ===== i18n dictionary (interface chrome — labels/buttons/nav) =====
  const I18N = {
    nav_home: { ar: "الرئيسية", en: "Home" },
    nav_exercises: { ar: "التمارين", en: "Exercises" },
    nav_stats: { ar: "الإحصائيات", en: "Stats" },
    nav_profile: { ar: "حسابي", en: "Profile" },

    ex_title: { ar: "التمارين", en: "Exercises" },
    ex_search_ph: { ar: "دور على تمرين...", en: "Search exercises..." },
    ex_filter_all: { ar: "الكل", en: "All" },
    ex_filter_chest: { ar: "صدر", en: "Chest" },
    ex_filter_back: { ar: "ظهر", en: "Back" },
    ex_filter_shoulders: { ar: "أكتاف", en: "Shoulders" },
    ex_filter_legs: { ar: "أرجل", en: "Legs" },
    ex_filter_arms: { ar: "ذراعين", en: "Arms" },
    ex_filter_core: { ar: "بطن", en: "Core" },
    ex_empty: { ar: 'مفيش تمارين في القسم ده لسه.<br/>دوس على + فوق عشان تضيف تمرين جديد.', en: 'No exercises in this section yet.<br/>Tap + above to add a new exercise.' },
    ex_add_title: { ar: "إضافة تمرين جديد", en: "Add New Exercise" },
    ex_add_name_label: { ar: "اسم التمرين", en: "Exercise name" },
    ex_add_muscle_label: { ar: "العضلة الأساسية", en: "Primary muscle" },
    ex_add_secondary_label: { ar: "عضلات مساعدة (اختياري)", en: "Secondary muscles (optional)" },
    ex_add_sets_label: { ar: "مجموعات", en: "Sets" },
    ex_add_reps_label: { ar: "تكرارات", en: "Reps" },
    ex_add_cancel: { ar: "إلغاء", en: "Cancel" },
    ex_add_save: { ar: "إضافة التمرين", en: "Add Exercise" },
    ex_delete_hint: { ar: "اضغط مطوّل على أي تمرين لحذفه", en: "Long-press any exercise to delete it" },
    ex_active_program: { ar: "البرنامج الحالي", en: "Active Program" },
    ex_change_program: { ar: "تغيير", en: "Change" },

    detail_media_tag: { ar: "توضيح الحركة", en: "Movement guide" },
    detail_steps_title: { ar: "طريقة الأداء الصحيح", en: "How to perform it" },
    detail_log_title: { ar: "تسجيل الأداء", en: "Log Performance" },
    detail_log_btn: { ar: "تسجيل هذه المجموعة", en: "Log this set" },
    detail_muscles_primary: { ar: "أساسية", en: "Primary" },
    detail_muscles_secondary: { ar: "مساعدة", en: "Secondary" },

    prog_title: { ar: "برامج التدريب الجاهزة", en: "Ready Training Programs" },
    prog_sub: { ar: "اختار برنامج وطبّقه تلقائيًا على جدولك", en: "Pick a program and apply it to your schedule" },
    prog_apply: { ar: "تطبيق البرنامج", en: "Apply Program" },
    prog_applied: { ar: "مطبّق حاليًا ✓", en: "Currently Applied ✓" },
    prog_details: { ar: "التفاصيل", en: "Details" },
    prog_close: { ar: "إغلاق", en: "Close" },
    prog_recommended: { ar: "موصى به لك", en: "Recommended for you" },

    settings_title: { ar: "الإعدادات", en: "Settings" },
    settings_lang: { ar: "اللغة والوحدات", en: "Language & Units" },
    settings_notif: { ar: "الإشعارات والتذكيرات", en: "Notifications & Reminders" },
    settings_programs: { ar: "برامج التدريب الجاهزة", en: "Ready Training Programs" },
    settings_contact_dev: { ar: "تواصل مع المطور", en: "Contact Developer" },
    settings_reset: { ar: "إعادة تعيين كل البيانات", en: "Reset All Data" },
    edit_profile_btn: { ar: "تعديل الملف الشخصي", en: "Edit Profile" },
    edit_gender_label: { ar: "الجنس", en: "Gender" },
    edit_gender_male: { ar: "راجل", en: "Male" },
    edit_gender_female: { ar: "ست", en: "Female" },

    ai_title: { ar: "المدرّب الذكي", en: "AI Coach" },
    ai_status: { ar: "متصل الآن", en: "Online now" },
    ai_input_ph: { ar: "اسأل مدربك الذكي...", en: "Ask your AI coach..." },

    home_day_streak: { ar: "يوم متتالي", en: "day streak" },
    home_best: { ar: "أعلى رقم", en: "Best" },
    home_fat: { ar: "الدهون", en: "Fat" },
    home_goal: { ar: "الهدف", en: "Goal" },
    home_log_exercise: { ar: "تسجيل تمرين", en: "Log Exercise" },
    home_log_weight: { ar: "تسجيل وزن", en: "Log Weight" },
    home_body_measurements: { ar: "قياسات الجسم", en: "Body Measurements" },
    home_details: { ar: "التفاصيل", en: "Details" },
    home_body_fat: { ar: "دهون الجسم", en: "Body Fat" },
    home_month_change: { ar: "تغيّر الشهر", en: "Month Change" },
    home_recent_workout: { ar: "آخر تمرين مسجّل", en: "Recent Workout" },
    home_view_all: { ar: "عرض الكل", en: "View All" },
    home_empty_workout: { ar: 'لسه ما سجلتش أي تمرين. دوس "تسجيل تمرين" وابدأ.', en: 'No workouts logged yet. Tap "Log Exercise" to start.' },
    home_log_today_weight: { ar: "تسجيل وزن اليوم", en: "Log Today's Weight" },
    home_body_fat_optional: { ar: "نسبة الدهون % (اختياري)", en: "Body fat % (optional)" },
    home_cancel: { ar: "إلغاء", en: "Cancel" },
    home_save: { ar: "حفظ", en: "Save" },
  };

  function tr(key) {
    const lang = load().settings.lang || "ar";
    const entry = I18N[key];
    if (!entry) return key;
    return entry[lang] || entry.ar;
  }

  function applyI18n() {
    const lang = load().settings.lang || "ar";
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "en" ? "ltr" : "rtl";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.innerHTML = tr(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.placeholder = tr(el.getAttribute("data-i18n-ph"));
    });
  }

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
      if (parsed.profile.username === undefined) parsed.profile.username = "";
      if (parsed.profile.bio === undefined) parsed.profile.bio = "";
      if (parsed.profile.avatar === undefined) parsed.profile.avatar = null;
      if (parsed.profile.cover === undefined) parsed.profile.cover = null;
      if (parsed.profile.coverGradient === undefined) parsed.profile.coverGradient = "g1";
      if (parsed.profile.gender === undefined) parsed.profile.gender = null;
      if (!parsed.prHistory) parsed.prHistory = [];
      if (parsed.activeProgramId === undefined) parsed.activeProgramId = null;
      if (!parsed.settings) parsed.settings = { unit: "kg", notifEnabled: false, notifTime: "19:00", lang: "ar" };
      if (parsed.settings.unit === undefined) parsed.settings.unit = "kg";
      if (parsed.settings.notifEnabled === undefined) parsed.settings.notifEnabled = false;
      if (parsed.settings.notifTime === undefined) parsed.settings.notifTime = "19:00";
      if (parsed.settings.lang === undefined) parsed.settings.lang = "ar";
      if (!parsed.foodLog) parsed.foodLog = [];
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
      return true;
    } catch (e) {
      console.error("gymak store save failed", e);
      return false;
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
      if (!s.exercises) s.exercises = SEED_EXERCISES.slice();
      s.exercises = s.exercises.filter((e) => e.id !== id);
      save(s);
    },

    getMuscleMeta(muscle) {
      return MUSCLE_META[muscle] || MUSCLE_META.chest;
    },

    getAllMuscles() {
      return MUSCLE_META;
    },

    // ===== Settings (units / notifications) =====
    getSettings() {
      return load().settings;
    },

    setUnit(unit) {
      const s = load();
      s.settings.unit = unit === "lb" ? "lb" : "kg";
      save(s);
      return s.settings.unit;
    },

    setNotifSettings({ enabled, time }) {
      const s = load();
      if (enabled !== undefined) s.settings.notifEnabled = !!enabled;
      if (time) s.settings.notifTime = time;
      save(s);
      return s.settings;
    },

    // ===== Language =====
    getLang() {
      return load().settings.lang || "ar";
    },

    setLang(lang) {
      const s = load();
      s.settings.lang = lang === "en" ? "en" : "ar";
      save(s);
      return s.settings.lang;
    },

    // ===== Developer contact =====
    getDeveloperWhatsAppUrl() {
      const lang = this.getLang();
      const msg = lang === "en"
        ? "Hi! I'm using Gymak app and I'd like to reach the developer 👋"
        : "السلام عليكم، بستخدم تطبيق جيمك وحابب أتواصل مع المطور 👋";
      return "https://wa.me/201022390517?text=" + encodeURIComponent(msg);
    },

    // ===== Reminder notification (shared across pages so it stays armed) =====
    _reminderTimerId: null,
    scheduleReminder() {
      if (typeof Notification === "undefined") return;
      if (this._reminderTimerId) { clearTimeout(this._reminderTimerId); this._reminderTimerId = null; }
      const s = load().settings;
      if (!s.notifEnabled || Notification.permission !== "granted") return;
      const [h, m] = (s.notifTime || "19:00").split(":").map(Number);
      const now = new Date();
      let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const delay = next - now;
      const lang = this.getLang();
      this._reminderTimerId = setTimeout(() => {
        try {
          new Notification(lang === "en" ? "Gymak — workout time 💪" : "جيمك — وقت التمرين 💪", {
            body: lang === "en" ? "Don't forget to log today's workout." : "متنساش تسجل تمرينك النهاردة.",
            icon: "icon-192.png",
          });
        } catch (e) {}
        this.scheduleReminder();
      }, delay);
    },

    // كل الأوزان بتتخزن دايمًا بالكيلوجرام؛ الدوال دي بس للعرض/الإدخال حسب وحدة المستخدم
    toDisplayWeight(kg) {
      if (kg == null) return null;
      const unit = load().settings.unit;
      const v = unit === "lb" ? Number(kg) / KG_PER_LB : Number(kg);
      return Math.round(v * 10) / 10;
    },

    fromDisplayWeight(val) {
      const unit = load().settings.unit;
      const n = Number(val);
      if (isNaN(n)) return n;
      const kg = unit === "lb" ? n * KG_PER_LB : n;
      return Math.round(kg * 100) / 100;
    },

    unitLabel() {
      return load().settings.unit === "lb" ? "رطل" : "كجم";
    },

    formatWeight(kg) {
      if (kg == null) return "—";
      const disp = this.toDisplayWeight(kg);
      return disp.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " " + this.unitLabel();
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

    setUsername(username) {
      const s = load();
      const clean = (username || "").trim().replace(/^@+/, "").replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, "");
      s.profile.username = clean.slice(0, 30);
      save(s);
      return s.profile;
    },

    setBio(bio) {
      const s = load();
      s.profile.bio = (bio || "").trim().slice(0, 150);
      save(s);
      return s.profile;
    },

    setAvatar(dataUrl) {
      const s = load();
      const prev = s.profile.avatar;
      s.profile.avatar = dataUrl || null;
      const ok = save(s);
      if (!ok) s.profile.avatar = prev;
      return { ok, profile: s.profile };
    },

    setCover(dataUrl) {
      const s = load();
      const prev = { cover: s.profile.cover, coverGradient: s.profile.coverGradient };
      s.profile.cover = dataUrl || null;
      if (dataUrl) s.profile.coverGradient = null;
      const ok = save(s);
      if (!ok) { s.profile.cover = prev.cover; s.profile.coverGradient = prev.coverGradient; }
      return { ok, profile: s.profile };
    },

    setCoverGradient(gradientId) {
      const s = load();
      s.profile.coverGradient = gradientId || null;
      s.profile.cover = null;
      save(s);
      return s.profile;
    },

    setGender(g) {
      const s = load();
      s.profile.gender = (g === "male" || g === "female") ? g : null;
      save(s);
      return s.profile;
    },

    // ===== Recommended program based on gender (personalization hint, not a rule) =====
    getRecommendedProgramId() {
      const s = load();
      if (s.profile.gender === "female") return "full-body";
      if (s.profile.gender === "male") return "push-pull-legs";
      return null;
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

    // ===== Food / calorie tracking =====
    parseFood(text) {
      return parseFoodText(text);
    },

    logFoodEntries(items) {
      if (!items || !items.length) return null;
      const s = load();
      const date = todayISO();
      const totals = items.reduce((acc, it) => {
        acc.kcal += it.kcal; acc.protein += it.protein; acc.carbs += it.carbs; acc.fat += it.fat;
        return acc;
      }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
      let dayEntry = s.foodLog.find((f) => f.date === date);
      if (!dayEntry) {
        dayEntry = { date, items: [], totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
        s.foodLog.push(dayEntry);
      }
      dayEntry.items.push(...items);
      dayEntry.totalKcal += totals.kcal;
      dayEntry.totalProtein = Math.round((dayEntry.totalProtein + totals.protein) * 10) / 10;
      dayEntry.totalCarbs = Math.round((dayEntry.totalCarbs + totals.carbs) * 10) / 10;
      dayEntry.totalFat = Math.round((dayEntry.totalFat + totals.fat) * 10) / 10;
      save(s);
      return dayEntry;
    },

    getTodayFoodLog() {
      const s = load();
      return s.foodLog.find((f) => f.date === todayISO()) || { date: todayISO(), items: [], totalKcal: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    },

    getDailyCalorieTarget() {
      const s = load();
      const latest = s.weightLogs.at(-1);
      if (!latest) return null;
      const perKgFactor = s.profile.gender === "female" ? 29 : 32;
      let base = latest.weight * perKgFactor;
      const goal = s.goalWeight;
      if (goal != null) {
        if (goal < latest.weight - 1) base -= 400; // cutting
        else if (goal > latest.weight + 1) base += 300; // bulking
      }
      return Math.round(base);
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

    getTotalWorkoutDays() {
      return load().workoutDays.length;
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

    // ===== i18n =====
    t(key) { return tr(key); },
    applyI18n() { applyI18n(); },

    // ===== Danger zone =====
    resetAllData() {
      const fresh = defaultState();
      save(fresh);
      return fresh;
    },
  };

  global.GymakStore = Store;
})(window);
