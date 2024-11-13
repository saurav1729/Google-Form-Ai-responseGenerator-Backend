import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";
import Tesseract from "tesseract.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.use(cors('*'));

app.get("/", (req, res) => {
  res.send("Welcome, Gemini and OCR features are active.");
});

app.post("/api/gemini/content", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question data is required" });
  }

  try {
    const questionString = JSON.stringify(question);

    const instruction = `Given the following list of form fields in JSON format:
${questionString}

For each question object in the array:
1. Combine the "text" and "description" fields (if the "description" field is not null) to create a full question prompt.
2. If "options" are present in the question, always select one of the provided options as the answer. Do not provide a descriptive or long answer if "options" are present; only select from the options array.
3. If "options" is empty, generate a relevant, short free-text answer.
4. Provide a response in the following JSON format:
{
  "fullQuestion": "The combined question text",
  "answer": "The selected option or generated answer"
}`;

    const chatSession = model.startChat({
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 1024,
      },
      history: [],
    });

    const aiResult = await chatSession.sendMessage(instruction);
    let responseText = aiResult.response.text();

    console.log("Raw AI Response:", responseText); // Log raw response for debugging

    // Try to extract valid JSON
    const jsonMatch = responseText.match(/\[.*\]/s); // Match any array starting with "[" and ending with "]"
    if (jsonMatch) {
      responseText = jsonMatch[0];
    } else {
      console.log("No valid JSON found in the response");
      throw new Error("Invalid JSON format received from AI model");
    }

    // Attempt to parse the cleaned JSON response
    const responseJson = JSON.parse(responseText);

    res.json({
      result: responseJson,
    });
    console.log("Parsed AI Response:", responseJson);
  } catch (e) {
    console.error("Error in content generation:", e);
    res.status(500).json({ error: "Failed to generate content or invalid JSON response" });
  }
});

app.post("/extract-text", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Image URL is required" });
  }

  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    Tesseract.recognize(buffer, "eng", { logger: (m) => console.log(m) })
      .then(({ data: { text } }) => {
        res.json({ extractedText: text });
      })
      .catch((err) => {
        console.error("OCR Error:", err);
        res.status(500).json({ error: "Failed to process OCR" });
      });
  } catch (error) {
    console.error("Error fetching or processing image:", error);
    res.status(500).json({ error: "Error fetching or processing image" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
