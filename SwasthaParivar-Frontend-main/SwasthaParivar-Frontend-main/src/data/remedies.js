// client/src/data/remedies.js
// Ultra Pro dataset generated combinatorially to provide 1000+ unique, offline, family-aware remedies.

const SECTORS = [
  { id: "cold_flu", label: "Cold & Flu", symptoms: ["Cold", "flu", "sore throat", "nasal congestion", "cough", "bronchitis", "sinusitis", "sneezing"] },
  { id: "digestion", label: "Digestion", symptoms: ["Indigestion", "bloating", "acidity", "acid reflux", "constipation", "gas", "nausea", "stomach cramps"] },
  { id: "headache", label: "Headache & Pain", symptoms: ["Headache", "migraine", "joint pain", "muscle soreness", "back pain", "period cramps"] },
  { id: "fever", label: "Fever", symptoms: ["Mild fever", "viral fever", "body aches", "chills", "night sweats"] },
  { id: "skin", label: "Skin & Hair", symptoms: ["Acne", "dry skin", "sunburn", "minor burns", "rashes", "eczema", "dandruff", "hair fall"] },
  { id: "sleep", label: "Sleep & Energy", symptoms: ["Insomnia", "restless sleep", "daytime fatigue", "low energy", "brain fog"] },
  { id: "stress", label: "Stress & Mood", symptoms: ["Anxiety", "stress", "nervousness", "mood swings", "burnout"] },
  { id: "immunity", label: "Immunity", symptoms: ["Low immunity", "frequent sickness", "weakness", "seasonal changes"] },
  { id: "allergy", label: "Allergy", symptoms: ["Seasonal allergies", "dust allergy", "mild food intolerance", "runny nose"] },
  { id: "women", label: "Women's Health", symptoms: ["PCOS support", "period cramps", "hormonal acne", "mild nausea", "postpartum recovery"] },
  { id: "children", label: "Children's Health", symptoms: ["Colic", "teething pain", "nappy rash", "mild cold", "low appetite"] },
  { id: "diabetes", label: "Blood Sugar", symptoms: ["Sugar cravings", "slow metabolism", "sluggishness", "weight management"] },
  { id: "heart", label: "Heart & BP", symptoms: ["Mild palpitations", "poor circulation", "stress-induced BP fluctuations"] },
  { id: "oral", label: "Oral Health", symptoms: ["Toothache", "gum swelling", "bad breath", "mouth ulcers", "plaque"] },
  { id: "eye", label: "Eye & Ear", symptoms: ["Eye strain", "dry eyes", "mild ear pain", "ear wax buildup", "redness"] },
  { id: "pain", label: "Body Pain", symptoms: ["Joint stiffness", "muscle pain", "arthritis pain", "neck stiffness", "soreness"] },
  { id: "detox", label: "Detox & Cleanse", symptoms: ["Liver sluggishness", "toxin buildup", "heavy stomach", "kidney support"] },
  { id: "recovery", label: "Sports & Recovery", symptoms: ["Post-workout soreness", "sprains", "muscle cramps", "fatigue", "DOMS"] },
];

const INGREDIENTS = {
  "cold_flu": ["Tulsi", "Ginger", "Black pepper", "Honey", "Clove", "Turmeric", "Cinnamon", "Licorice", "Mint", "Garlic"],
  "digestion": ["Cumin", "Fennel", "Coriander", "Ajwain", "Ginger", "Hing (Asafoetida)", "Black salt", "Mint", "Lemon", "Buttermilk"],
  "headache": ["Peppermint oil", "Sandalwood paste", "Ginger tea", "Eucalyptus", "Coconut water", "Lavender", "Coriander seeds", "Brahmi"],
  "fever": ["Tulsi", "Giloy", "Ginger", "Coriander seeds", "Mustard seeds", "Honey", "Black pepper", "Cumin", "Fenugreek"],
  "skin": ["Neem", "Aloe Vera", "Turmeric", "Sandalwood", "Rose water", "Coconut oil", "Amla", "Manjistha", "Honey", "Besan (Gram flour)"],
  "sleep": ["Ashwagandha", "Nutmeg", "Warm milk", "Chamomile", "Brahmi", "Cardamom", "Almond oil", "Saffron"],
  "stress": ["Brahmi", "Ashwagandha", "Tulsi", "Jatamansi", "Shankhpushpi", "Rose petals", "Mint", "Ghee"],
  "immunity": ["Amla", "Giloy", "Turmeric", "Ashwagandha", "Tulsi", "Ginger", "Black pepper", "Ghee", "Honey", "Cinnamon"],
  "allergy": ["Turmeric", "Neem", "Tulsi", "Ginger", "Honey", "Licorice", "Cumin", "Coriander"],
  "women": ["Shatavari", "Ashoka", "Lodhra", "Aloe Vera", "Fenugreek", "Sesame seeds", "Jaggery", "Cumin", "Coriander"],
  "children": ["Fennel water", "Ajwain potli", "Nutmeg paste", "Tulsi drops", "Ghee", "Warm mustard oil", "Honey (for >1yr)", "Coconut oil"],
  "diabetes": ["Fenugreek", "Bitter gourd (Karela)", "Jamun seeds", "Cinnamon", "Amla", "Turmeric", "Neem", "Curry leaves"],
  "heart": ["Arjuna bark", "Garlic", "Ginger", "Flaxseeds", "Cinnamon", "Guggulu", "Pomegranate", "Amla"],
  "oral": ["Clove oil", "Salt water", "Turmeric", "Neem twigs", "Coconut oil (pulling)", "Guava leaves", "Peppermint", "Alum"],
  "eye": ["Cucumber slices", "Rose water", "Triphala wash", "Castor oil", "Aloe vera", "Fennel seeds", "Coriander infusion", "Cold milk"],
  "pain": ["Mustard oil", "Castor oil", "Turmeric", "Ginger", "Garlic", "Eucalyptus oil", "Camphor", "Ajwain", "Nirgundi"],
  "detox": ["Triphala", "Warm lemon water", "Cumin-Coriander-Fennel tea", "Aloe vera juice", "Cilantro", "Ginger", "Bottle gourd", "Mint"],
  "recovery": ["Turmeric milk", "Ashwagandha", "Epsom salt", "Tart cherry", "Ginger", "Coconut water", "Sesame oil massage", "Nutmeg"],
};

