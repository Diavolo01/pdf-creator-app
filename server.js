// app.js
const express = require("express");
const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();  // Load environment variables from .env file

const app = express();
const port = process.env.PORT || 3000;

// Create a connection to the MySQL database
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database: ", err);
    return;
  }
  console.log("Connected to the MySQL database!");
});

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static("public"));

// Define routes
app.get("/", (req, res) => {
  res.sendFile(__dirname + "public/index.html");
});

// Example of an API endpoint that interacts with MySQL
app.get("/data", (req, res) => {
  const query = "SELECT * FROM your_table_name"; // Update with your table
  db.query(query, (err, results) => {
    if (err) {
      console.error("Error fetching data: ", err);
      res.status(500).send("Server Error");
    } else {
      res.json(results);
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
