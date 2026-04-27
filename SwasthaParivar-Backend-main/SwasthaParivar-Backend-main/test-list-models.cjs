const dotenv = require("dotenv");
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
  
  const response = await fetch(url);

  const data = await response.json();
  if (data.models) {
    console.log(data.models.map(m => m.name));
  } else {
    console.log(response.status, data);
  }
}

test();
