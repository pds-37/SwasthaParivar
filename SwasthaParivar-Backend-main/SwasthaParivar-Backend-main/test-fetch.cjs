const dotenv = require("dotenv");
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: "Hello" }]
      }]
    })
  });

  const data = await response.json();
  console.log(response.status, data);
}

test();
