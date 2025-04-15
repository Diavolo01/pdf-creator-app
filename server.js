const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const fontkit = require("fontkit");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const { fetch } = require("undici");

dotenv.config();
const app = express();
app.use(cors());
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Ensure form data is parsed

app.use(express.static(path.join(__dirname, "public")));
app.use("/edit", express.static(path.join(__dirname, "public")));
app.use(
  "/files/upload",
  express.static(path.join(__dirname, "public/files/upload"))
);

app.get("/edit/:uuid", (req, res) => {
  uuid = req.params.uuid;

  res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/getFonts", (req, res) => {
  // uuid = req.params.uuid;
  //list pdf and json files in the directory
  const files = fs.readdirSync(path.join(__dirname, "public/fonts"));
  // files to array
  const fontFiles = files.map((file) => {
    //if filter.ttf only
    if (!file.endsWith(".ttf")) return null;
    //rename file to remove .ttf
    const fontName = file.replace(".ttf", "");
    return fontName;
  });
  //remove null values
  const filteredFontFiles = fontFiles.filter((file) => file !== null);
  res.json(filteredFontFiles);


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
  res.json({
    message: "PDF saved successfully",
    filename: req.file.filename,
    uuid: req.query.uuid,
  });
});

// API endpoint to save config JSON file
app.post("/save-config", upload.single("jsonFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No config file uploaded" });
  }
  res.json({
    message: "Config saved successfully!",
    filename: req.file.filename,
    uuid: req.query.uuid,
  });
});

app.post("/api", async (req, res) => {
  const getData = req.body;
  const pdfFiles = [];
  const jsonFiles = [];
  let mergedJsonData = {};

  for (const element of getData) {
    const pdfPath = path.join(
      __dirname,
      "public/files/upload",
      `${element.UUID}.pdf`
    );
    const jsonPath = path.join(
      __dirname,
      "public/files/upload",
      `${element.UUID}.json`
    );
    let jsonData = {};
    try {
      jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
      if (jsonData.items && Array.isArray(jsonData.items)) {
        jsonData.items = jsonData.items.map((item) => {
          if (item.parameterName && element.Parameter?.[item.parameterName]) {
            return {
              ...item,
              text: (element.Parameter[item.parameterName] ?? "").toString(),
            };
          }
          else if (item.src && element.Parameter?.[item.parameterImage]) {
            return {
              ...item,
              src: (element.Parameter[item.parameterImage] ?? "").toString(),
            };
          }
          return item;
        });
      }
      mergedJsonData[element.UUID] = jsonData; 
  jsonFiles.push(jsonPath);
    } catch (error) {
      console.error(`Error reading JSON file: ${jsonPath}`, error);
    }
    
    if (fs.existsSync(pdfPath)) {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      jsonData.items.forEach((element) => {
        if (element.src ?? false) {
          console.log("image", element);
        } else if (element.text ?? false) {
          console.log("text", element);
          console.log("X:", element.x, "Y:", element.y);
        } else if (!(element.src ?? false) && !(element.text ?? false)) {
          console.log("hr", element);
        }
      });

      // const page = pdfDoc.getPages()[0];
      // const { width, height } = page.getSize();

      // const scale = 2; // for example, double the size
      // const Width = width * scale;
      // const Height = height * scale;

      // console.log("Scaled size:", { width, height });

      pdfFiles.push(pdfPath); // Add the modified PDF to the merge list
    } else {
      console.log(`PDF not found: ${pdfPath}`);
    }
  }

  const pdfDataList = getData.map((element) => ({
    pdfPath: path.join(__dirname, "public/files/upload", `${element.UUID}.pdf`),
    jsonData: mergedJsonData[element.UUID],
  }));

  // Merge PDFs
  await mergePDFs("merged.pdf", pdfDataList);

  // Save merged JSON

  res.json({
    message: "PDFs and JSON merged successfully!",
    pdf: "merged.pdf",
  });
});

async function mergePDFs(outputFilename, pdfDataList) {
  const mergedPdf = await PDFDocument.create();
  mergedPdf.registerFontkit(fontkit);
  const fontsDir = path.join(__dirname, "public/fonts");
  const fontFiles = fs.readdirSync(fontsDir);
  
  const embeddedFonts = {};
  
  for (const file of fontFiles) {
    const ext = path.extname(file).toLowerCase();
    if (ext === ".ttf" || ext === ".otf") {
      const fontName = path.basename(file, ext); // เช่น Sarabun-Bold
      const fontPath = path.join(fontsDir, file);
      const fontBytes = fs.readFileSync(fontPath);
      const embeddedFont = await mergedPdf.embedFont(fontBytes);
      embeddedFonts[fontName] = embeddedFont;
    }
  }

  for (const { pdfPath, jsonData } of pdfDataList) {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());

    for (const page of pages) {
      mergedPdf.addPage(page);

      const { width, height } = page.getSize();
      console.log("Merged size:", { width, height });
      // Draw based on JSON data
      for (const element of jsonData.items) {
        if (element.src ?? false) {
          let embeddedImage;
          try {
            const response = await fetch(element.src);
            const imageBuffer = await response.arrayBuffer();

            // เช็คไฟล์จากนามสกุล URL
            const extension = element.src.split(".").pop().toLowerCase();
            if (extension === "png") {
              embeddedImage = await mergedPdf.embedPng(imageBuffer);
            } else if (extension === "jpg" || extension === "jpeg") {
              embeddedImage = await mergedPdf.embedJpg(imageBuffer);
            } else {
              console.warn("Unsupported image type:", extension);
              continue;
            }

            page.drawImage(embeddedImage, {
              x: Math.min(element.x, width - 10),
              y: Math.max(Math.min(element.y, height - 10), 10),
              width: Number(element.width),
              height: Number(element.height),
            });
          } catch (err) {
            console.error("Failed to load image from URL:", element.src, err.message);
          }
        } else if (element.text ?? false) {
          const fontSize = parseFloat(
            element.fontSize.toString().replace("px", "")
          ); //(element.fontSize || "12")
          const adjustY = element.y+element.height-fontSize;
          page.drawText(element.text, {
            x: element.x,
            y: adjustY,
            size: fontSize || 12,
            //add embedded font
            font: embeddedFonts[element.fontFamily],
            color: rgb(0, 0, 0),
          });
        } else if (!(element.src ?? false) && !(element.text ?? false)) {
          page.drawLine({
            start: { x: element.x, y: element.y },
            end: { x: element.x + element.width, y: element.y },
            thickness: 2,
            color: rgb(0, 0, 0),
          });
        }
      }
    }
  }

  const mergedPdfBytes = await mergedPdf.save();
  fs.writeFileSync(
    path.join(__dirname, "public/files/upload", outputFilename),
    mergedPdfBytes
  );

  console.log(`PDF merged successfully: ${outputFilename}`);
}
// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
