import express from "express";
import bodyParser from "body-parser";
import fetch from "node-fetch";  // ES Module import
import Tesseract from "tesseract.js";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config(); // Load environment variables

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

// Gemini API setup
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Route for testing Gemini model
app.get("/", (req, res) => {
  res.send("Welcome, Gemini and OCR features are active.");
});

// Route for generating content using Gemini AI
app.post("/api/gemini/content", async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const result = await model.generateContent(question);
    res.json({
      result: result.response.text(),
    });
    console.log(result.response.text());
  } catch (e) {
    console.log("Error:", e);
    res.status(500).json({ error: "Failed to generate content" });
  }
});

// OCR (Text extraction from image) API
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
