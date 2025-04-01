const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const fs = require('fs');

dotenv.config();  // Load environment variables from .env file
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/edit", express.static(path.join(__dirname, "public")));

app.get("/edit/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/files/template");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath); // Create folder if it doesn't exist
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, "saved_pdf_" + Date.now() + ".pdf"); // Rename file
  }
});

const upload = multer({ storage });

// API endpoint to handle PDF upload
app.post("/upload-pdf", upload.single("pdfFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ message: "PDF saved successfully", filename: req.file.filename });
});

app.post("/save-config", (req, res) => {
  const configData = req.body;
  const filePath = path.join(__dirname, "public/files/json/config.json");

  fs.writeFile(filePath, JSON.stringify(configData, null, 2), "utf8", (err) => {
    if (err) {
      console.error("Error writing JSON file:", err);
      return res.status(500).json({ message: "Failed to save config" });
    }
    res.json({ message: "Config saved successfully!" });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
