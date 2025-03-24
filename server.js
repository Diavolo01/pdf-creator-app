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

// Create a connection to the MySQL database
// const db = mysql.createConnection({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
// });

// // Connect to the database
// db.connect((err) => {
//   if (err) {
//     console.error("Error connecting to the database: ", err);
//     return;
//   }
//   console.log("Connected to the MySQL database!");
// });

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));


app.get("/edit/:id", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
