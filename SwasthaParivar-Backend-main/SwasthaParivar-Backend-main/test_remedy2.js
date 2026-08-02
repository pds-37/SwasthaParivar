import "dotenv/config.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim());
console.log("Using API Key:", apiKeys[0]);

const genAI = new GoogleGenerativeAI(apiKeys[0]);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent([{ text: "Say hello" }]);
    console.log("Success gemini-2.0-flash:", result.response.text());
  } catch (err) {
    console.error("Error gemini-2.0-flash:", err.message);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent([{ text: "Say hello" }]);
    console.log("Success gemini-1.5-flash:", result.response.text());
  } catch (err) {
    console.error("Error gemini-1.5-flash:", err.message);
  }
}

test();