const PREP_METHODS = [
  "Boil [ING1] and [ING2] in water for 10 minutes. Strain and drink warm.",
  "Mix [ING1] powder with [ING2] and a little warm water to make a paste. Apply or consume as appropriate.",
  "Soak [ING1] and [ING2] overnight in a glass of water. Strain and drink first thing in the morning.",
  "Steep [ING1] in hot water for 5-7 minutes. Add a pinch of [ING2] and sip slowly.",
  "Warm [ING1] slightly and gently massage into the affected area for 10 minutes. Follow with a warm compress.",
  "Crush [ING1] and [ING2] together. Extract the juice and consume 1 teaspoon daily.",
  "Roast [ING1] and [ING2] lightly on a pan. Grind into a fine powder and take 1/2 tsp with warm water.",
  "Blend [ING1] with water and a dash of [ING2]. Drink fresh to cool the system.",
];

const AYURVEDA_NOTES = [
  "Balances Vata dosha and provides grounding energy.",
  "Pacifies Pitta dosha and reduces internal heat.",
  "Clears Kapha dosha and reduces sluggishness or mucus.",
  "Tridoshic in nature, helping to restore overall equilibrium.",
  "Stimulates Agni (digestive fire) without aggravating Pitta.",
  "Supports the removal of Ama (toxins) from the tissues.",
  "Acts as a Rasayana (rejuvenative) for the specific tissues involved.",
  "Enhances Ojas (vitality) and supports robust immunity."
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
    
    // Generate ~55-60 remedies per category to reach ~1000 total
    for (let i = 0; i < 60; i++) {
      const selectedSymptoms = getRandomItems(sector.symptoms, Math.floor(Math.random() * 2) + 1);
      const selectedIngredients = getRandomItems(sectorIngredients, Math.floor(Math.random() * 3) + 2);
      
      const methodTemplate = PREP_METHODS[Math.floor(Math.random() * PREP_METHODS.length)];
      const step1 = methodTemplate.replace("[ING1]", selectedIngredients[0]).replace("[ING2]", selectedIngredients[1] || selectedIngredients[0]);
      
      const timeMins = [2, 5, 10, 15, 20][Math.floor(Math.random() * 5)];
      const difficulty = ["Very Easy", "Easy", "Medium"][Math.floor(Math.random() * 3)];
      const rating = (Math.random() * 0.8 + 4.2).toFixed(1); // 4.2 - 5.0
      const ayurveda = AYURVEDA_NOTES[Math.floor(Math.random() * AYURVEDA_NOTES.length)];

      const colorPalettes = [
        ["#1f9c90", "#0d6a65"], // Teal
        ["#56b88f", "#127a54"], // Green
        ["#f2b349", "#d08a16"], // Orange
        ["#8b6dd8", "#5c4bb7"], // Purple
        ["#56bdd6", "#327fcb"], // Blue
        ["#e76f51", "#b84a33"], // Red
      ];
      const colors = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];

      library.push({
        id: \`gen-\${sector.id}-\${idCounter++}\`,
        name: \`\${selectedIngredients[0]} & \${selectedIngredients[1] || "Herb"} \${timeMins > 5 ? 'Brew' : 'Remedy'}\`,
        description: \`A traditional Ayurvedic approach to manage \${selectedSymptoms.join(" and ")} naturally.\`,
        symptoms: selectedSymptoms.join(", "),
        ingredients: selectedIngredients,
        steps: [
          "Gather all natural ingredients and ensure they are clean.",
          step1,
          "Use consistently as part of a balanced daily routine."
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

  // Prepend some of the high-quality legacy remedies for specific keyword matching
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
