// client/src/data/remedies.js
// Ultra Pro dataset generated combinatorially to provide 2500+ unique, offline, family-aware remedies.

const SECTORS = [
  { id: "cold_flu", label: "Cold & Flu", symptoms: ["Cold", "flu", "sore throat", "nasal congestion", "cough", "bronchitis", "sinusitis", "sneezing", "post-nasal drip"] },
  { id: "digestion", label: "Digestion", symptoms: ["Indigestion", "bloating", "acidity", "acid reflux", "constipation", "gas", "nausea", "stomach cramps", "heavy stomach", "IBS symptoms"] },
  { id: "headache", label: "Headache & Pain", symptoms: ["Headache", "migraine", "tension headache", "joint pain", "muscle soreness", "back pain", "period cramps", "neck stiffness"] },
  { id: "fever", label: "Fever", symptoms: ["Mild fever", "viral fever", "body aches", "chills", "night sweats", "heat exhaustion"] },
  { id: "skin", label: "Skin & Hair", symptoms: ["Acne", "dry skin", "sunburn", "minor burns", "rashes", "eczema", "dandruff", "hair fall", "dark circles", "cracked lips", "fungal infection"] },
  { id: "sleep", label: "Sleep & Energy", symptoms: ["Insomnia", "restless sleep", "daytime fatigue", "low energy", "brain fog", "waking up tired"] },
  { id: "stress", label: "Stress & Mood", symptoms: ["Anxiety", "stress", "nervousness", "mood swings", "burnout", "mental fatigue", "restlessness"] },
  { id: "immunity", label: "Immunity", symptoms: ["Low immunity", "frequent sickness", "weakness", "seasonal changes", "chronic fatigue"] },
  { id: "allergy", label: "Allergy", symptoms: ["Seasonal allergies", "dust allergy", "mild food intolerance", "runny nose", "itchy eyes", "hives"] },
  { id: "women", label: "Women's Health", symptoms: ["PCOS support", "period cramps", "hormonal acne", "mild nausea", "postpartum recovery", "hot flashes", "leucorrhoea"] },
  { id: "children", label: "Children's Health", symptoms: ["Colic", "teething pain", "nappy rash", "mild cold", "low appetite", "bedwetting", "constipation in toddlers"] },
  { id: "diabetes", label: "Blood Sugar", symptoms: ["Sugar cravings", "slow metabolism", "sluggishness", "weight management", "energy crashes"] },
  { id: "heart", label: "Heart & BP", symptoms: ["Mild palpitations", "poor circulation", "stress-induced BP fluctuations", "heavy chest (stress)"] },
  { id: "oral", label: "Oral Health", symptoms: ["Toothache", "gum swelling", "bad breath", "mouth ulcers", "plaque", "sensitive teeth"] },
  { id: "eye", label: "Eye & Ear", symptoms: ["Eye strain", "dry eyes", "mild ear pain", "ear wax buildup", "redness", "itchy ears"] },
  { id: "pain", label: "Body Pain", symptoms: ["Joint stiffness", "muscle pain", "arthritis pain", "neck stiffness", "soreness", "nerve pain"] },
  { id: "detox", label: "Detox & Cleanse", symptoms: ["Liver sluggishness", "toxin buildup", "heavy stomach", "kidney support", "water retention"] },
  { id: "recovery", label: "Sports & Recovery", symptoms: ["Post-workout soreness", "sprains", "muscle cramps", "fatigue", "DOMS", "joint wear"] },
];

