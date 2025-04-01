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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "public/files/upload");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Ensure the directory exists
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.uuid}.pdf`); // Use the same UUID for the file
  }
});

const upload = multer({ storage });

// API endpoint to handle PDF upload
app.post("/upload-pdf", generateUUID, upload.single("pdfFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ message: "PDF saved successfully", filename: req.file.filename, uuid: req.uuid });
});

// API endpoint to save config with the same UUID
app.post("/save-config", (req, res) => {
  const config = req.body;
  const uuid = config.uuid;

  if (!uuid) {
    return res.status(400).json({ message: "UUID is required" });
  }

  const filePath = path.join(__dirname, "public/files/upload", `${uuid}.json`);
  fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf8", (err) => {
    if (err) {
      console.error("Error writing JSON file:", err);
      return res.status(500).json({ message: "Failed to save config" });
    }
    res.json({ message: "Config saved successfully!", filename: `${uuid}.json` });
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
