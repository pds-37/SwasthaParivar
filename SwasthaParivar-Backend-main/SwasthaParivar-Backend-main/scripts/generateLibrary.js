import mongoose from "mongoose";
import dotenv from "dotenv";
import { generateGeminiText } from "../services/ai/geminiService.js";
import LibraryRemedy from "../models/libraryremedymodel.js";
import { connectDB } from "../utils/db.js";

dotenv.config();

const SECTORS = [
  { id: "cold_flu", label: "Cold & Flu", covers: "Respiratory, cough, throat" },
  { id: "digestion", label: "Digestion", covers: "Gut, acidity, nausea" },
  { id: "headache", label: "Headache & Pain", covers: "Head, joint, muscle, period" },
  { id: "fever", label: "Fever", covers: "All fever types" },
  { id: "skin", label: "Skin & Hair", covers: "Acne, burns, hair" },
  { id: "sleep", label: "Sleep & Energy", covers: "Insomnia, fatigue" },
  { id: "stress", label: "Stress & Mood", covers: "Anxiety, burnout" },
  { id: "immunity", label: "Immunity", covers: "Prevention, boosters" },
  { id: "allergy", label: "Allergy", covers: "Seasonal, dust, food" },
  { id: "women", label: "Women's Health", covers: "PCOS, periods, pregnancy" },
  { id: "children", label: "Children's Health", covers: "Kids & infants" },
  { id: "diabetes", label: "Blood Sugar", covers: "Type 2 dietary support" },
  { id: "heart", label: "Heart & BP", covers: "Circulation, blood pressure" },
  { id: "oral", label: "Oral Health", covers: "Teeth, gums, breath" },
  { id: "eye", label: "Eye & Ear", covers: "Strain, infection, wax" },
  { id: "pain", label: "Body Pain", covers: "Joints, muscles, back" },
  { id: "detox", label: "Detox & Cleanse", covers: "Liver, kidney, gut" },
  { id: "recovery", label: "Sports & Recovery", covers: "DOMS, sprains, cramps" },
];

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  console.log("Connecting to Database...");
  await connectDB();
  console.log("Connected.");

  const BATCH_SIZE = 15;
  const TOTAL_PER_SECTOR = 55; // 18 sectors * 55 = 990 remedies (~1000)
  
  let totalSaved = 0;

  for (const sector of SECTORS) {
    console.log(`\n--- Starting generation for sector: ${sector.label} ---`);
    let sectorCount = 0;

    while (sectorCount < TOTAL_PER_SECTOR) {
      console.log(`Generating batch for ${sector.label} (${sectorCount}/${TOTAL_PER_SECTOR})...`);
      
      const prompt = `
Generate a diverse array of ${BATCH_SIZE} unique home remedies or health practices for the category: "${sector.label}" (covers: ${sector.covers}).
Ensure these are medically safe, mostly Ayurvedic, herbal, or natural home-based remedies.
Do NOT repeat remedies. Make sure each one is distinct (e.g. different main ingredient, different specific symptom).

Respond ONLY with a valid JSON array of objects. No markdown formatting, no backticks, just raw JSON.
Each object must have the following schema:
{
  "name": "String (e.g. 'Ginger Turmeric Tea')",
  "description": "String (1-2 sentences)",
  "symptoms": "String (e.g. 'Dry cough, sore throat')",
  "ingredients": ["Array of Strings"],
  "steps": ["Array of Strings for preparation"],
  "rating": Number (between 4.0 and 5.0),
  "tags": ["Array of Strings, MUST include '${sector.label}'"],
  "timeMins": Number (preparation time in minutes),
  "difficulty": "String (Easy, Medium, or Hard)",
  "ayurveda": "String (Ayurvedic perspective, dosha impact, 1 sentence)"
}
`;

      try {
        const { text } = await generateGeminiText(prompt, { mode: "remedy-generation" });
        const cleanedText = text.replace(/```json/gi, "").replace(/```/gi, "").trim();
        const remedies = JSON.parse(cleanedText);
        
        if (!Array.isArray(remedies)) throw new Error("Not an array");

        const ops = remedies.map((r) => {
          const id = \`gen-\${Date.now()}-\${Math.random().toString(36).substr(2, 9)}\`;
          return {
            insertOne: {
              document: {
                id,
                name: r.name,
                description: r.description,
                symptoms: r.symptoms,
                ingredients: r.ingredients,
                steps: r.steps,
                rating: r.rating || 4.5,
                tags: r.tags || [sector.label],
                timeMins: r.timeMins || 10,
                difficulty: r.difficulty || "Easy",
                ayurveda: r.ayurveda || "",
                colorFrom: "#1f9c90",
                colorTo: "#0d6a65",
              }
            }
          };
        });

        await LibraryRemedy.bulkWrite(ops);
        sectorCount += remedies.length;
        totalSaved += remedies.length;
        
        console.log(\`✅ Saved \${remedies.length} remedies for \${sector.label}. Total overall: \${totalSaved}\`);
        
        // Wait 3 seconds to avoid rate limiting
        await sleep(3000);

      } catch (err) {
        console.error(\`❌ Error generating batch: \${err.message}\`);
        console.log("Waiting 10 seconds before retrying...");
        await sleep(10000);
      }
    }
  }

  console.log(\`\n🎉 Finished! Successfully generated and saved \${totalSaved} remedies.\`);
  process.exit(0);
}

run();