const INGREDIENTS = {
  "cold_flu": ["Tulsi", "Ginger", "Black pepper", "Honey", "Clove", "Turmeric", "Cinnamon", "Licorice", "Mint", "Garlic", "Long pepper (Pippali)", "Cardamom", "Eucalyptus", "Nutmeg"],
  "digestion": ["Cumin", "Fennel", "Coriander", "Ajwain", "Ginger", "Hing (Asafoetida)", "Black salt", "Mint", "Lemon", "Buttermilk", "Triphala", "Cardamom", "Jaggery", "Ghee"],
  "headache": ["Peppermint oil", "Sandalwood paste", "Ginger tea", "Eucalyptus", "Coconut water", "Lavender", "Coriander seeds", "Brahmi", "Nutmeg", "Rose water"],
  "fever": ["Tulsi", "Giloy", "Ginger", "Coriander seeds", "Mustard seeds", "Honey", "Black pepper", "Cumin", "Fenugreek", "Neem", "Amla"],
  "skin": ["Neem", "Aloe Vera", "Turmeric", "Sandalwood", "Rose water", "Coconut oil", "Amla", "Manjistha", "Honey", "Besan (Gram flour)", "Multani Mitti", "Curd", "Saffron", "Castor oil"],
  "sleep": ["Ashwagandha", "Nutmeg", "Warm milk", "Chamomile", "Brahmi", "Cardamom", "Almond oil", "Saffron", "Jatamansi", "Tagar", "Ghee"],
  "stress": ["Brahmi", "Ashwagandha", "Tulsi", "Jatamansi", "Shankhpushpi", "Rose petals", "Mint", "Ghee", "Gotu Kola", "Sandalwood"],
  "immunity": ["Amla", "Giloy", "Turmeric", "Ashwagandha", "Tulsi", "Ginger", "Black pepper", "Ghee", "Honey", "Cinnamon", "Shatavari", "Chyawanprash herbs"],
  "allergy": ["Turmeric", "Neem", "Tulsi", "Ginger", "Honey", "Licorice", "Cumin", "Coriander", "Black seed (Kalonji)", "Giloy"],
  "women": ["Shatavari", "Ashoka", "Lodhra", "Aloe Vera", "Fenugreek", "Sesame seeds", "Jaggery", "Cumin", "Coriander", "Fennel", "Saffron", "Rose petals"],
  "children": ["Fennel water", "Ajwain potli", "Nutmeg paste", "Tulsi drops", "Ghee", "Warm mustard oil", "Honey (for >1yr)", "Coconut oil", "Cardamom", "Raisins"],
  "diabetes": ["Fenugreek", "Bitter gourd (Karela)", "Jamun seeds", "Cinnamon", "Amla", "Turmeric", "Neem", "Curry leaves", "Gymnema (Gudmar)", "Aloe Vera"],
  "heart": ["Arjuna bark", "Garlic", "Ginger", "Flaxseeds", "Cinnamon", "Guggulu", "Pomegranate", "Amla", "Cardamom", "Rose petals"],
  "oral": ["Clove oil", "Salt water", "Turmeric", "Neem twigs", "Coconut oil (pulling)", "Guava leaves", "Peppermint", "Alum", "Sesame oil", "Triphala"],
  "eye": ["Cucumber slices", "Rose water", "Triphala wash", "Castor oil", "Aloe vera", "Fennel seeds", "Coriander infusion", "Cold milk", "Ghee (Netra Tarpana)"],
  "pain": ["Mustard oil", "Castor oil", "Turmeric", "Ginger", "Garlic", "Eucalyptus oil", "Camphor", "Ajwain", "Nirgundi", "Ashwagandha", "Guggulu", "Sesame oil"],
  "detox": ["Triphala", "Warm lemon water", "Cumin-Coriander-Fennel tea", "Aloe vera juice", "Cilantro", "Ginger", "Bottle gourd", "Mint", "Neem", "Amla"],
  "recovery": ["Turmeric milk", "Ashwagandha", "Epsom salt", "Tart cherry", "Ginger", "Coconut water", "Sesame oil massage", "Nutmeg", "Ghee", "Shatavari"],
};

const PREP_METHODS = [
  "Boil [ING1] and [ING2] in 2 cups of water until it reduces to half. Strain and drink warm.",
  "Mix [ING1] powder with [ING2] and a little warm water to make a thick paste. Apply or consume as appropriate.",
  "Soak [ING1] and [ING2] overnight in a glass of water. Strain and drink first thing in the morning on an empty stomach.",
  "Steep [ING1] in hot water for 5-7 minutes. Add a pinch of [ING2], cover for 2 minutes, and sip slowly.",
  "Warm [ING1] slightly and gently massage into the affected area for 10-15 minutes using circular motions. Follow with a warm compress.",
  "Crush fresh [ING1] and [ING2] together in a mortar. Extract the fresh juice and consume 1 teaspoon daily.",
  "Dry roast [ING1] and [ING2] lightly on a pan. Grind into a fine powder and take 1/2 tsp with warm water after meals.",
  "Blend [ING1] with water and a dash of [ING2]. Drink fresh to instantly cool and soothe the system.",
  "Simmer [ING1] in warm plant or dairy milk for 5 minutes. Stir in [ING2] right before turning off the heat. Drink before bedtime.",
  "Create a steam bath using [ING1] leaves or oil. Drape a towel over your head and inhale deeply for 5 minutes. Keep [ING2] nearby for additional relief.",
  "Mix 1 part [ING1] with 2 parts [ING2] in a small jar. Take a pinch of this mixture sublingually (under the tongue) whenever symptoms arise.",
  "Dilute a few drops of [ING1] into a carrier base like [ING2] oil. Apply to the pulse points and temples for rapid absorption.",
  "Brew a strong tea from [ING1]. Let it cool completely, then use it as a rinse or wash, optionally mixing in [ING2] for enhanced effects.",
  "Chew slowly on raw [ING1] along with a small piece of [ING2] to release the active compounds directly into your salivary glands."
];

