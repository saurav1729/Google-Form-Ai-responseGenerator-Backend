const express = require("express");
const fetch = require("node-fetch");
const Tesseract = require("tesseract.js");

const app = express();
const PORT = 3000;


app.use(express.json());

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
