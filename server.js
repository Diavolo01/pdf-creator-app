const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const fs = require("fs");

dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Ensure form data is parsed

app.use(express.static(path.join(__dirname, "public")));
app.use("/edit", express.static(path.join(__dirname, "public")));
app.use("/files/upload", express.static(path.join(__dirname, "public/files/upload")));


app.get("/edit/:uuid", (req, res) => {
  uuid = req.params.uuid;
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Ensure the upload directory exists
const uploadPath = path.join(__dirname, "public/files/upload");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uuid = req.query.uuid; // Get UUID from query instead of body
    if (!uuid) {
      return cb(new Error("UUID is required"), null);
    }
    const extension = file.mimetype === "application/pdf" ? "pdf" : "json";
    cb(null, `${uuid}.${extension}`);
  },
});

// Upload handlers
const upload = multer({ storage });

// API endpoint to handle PDF upload
app.post("/upload-pdf", upload.single("pdfFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  res.json({ message: "PDF saved successfully", filename: req.file.filename, uuid: req.query.uuid });
});

// API endpoint to save config JSON file
app.post("/save-config", upload.single("jsonFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No config file uploaded" });
  }
  res.json({ message: "Config saved successfully!", filename: req.file.filename, uuid: req.query.uuid });
});
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