const AYURVEDA_NOTES = [
  "Balances Vata dosha, provides grounding energy, and calms the nervous system.",
  "Pacifies Pitta dosha, reduces internal heat, and soothes inflammatory responses.",
  "Clears Kapha dosha, reduces sluggishness, and effectively cuts through thick mucus.",
  "Tridoshic in nature, helping to restore overall equilibrium to the mind and body.",
  "Stimulates Agni (digestive fire) without aggravating Pitta, ensuring proper nutrient absorption.",
  "Supports the removal of Ama (toxins) from the deep tissues and cellular level.",
  "Acts as a Rasayana (rejuvenative) for the specific tissues involved, slowing degeneration.",
  "Enhances Ojas (vitality), builds profound physical endurance, and supports robust immunity.",
  "Possesses strong Medhya (intellect-promoting) properties, clearing brain fog and enhancing focus.",
  "Functions as a mild Lekhana (scraping) agent to gently remove excess fat and stagnation.",
  "Exhibits Srotoshodhaka qualities, clearing the microchannels of the body for better circulation.",
  "Deeply nourishes the Majja Dhatu (bone marrow and nervous tissue), promoting systemic calm."
];

function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function generateRemedies() {
  const library = [];
  let idCounter = 1;

  for (const sector of SECTORS) {
    const sectorIngredients = INGREDIENTS[sector.id] || INGREDIENTS["immunity"];
    
    // Generate ~150 remedies per category to reach ~2700 total
    for (let i = 0; i < 150; i++) {
      const selectedSymptoms = getRandomItems(sector.symptoms, Math.floor(Math.random() * 3) + 1);
      const selectedIngredients = getRandomItems(sectorIngredients, Math.floor(Math.random() * 3) + 2);
      
      const methodTemplate = PREP_METHODS[Math.floor(Math.random() * PREP_METHODS.length)];
      const step1 = methodTemplate.replace("[ING1]", selectedIngredients[0]).replace("[ING2]", selectedIngredients[1] || selectedIngredients[0]);
      
      const timeMins = [2, 5, 8, 10, 15, 20, 30][Math.floor(Math.random() * 7)];
      const difficulty = ["Very Easy", "Easy", "Medium"][Math.floor(Math.random() * 3)];
      const rating = (Math.random() * 0.6 + 4.4).toFixed(1); // 4.4 - 5.0
      const ayurveda = AYURVEDA_NOTES[Math.floor(Math.random() * AYURVEDA_NOTES.length)];

      const colorPalettes = [
        ["#1f9c90", "#0d6a65"], // Teal
        ["#56b88f", "#127a54"], // Green
        ["#f2b349", "#d08a16"], // Orange
        ["#8b6dd8", "#5c4bb7"], // Purple
        ["#56bdd6", "#327fcb"], // Blue
        ["#e76f51", "#b84a33"], // Red
        ["#2a9d8f", "#21867a"], // Deep Aqua
        ["#e9c46a", "#c7a552"], // Golden Sand
      ];
      const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      const prepNameBase = timeMins > 10 ? (Math.random() > 0.5 ? 'Brew' : 'Decoction') : (Math.random() > 0.5 ? 'Remedy' : 'Infusion');

      library.push({
        id: \`gen-\${sector.id}-\${idCounter++}\`,
        name: \`\${selectedIngredients[0]} & \${selectedIngredients[1] || "Herb"} \${prepNameBase}\`,
        description: \`A traditional Ayurvedic approach utilizing \${selectedIngredients[0].toLowerCase()} to manage \${selectedSymptoms.join(" and ")} naturally.\`,
        symptoms: selectedSymptoms.join(", "),
        ingredients: selectedIngredients,
        steps: [
          "Gather all natural ingredients and ensure they are clean and fresh.",
          step1,
          "Use consistently as part of a balanced daily routine for best results.",
          timeMins > 5 ? "If symptoms persist beyond 3-5 days, consider consulting a practitioner." : "Store any excess in an airtight container for up to 24 hours."
        ],
        rating: Number(rating),
        tags: [sector.label, ...selectedSymptoms.map(s => s.charAt(0).toUpperCase() + s.slice(1))],
        timeMins,
        difficulty,
        ayurveda,
        colorFrom: colors[0],
        colorTo: colors[1],
        source: "catalog"
      });
    }
  }

  // Prepend legacy, highly curated remedies
  const legacyRemedies = [
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
      tags: ["Immunity", "Cold & Flu"],
      timeMins: 12,
      difficulty: "Easy",
      ayurveda: "Tulsi balances Kapha & Vata; antimicrobial and immune-supporting.",
      colorFrom: "var(--color-success)",
      colorTo: "var(--color-success)",
      source: "catalog"
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
      tags: ["Immunity", "Body Pain"],
      timeMins: 8,
      difficulty: "Easy",
      ayurveda: "Anti-inflammatory; boosts Ojas and supports recovery.",
      colorFrom: "var(--color-accent)",
      colorTo: "var(--color-warning)",
      source: "catalog"
    }
  ];

  return [...legacyRemedies, ...library];
}

const REMEDIES = generateRemedies();

export default REMEDIES;
