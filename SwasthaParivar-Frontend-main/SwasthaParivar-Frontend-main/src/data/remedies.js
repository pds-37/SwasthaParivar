// client/src/data/remedies.js
// Ultra Pro dataset (30 items). You can extend later.
// Each remedy has: id, name, symptoms, ingredients[], steps[], rating, tags[], timeMins, difficulty, ayurveda, colorFrom, colorTo

const REMEDIES = [
  {
    id: "r1",
    name: "Tulsi Kadha",
    symptoms: "Cold, cough, chest congestion",
    ingredients: ["Tulsi leaves", "Ginger", "Black pepper", "Honey"],
    steps: [
      "Crush tulsi leaves and ginger slightly.",
      "Boil water and add ingredients.",
      "Simmer for 8–10 minutes, strain and add honey.",
      "Drink warm, 2 times a day during symptoms."
    ],
    rating: 4.9,
    tags: ["Immunity", "Cold", "Cough"],
    timeMins: 12,
    difficulty: "Easy",
    ayurveda: "Tulsi balances Kapha & Vata; antimicrobial and immune-supporting.",
    colorFrom: "#79d38d",
    colorTo: "#2e7d32"
  },
  {
    id: "r2",
    name: "Turmeric Golden Milk",
    symptoms: "Inflammation, mild pain, immunity",
    ingredients: ["Milk (or plant milk)", "Turmeric", "Black pepper", "Ghee"],
    steps: [
      "Warm milk on low heat.",
      "Whisk in turmeric & black pepper.",
      "Add ghee/honey and drink warm before bed."
    ],
    rating: 4.9,
    tags: ["Immunity", "Inflammation"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda: "Anti-inflammatory; boosts Ojas and supports recovery.",
    colorFrom: "#f6bd60",
    colorTo: "#f59e0b"
  },
  {
    id: "r3",
    name: "Ginger-Lemon Honey Tea",
    symptoms: "Nausea, cold, digestion",
    ingredients: ["Fresh ginger", "Lemon", "Honey", "Water"],
    steps: [
      "Slice ginger and steep in hot water for 5 minutes.",
      "Add lemon juice and honey when slightly cool.",
      "Sip slowly to soothe throat and stomach."
    ],
    rating: 4.8,
    tags: ["Digestion", "Cold"],
    timeMins: 6,
    difficulty: "Very Easy",
    ayurveda: "Stimulates digestion (Agni) and clears mucus.",
    colorFrom: "#fb923c",
    colorTo: "#f97316"
  },
  {
    id: "r4",
    name: "Triphala Water",
    symptoms: "Constipation, detox, digestion",
    ingredients: ["Triphala powder", "Warm water"],
    steps: [
      "Mix triphala powder in warm water and let sit overnight for a stronger extract.",
      "Strain and drink in the morning on empty stomach."
    ],
    rating: 4.7,
    tags: ["Digestion", "Detox"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda: "Balances all three doshas and gently cleanses the digestive tract.",
    colorFrom: "#0ea5a4",
    colorTo: "#2dd4bf"
  },
  {
    id: "r5",
    name: "Cumin-Coriander-Fennel (CCF) Infusion",
    symptoms: "Bloating, gas, indigestion",
    ingredients: ["Cumin", "Coriander", "Fennel", "Water"],
    steps: [
      "Roast the spices lightly and boil in water for 8–10 minutes.",
      "Strain and drink warm after meals."
    ],
    rating: 4.6,
    tags: ["Digestion"],
    timeMins: 12,
    difficulty: "Easy",
    ayurveda: "Carminative and soothing for the gut.",
    colorFrom: "#f59e0b",
    colorTo: "#fbbf24"
  },
  {
    id: "r6",
    name: "Ashwagandha Milk",
    symptoms: "Stress, insomnia, fatigue",
    ingredients: ["Milk", "Ashwagandha powder", "Honey", "Nutmeg"],
    steps: [
      "Warm milk; whisk in ashwagandha powder.",
      "Simmer 2–3 minutes, add honey before serving.",
      "Drink before bedtime for recovery."
    ],
    rating: 4.9,
    tags: ["Stress", "Sleep"],
    timeMins: 10,
    difficulty: "Easy",
    ayurveda: "A rejuvenating Rasayana that calms the nervous system.",
    colorFrom: "#7c3aed",
    colorTo: "#a78bfa"
  },
  {
    id: "r7",
    name: "Honey-Ginger Shot",
    symptoms: "Sore throat, cough",
    ingredients: ["Fresh ginger juice", "Honey", "Black pepper"],
    steps: [
      "Mix ginger juice with honey and a pinch of black pepper.",
      "Consume once daily to relieve throat irritation."
    ],
    rating: 4.8,
    tags: ["Throat", "Cold"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Anti-mucolytic and soothing for throat tissues.",
    colorFrom: "#ef4444",
    colorTo: "#fb7185"
  },
  {
    id: "r8",
    name: "Warm Sesame Oil Foot Massage",
    symptoms: "Insomnia, restlessness",
    ingredients: ["Sesame oil (warm)"],
    steps: [
      "Warm the oil slightly and massage feet for 10–15 minutes.",
      "Wear socks to retain warmth and rest."
    ],
    rating: 4.6,
    tags: ["Relaxation", "Sleep"],
    timeMins: 15,
    difficulty: "Easy",
    ayurveda: "Grounding for Vata and promotes restful sleep.",
    colorFrom: "#f97316",
    colorTo: "#fb923c"
  },
  {
    id: "r9",
    name: "Neem Water (Detox)",
    symptoms: "Skin issues, blood detox",
    ingredients: ["Neem leaves", "Water"],
    steps: [
      "Boil neem leaves and cool.",
      "Use as topical rinse or drink a small amount (consult practitioner)."
    ],
    rating: 4.7,
    tags: ["Skin", "Detox"],
    timeMins: 10,
    difficulty: "Easy",
    ayurveda: "Antimicrobial and blood-purifying.",
    colorFrom: "#10b981",
    colorTo: "#34d399"
  },
  {
    id: "r10",
    name: "Licorice (Mulethi) Tea",
    symptoms: "Sore throat, dry cough",
    ingredients: ["Licorice root", "Water"],
    steps: [
      "Simmer licorice in water for 5 minutes and sip warm.",
      "Avoid long-term excessive use if hypertensive."
    ],
    rating: 4.5,
    tags: ["Throat"],
    timeMins: 6,
    difficulty: "Easy",
    ayurveda: "Demulcent that soothes mucous membranes.",
    colorFrom: "#ef4444",
    colorTo: "#fb7185"
  },
  {
    id: "r11",
    name: "Coconut Oil Pulling",
    symptoms: "Bad breath, oral hygiene",
    ingredients: ["Coconut oil"],
    steps: [
      "Swish 1 tbsp oil for 8-12 minutes, spit in trash, rinse.",
      "Do not swallow; use daily for oral hygiene."
    ],
    rating: 4.4,
    tags: ["Oral"],
    timeMins: 12,
    difficulty: "Easy",
    ayurveda: "Supports oral mucosa hygiene and reduces microbial load.",
    colorFrom: "#fb7185",
    colorTo: "#f472b6"
  },
  {
    id: "r12",
    name: "Fennel Tea",
    symptoms: "Bloating, menstrual cramps, digestion",
    ingredients: ["Fennel seeds", "Water"],
    steps: ["Crush seeds, boil for 5 minutes, strain and drink."],
    rating: 4.7,
    tags: ["Digestion", "Women"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda: "Carminative and soothing.",
    colorFrom: "#14b8a6",
    colorTo: "#34d399"
  },
  {
    id: "r13",
    name: "Cinnamon-Honey Tonic",
    symptoms: "Cold, low energy, metabolic support",
    ingredients: ["Cinnamon powder", "Honey", "Warm water"],
    steps: [
      "Mix cinnamon in warm water and add honey.",
      "Sip slowly on empty stomach."
    ],
    rating: 4.6,
    tags: ["Metabolic", "Immunity"],
    timeMins: 5,
    difficulty: "Very Easy",
    ayurveda: "Warming tonic that supports digestion & circulation.",
    colorFrom: "#ef4444",
    colorTo: "#f97316"
  },
  {
    id: "r14",
    name: "Ajwain Hot Water",
    symptoms: "Indigestion, sore throat",
    ingredients: ["Ajwain (carom seeds)", "Water"],
    steps: ["Boil ajwain for 3-4 minutes and drink warm."],
    rating: 4.5,
    tags: ["Digestion"],
    timeMins: 5,
    difficulty: "Very Easy",
    ayurveda: "Reduces Kapha and stimulates Agni.",
    colorFrom: "#f59e0b",
    colorTo: "#fbbf24"
  },
  {
    id: "r15",
    name: "Curry Leaves Juice",
    symptoms: "Hair fall, weak roots",
    ingredients: ["Curry leaves", "Water"],
    steps: [
      "Blend curry leaves, strain and drink daily.",
      "Can also be applied topically for hair strength."
    ],
    rating: 4.6,
    tags: ["Hair"],
    timeMins: 6,
    difficulty: "Easy",
    ayurveda: "Nourishing for hair and digestion.",
    colorFrom: "#2dd4bf",
    colorTo: "#14b8a6"
  },
  {
    id: "r16",
    name: "Warm Lemon-Ginger Detox",
    symptoms: "Bloating, sluggishness",
    ingredients: ["Ginger", "Lemon", "Warm water"],
    steps: ["Steep ginger in warm water, add lemon and sip slowly."],
    rating: 4.5,
    tags: ["Detox"],
    timeMins: 6,
    difficulty: "Very Easy",
    ayurveda: "Stimulates digestion and metabolism.",
    colorFrom: "#fb923c",
    colorTo: "#f97316"
  },
  {
    id: "r17",
    name: "Sesame Oil Nasal Drops (Anu Taila style)",
    symptoms: "Sinus dryness, Vata imbalance",
    ingredients: ["Sesame oil (medical grade)"],
    steps: [
      "Warm a drop or two of oil slightly and apply into nostrils as advised by a practitioner."
    ],
    rating: 4.4,
    tags: ["Nasal", "Vata"],
    timeMins: 2,
    difficulty: "Easy",
    ayurveda: "Lubricates nasal mucosa and balances Vata.",
    colorFrom: "#f59e0b",
    colorTo: "#f97316"
  },
  {
    id: "r18",
    name: "Warm Ghee on Roti",
    symptoms: "Constipation, weak digestion",
    ingredients: ["Ghee", "Chapati (warm)"],
    steps: ["Spread ghee on hot roti and consume."],
    rating: 4.6,
    tags: ["Digestion"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Boosts Agni and nourishes tissues.",
    colorFrom: "#f6bd60",
    colorTo: "#f59e0b"
  },
  {
    id: "r19",
    name: "Cardamom Milk",
    symptoms: "Relaxation, digestion support",
    ingredients: ["Milk", "Cardamom pods"],
    steps: ["Warm milk with crushed cardamom and drink before bed."],
    rating: 4.7,
    tags: ["Sleep", "Digestion"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda: "Soothes nerves and supports digestion.",
    colorFrom: "#f59e0b",
    colorTo: "#fb923c"
  },
  {
    id: "r20",
    name: "Neem Paste (Topical)",
    symptoms: "Acne, skin irritation",
    ingredients: ["Fresh Neem leaves"],
    steps: ["Make fresh paste, apply for 10-15 minutes, rinse."],
    rating: 4.7,
    tags: ["Skin"],
    timeMins: 12,
    difficulty: "Easy",
    ayurveda: "Antimicrobial and cooling.",
    colorFrom: "#10b981",
    colorTo: "#34d399"
  },
  {
    id: "r21",
    name: "Pepper-Turmeric Gargle",
    symptoms: "Sore throat, mild infection",
    ingredients: ["Turmeric", "Black pepper", "Warm water"],
    steps: ["Dissolve a pinch of turmeric and pepper in warm water and gargle."],
    rating: 4.5,
    tags: ["Throat"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Anti-inflammatory and antimicrobial.",
    colorFrom: "#f97316",
    colorTo: "#f59e0b"
  },
  {
    id: "r22",
    name: "Coconut Water + Lemon",
    symptoms: "Hydration, skin glow",
    ingredients: ["Coconut water", "Lemon"],
    steps: ["Mix and drink fresh."],
    rating: 4.8,
    tags: ["Hydration"],
    timeMins: 1,
    difficulty: "Very Easy",
    ayurveda: "Rehydrates body and cools Pitta.",
    colorFrom: "#93c5fd",
    colorTo: "#60a5fa"
  },
  {
    id: "r23",
    name: "Clove Steam Inhalation",
    symptoms: "Congestion, sinus",
    ingredients: ["Cloves", "Hot water"],
    steps: ["Boil cloves, inhale steam for 3-4 minutes."],
    rating: 4.6,
    tags: ["Respiratory"],
    timeMins: 6,
    difficulty: "Very Easy",
    ayurveda: "Opens nasal passages and reduces Kapha.",
    colorFrom: "#fb7185",
    colorTo: "#f472b6"
  },
  {
    id: "r24",
    name: "Mulethi (Licorice) Soother",
    symptoms: "Throat pain, cough",
    ingredients: ["Licorice root", "Water"],
    steps: ["Simmer licorice for 5 minutes and sip warm."],
    rating: 4.6,
    tags: ["Throat"],
    timeMins: 5,
    difficulty: "Easy",
    ayurveda: "Demulcent that soothes mucosa.",
    colorFrom: "#ef4444",
    colorTo: "#fb7185"
  },
  {
    id: "r25",
    name: "Ginger-Honey Paste",
    symptoms: "Mild cold, nausea",
    ingredients: ["Ginger paste", "Honey"],
    steps: ["Mix and take 1/2 tsp as needed."],
    rating: 4.7,
    tags: ["Cold", "Nausea"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Stimulates digestion and clears mucus.",
    colorFrom: "#f97316",
    colorTo: "#fb923c"
  },
  {
    id: "r26",
    name: "Warm Mustard Oil Massage",
    symptoms: "Joint pain, stiffness",
    ingredients: ["Mustard oil"],
    steps: ["Warm and massage into joints for 10 minutes."],
    rating: 4.6,
    tags: ["Pain"],
    timeMins: 15,
    difficulty: "Easy",
    ayurveda: "Stimulating and warming for circulation.",
    colorFrom: "#f59e0b",
    colorTo: "#fbbf24"
  },
  {
    id: "r27",
    name: "Banana + Cardamom (Sleep Snack)",
    symptoms: "Insomnia",
    ingredients: ["Banana", "Cardamom"],
    steps: ["Mash banana with a pinch of cardamom and eat before bed."],
    rating: 4.8,
    tags: ["Sleep"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Soothing and nourishing for nervous system.",
    colorFrom: "#f6bd60",
    colorTo: "#f59e0b"
  },
  {
    id: "r28",
    name: "Warm Salt Water Gargle",
    symptoms: "Sore throat, mouth ulcers",
    ingredients: ["Salt", "Warm water"],
    steps: ["Gargle with warm salt water 2-3 times daily."],
    rating: 4.5,
    tags: ["Throat", "Oral"],
    timeMins: 2,
    difficulty: "Very Easy",
    ayurveda: "Reduces local inflammation and soothes tissues.",
    colorFrom: "#93c5fd",
    colorTo: "#60a5fa"
  },
  {
    id: "r29",
    name: "Trikatu Shot (Pepper-Ginger-Long Pepper)",
    symptoms: "Slow digestion, sluggish Agni",
    ingredients: ["Black pepper", "Long pepper", "Ginger"],
    steps: [
      "Grind small amounts of ingredients into a fine paste and take in tiny doses with warm water (consult before use)."
    ],
    rating: 4.3,
    tags: ["Digestion"],
    timeMins: 3,
    difficulty: "Intermediate",
    ayurveda: "Stimulates metabolic fire and clears Ama.",
    colorFrom: "#ef4444",
    colorTo: "#f97316"
  },
  {
    id: "r30",
    name: "Triphala Night Soak",
    symptoms: "Constipation, toxin removal",
    ingredients: ["Triphala powder", "Water"],
    steps: ["Soak triphala in water overnight and drink in morning on empty stomach."],
    rating: 4.7,
    tags: ["Digestion", "Detox"],
    timeMins: 8,
    difficulty: "Easy",
    ayurveda: "Gentle detox and bowel regulator.",
    colorFrom: "#0ea5a4",
    colorTo: "#2dd4bf"
  }
];

export default REMEDIES;
