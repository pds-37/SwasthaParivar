import dotenv from "dotenv";
dotenv.config();

import { GoogleGenerativeAI } from "@google/generative-ai";

async function test() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    tools: [{
      googleSearch: {}
    }]
  });

  try {
    const result = await model.generateContent("Give me a remedy for VITAMIN B12 DEFICIENCY");
    console.log("Success with googleSearch:", result.response.text().slice(0, 100));
  } catch (err) {
    console.error("Error with googleSearch:", err);
  }
}

test();
