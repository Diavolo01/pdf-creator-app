const express = require("express");
const mysql = require("mysql2");
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

app.post("/save-config", (req, res) => {
  const configData = req.body;
  const filePath = path.join(__dirname, "files/json/config.json");

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
