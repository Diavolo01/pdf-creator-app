const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");

dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/edit", express.static(path.join(__dirname, "public")));

app.get("/edit/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Middleware to generate a UUID for each request
const generateUUID = (req, res, next) => {
  req.uuid = crypto.randomUUID(); // Generate a unique identifier
  next();
};

// Storage for PDF files
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/files/upload");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Ensure the directory exists
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    req.uuid = req.uuid; // Ensure UUID is set
    cb(null, `${req.uuid}.pdf`); // Name PDF using UUID
  },
});

// Storage for JSON config files
const jsonStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/files/upload");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    req.uuid = req.uuid; // Use provided UUID or generate one
    cb(null, `${req.uuid}.json`); // Name JSON file using UUID
  },
});

// Upload handlers
const uploadPDF = multer({ storage: pdfStorage });
const uploadJSON = multer({ storage: jsonStorage });

// API endpoint to handle PDF upload
app.post("/upload-pdf", generateUUID, uploadPDF.single("pdfFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ message: "PDF saved successfully", filename: req.file.filename, uuid: req.uuid });
});

// API endpoint to save config JSON file
app.post("/save-config", generateUUID,uploadJSON.single("jsonFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No config file uploaded" });
  }

  res.json({ message: "Config saved successfully!", filename: req.file.filename, uuid: req.uuid });
});
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
