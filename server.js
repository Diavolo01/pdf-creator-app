const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const { PDFDocument } = require('pdf-lib');

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

app.post("/api", async (req, res) => {
  const getData = req.body;
  const pdfFiles = [];
  const jsonFiles = [];
  let mergedJsonData = {};

  for (const element of getData) {
    const pdfPath = path.join(__dirname, "public/files/upload", `${element.UUID}.pdf`);
    const jsonPath = path.join(__dirname, "public/files/upload", `${element.UUID}.json`);
    let jsonData = {};
    try {
       jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      // console.log(jsonData);
    } catch (error) {
      console.error(`Error reading JSON file: ${jsonPath}`, error);
    }
  
    if (fs.existsSync(pdfPath)) {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      jsonData.items.forEach(element => {
        if (element.src??false) {
      console.log('image', element)
        }
        else if (element.textBoxName??false) {
          console.log('text', element)  
        }
        else if (!(element.src??false) && !(element.textBoxName??false)) {
          console.log('hr', element)  
        }
      });

      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      
      const scale = 2; // for example, double the size
      const Width = width * scale;
      const Height = height * scale;
      
      console.log('Scaled size:', { Width, Height });
      
      
      // Draw text on the first page (for example)
      // const page = pdfDoc.getPages()[0];
      // page.drawText("A", {
      //   x: 20,
      //   y: 20,
      //   size: 50,
      // });
      
      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      // fs.writeFileSync(pdfPath, modifiedPdfBytes); // Overwrite the original PDF or save it elsewhere if needed

      pdfFiles.push(pdfPath); // Add the modified PDF to the merge list
    } else {
      console.log(`PDF not found: ${pdfPath}`);
    }

    if (fs.existsSync(jsonPath)) {
      try {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        mergedJsonData[element.UUID] = jsonData; // Merge JSON under its UUID key
        jsonFiles.push(jsonPath);
      } catch (error) {
        console.error(`Error reading JSON file: ${jsonPath}`, error);
      }
    } else {
      console.log(`JSON not found: ${jsonPath}`);
    }
  }

  // Merge PDFs
  await mergePDFs("merged.pdf", pdfFiles);

  // Save merged JSON

  
  res.json({ message: "PDFs and JSON merged successfully!", pdf: "merged.pdf"});
});


async function mergePDFs(outputFilename, pdfFiles) {
  const mergedPdf = await PDFDocument.create();

  for (const pdfFile of pdfFiles) {
      const pdfBytes = fs.readFileSync(pdfFile);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));

      
    copiedPages.forEach((page) => {
      // Modify pages here only in the merged PDF
      page.drawText("A", {
        x: 20,
        y: 20,
        size: 50,
      });
      // mergedPdf.addPage(page);
    });
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(path.join(__dirname, "public/files/upload", outputFilename), mergedPdfBytes);

  console.log(`PDF merged successfully: ${outputFilename}`);
}


// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
