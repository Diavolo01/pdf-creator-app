document.addEventListener("DOMContentLoaded", () => {
  const paperSizeSelect = document.getElementById("paperSize");
  const canvas = document.getElementById("canvas");
  const addImageUrlButton = document.getElementById("addImageURL");
  const exportConfigButton = document.getElementById("exportConfig");
  const importConfigButton = document.getElementById("importConfig");
  const importFileInput = document.getElementById("importFile");
  const createPdfButton = document.getElementById("createPDF");
  const addTemplateButton = document.getElementById("addTemplate");
  const startDrawButton = document.getElementById("startDraw");
  const prevPageButton = document.getElementById("prevPage");
  const nextPageButton = document.getElementById("nextPage");
  const pageInfoSpan = document.getElementById("pageInfo");
  const pdfControls = document.getElementById("pdfControls");
  let isDrawing = false;
  
  // PDF navigation variables
  let currentPdf = null;
  let currentPage = 1;
  let totalPages = 1;

  addImageUrlButton.addEventListener("click", addImageUrl);
  exportConfigButton.addEventListener("click", exportConfig);
  importConfigButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importConfig);
  createPdfButton.addEventListener("click", createPdf);
  addTemplateButton.addEventListener("click", addTemplate);
  startDrawButton.addEventListener("click", startDrawing);
  canvas.addEventListener("click", handleCanvasClick);
  prevPageButton.addEventListener("click", showPreviousPage);
  nextPageButton.addEventListener("click", showNextPage);

  function addTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpg, application/pdf, image/png, image/jpeg";
    input.addEventListener("change", handleTemplateChange);
    input.click();
  }

  async function renderPdfPage(pageNumber) {
    if (!currentPdf) return;
        
    try {
      const page = await currentPdf.getPage(pageNumber);
      const scale = 2;
      const viewport = page.getViewport({ scale });
          
      // Adjust the canvas size based on PDF page dimensions
      canvas.style.width = viewport.width + 'px';
      canvas.style.height = viewport.height + 'px';
          
      const canvasTemp = document.createElement("canvas");
      canvasTemp.width = viewport.width;
      canvasTemp.height = viewport.height;
      const context = canvasTemp.getContext("2d");
      
      const renderContext = { canvasContext: context, viewport };
      await page.render(renderContext).promise;
      
      let templateImg = document.getElementById("templateImage");
      if (!templateImg) {
        templateImg = document.createElement("img");
        templateImg.id = "templateImage";
        templateImg.style.position = "absolute";
        templateImg.style.top = "0";
        templateImg.style.left = "0";
        templateImg.style.zIndex = "-1";
        canvas.appendChild(templateImg);
      }
          
      templateImg.src = canvasTemp.toDataURL("image/png");
          
      updatePageInfo();
    } catch (error) {
      console.error("Error rendering PDF page:", error);
    }
  }
  
  // For image files in handleTemplateChange function, ensure consistent sizing approach
  async function handleTemplateChange(event) {
    const file = event.target.files[0];
    if (!file) return;
      
    const reader = new FileReader();
        
    reader.onload = async (e) => {
      let templateImg = document.getElementById("templateImage");
      if (!templateImg) {
        templateImg = document.createElement("img");
        templateImg.id = "templateImage";
        templateImg.style.position = "absolute";
        templateImg.style.top = "0";
        templateImg.style.left = "0";
        templateImg.style.zIndex = "-1";
        canvas.appendChild(templateImg);
      }
        
      if (file.type === "application/pdf") {
        const pdfData = new Uint8Array(e.target.result);
        // Store the PDF for later use with navigation
        currentPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
              
        // Get the total number of pages
        totalPages = currentPdf.numPages;
        currentPage = 1;
              
        // Show PDF controls
        pdfControls.style.display = "block";
        updatePageInfo();
              
        // Render the first page and adjust the canvas size
        await renderPdfPage(currentPage);
      } else {
        // For image files
        const img = new Image();
        img.onload = () => {
          // Adjust canvas size based on image dimensions
          canvas.style.width = img.width + 'px';
          canvas.style.height = img.height + 'px';
                  
          templateImg.src = e.target.result;
        };
        img.src = e.target.result;
      }
    };
      
    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsDataURL(file);
    }
  }

  function updatePageInfo() {
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/disable navigation buttons based on current page
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  }

  function showPreviousPage() {
    if (currentPage > 1) {
      currentPage--;
      renderPdfPage(currentPage);
    }
  }

  function showNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      renderPdfPage(currentPage);
    }
  }

  function addImageUrl() {
  if (isDrawing) return;
  isDrawing = true;
  const imageUrl =
    document.getElementById("imageUrlInput")?.value ||
    prompt("Enter image URL:");
  const imagePattern = /\.(jpg|jpeg|png|gif|bmp)$/i;

  if (imageUrl && imagePattern.test(imageUrl)) {
    const imgContainer = createImageContainer(imageUrl);
    canvas.appendChild(imgContainer);
    isDrawing = false;
  } else {
    alert("Please enter a valid image URL.");
    isDrawing = false;
  }
}

function createImageContainer(imageUrl) {
  const imgContainer = document.createElement("div");
  imgContainer.classList.add("image-container");
  imgContainer.style.position = "absolute";
  imgContainer.style.left = "50px";
  imgContainer.style.top = "50px";
  imgContainer.style.width = "150px";
  imgContainer.style.height = "150px";

  const img = document.createElement("img");
  
  // Check if the image URL is from a remote source
  if (isValidUrl(imageUrl)) {
    convertImageToBase64(imageUrl).then((base64Image) => {
      img.src = base64Image;  // Set the image source to Base64
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.onload = () => {
        imgContainer.appendChild(img);
        createResizeHandles(imgContainer);
        makeDraggable(imgContainer);
      };
    }).catch((error) => {
      alert("Failed to load image. Please check the URL.");
      console.error(error);
    });
  } else {
    img.src = imageUrl;  // Direct URL for local files
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.display = "block";
    img.onload = () => {
      imgContainer.appendChild(img);
      createResizeHandles(imgContainer);
      makeDraggable(imgContainer);
    };
  }

  img.onerror = () => {
    alert("Failed to load image. Please check the URL.");
  };

  return imgContainer;
}

function isValidUrl(url) {
  const pattern = new RegExp('^(https?|ftp)://[^\\s/$.?#].[^\\s]*$', 'i');
  return pattern.test(url);
}

// Function to convert image URL to Base64
function convertImageToBase64(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";  // To handle cross-origin images
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const base64Image = canvas.toDataURL("image/png");  // Get the Base64 representation
      resolve(base64Image);
    };
    img.onerror = reject;
    img.src = imageUrl;
  });
}


function makeDraggable(container) {
  let isResizing = false;

  container.addEventListener("mousedown", (e) => {
    if (e.target.classList.contains("resize-handle")) return; // Prevent moving while resizing

    e.preventDefault();
    let startX = e.clientX;
    let startY = e.clientY;
    let startLeft = container.offsetLeft;
    let startTop = container.offsetTop;

    const move = (e) => {
      if (isResizing) return; // Stop movement while resizing

      let newLeft = startLeft + (e.clientX - startX);
      let newTop = startTop + (e.clientY - startY);
      container.style.left = `${newLeft}px`;
      container.style.top = `${newTop}px`;
    };

    const stopMove = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", stopMove);
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stopMove);
  });

  // Pass actual function references for starting and stopping resize
  createResizeHandles(container, () => (isResizing = true), () => (isResizing = false));
}

function createResizeHandles(container, onResizeStart = () => {}, onResizeEnd = () => {}) {
  const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];

  corners.forEach((corner) => {
    const handle = document.createElement("div");
    handle.classList.add("resize-handle", corner);
    container.appendChild(handle);

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent triggering container drag event

      onResizeStart(); // Mark resizing as active

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = container.offsetWidth;
      const startHeight = container.offsetHeight;
      const startLeft = container.offsetLeft;
      const startTop = container.offsetTop;

      const resize = (e) => {
        const diffX = e.clientX - startX;
        const diffY = e.clientY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;

        if (corner.includes("right")) {
          newWidth = startWidth + diffX;
        }
        if (corner.includes("left")) {
          newWidth = startWidth - diffX;
          newLeft = startLeft + diffX;
        }
        if (corner.includes("bottom")) {
          newHeight = startHeight + diffY;
        }
        if (corner.includes("top")) {
          newHeight = startHeight - diffY;
          newTop = startTop + diffY;
        }

        container.style.width = `${Math.max(10, newWidth)}px`;
        container.style.height = `${Math.max(10, newHeight)}px`;

        if (corner.includes("left")) container.style.left = `${newLeft}px`;
        if (corner.includes("top")) container.style.top = `${newTop}px`;
      };

      const stopResize = () => {
        onResizeEnd(); // Mark resizing as inactive
        document.removeEventListener("mousemove", resize);
        document.removeEventListener("mouseup", stopResize);
      };

      document.addEventListener("mousemove", resize);
      document.addEventListener("mouseup", stopResize);
    });
  });
}

  function startDrawing() {
    isDrawing = true;
  }

  function handleCanvasClick(event) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const textContent = prompt("Enter the content for the textbox:");
    if (textContent) {
      createTextbox(mouseX, mouseY, textContent);
    }
    isDrawing = false;
  }

  let textBoxCounter = 1;

  function createTextbox(x, y, textContent, customName="") {
    const textbox = document.createElement("div");
    textbox.classList.add("textbox", "text-item");
    textbox.contentEditable = true;
    textbox.textContent = textContent;
    const defaultName = `textbox-${textBoxCounter}`;
    const textBoxName = customName.trim() !== "" ? customName : defaultName;
    textbox.dataset.id = `textbox-${textBoxCounter}`;
    textbox.id = `textbox-${textBoxCounter}`;
    textbox.dataset.name = textBoxName;
    textbox.name = textBoxName;
    textBoxCounter++;

    textbox.style.position = "absolute";
    textbox.style.left = `${x}px`;
    textbox.style.top = `${y}px`;
    // textbox.style.width = "100px";
    // textbox.style.height = "15px";

    canvas.appendChild(textbox);
    makeDraggable(textbox);
    makeRemovable(textbox);
    //makeResizable(textbox);
    createResizeHandles(textbox, () => (isResizing = true), () => (isResizing = false));
    updatePropertiesPanel(textbox);
  }

  function makeDraggable(element) {
    $(element).draggable({
      containment: "#canvas",
      cursor: "move",
    });
  }

  // function makeResizable(element) {
  //   $(element).resizable({
  //     containment: "#canvas",
  //   });
  // }

  function makeRemovable(element) {
    element.addEventListener("dblclick", () => {
      element.remove();
    });
  }

  function updatePropertiesPanel(element) {
    document.getElementById("fontSize").value =
        parseInt(element.style.fontSize) || 16;
    document.getElementById("textContent").value = element.textContent;
    document.getElementById("posX").value =
        parseInt(element.style.left) || element.offsetLeft;
    document.getElementById("posY").value =
        parseInt(element.style.top) || element.offsetTop;
    document.getElementById("textboxId").textContent = element.dataset.id;
    document.getElementById("textboxName").value = element.dataset.name;

    document
        .getElementById("fontSize")
        .addEventListener("input", updateTextboxProperties);
    document
        .getElementById("textContent")
        .addEventListener("input", updateTextboxProperties);
    document
        .getElementById("posX")
        .addEventListener("input", updateTextboxProperties);
    document
        .getElementById("posY")
        .addEventListener("input", updateTextboxProperties);
    document
        .getElementById("textboxName")
        .addEventListener("input", updateTextboxProperties);
  }

  document.addEventListener("click", (event) => {
      if (event.target.classList.contains("text-item")) {
          updatePropertiesPanel(event.target);
      }
  });

  function updateTextboxProperties() {
    const textboxId = document.getElementById("textboxId").textContent;
    if (!textboxId) return;

    const textbox = document.getElementById(textboxId);
    if (!textbox) return;

    const textboxName = document.getElementById("textboxName").value.trim();
    if (textboxName) {
        textbox.dataset.name = textboxName;
        textbox.name = textboxName;
    }

    const fontSize = parseInt(document.getElementById("fontSize").value);
    textbox.style.fontSize = fontSize + "px";
    textbox.textContent = document.getElementById("textContent").value;

    // Store previous size and position
    const prevLeft = textbox.offsetLeft;
    const prevTop = textbox.offsetTop;

    requestAnimationFrame(() => {
        textbox.style.left = prevLeft - deltaX + "px";
        textbox.style.top = prevTop - deltaY + "px";
    });

    createResizeHandles(textbox, () => (isResizing = true), () => (isResizing = false));
}


  function exportConfig() {
    // Get template image info (if exists)
    const templateImg = document.getElementById("templateImage");
    let templateSrc = null;
    
    if (templateImg) {
      templateSrc = templateImg.src;
    }
    
    // Get canvas dimensions
    const canvasWidth = parseFloat(canvas.style.width);
    const canvasHeight = parseFloat(canvas.style.height);
    
    // Get all items (excluding the template image)
    const items = Array.from(canvas.children)
      .filter(item => item.id !== "templateImage")
      .map((item) => ({
        type: item.tagName.toLowerCase(),
        src: item.tagName.toLowerCase() === "div" && item.classList.contains("image-container") 
          ? item.querySelector("img")?.src 
          : undefined,
        textBoxName: item.classList.contains("text-item") ? item.dataset.name : undefined,
        text: item.classList.contains("text-item") ? item.textContent : undefined,
        x: item.offsetLeft,
        y: item.offsetTop,
        width: item.offsetWidth,
        height: item.offsetHeight,
        zIndex: item.style.zIndex || "auto",
        fontSize: item.style.fontSize || "16px",
        fontColor: item.style.color || "#000000",
        textAlign: item.style.textAlign || "left",
      }));

    // Create the config object
    const config = { 
      canvasWidth,
      canvasHeight,
      items,
      pdfInfo: currentPdf ? { currentPage, totalPages } : null,
      templateSrc: templateSrc
    };
    
    // Save the config as a JSON file
    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "config.json";
    a.click();
  }

  function importConfig(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const config = JSON.parse(e.target.result);
          
          // Clear the canvas first
          canvas.innerHTML = "";
          
          // Set canvas dimensions
          if (config.canvasWidth && config.canvasHeight) {
            canvas.style.width = `${config.canvasWidth}px`;
            canvas.style.height = `${config.canvasHeight}px`;
          }
          
          // Restore template image if it exists in the config
          if (config.templateSrc) {
            const templateImg = document.createElement("img");
            templateImg.id = "templateImage";
            templateImg.style.position = "absolute";
            templateImg.style.top = "0";
            templateImg.style.left = "0";
            templateImg.style.zIndex = "-1";
            templateImg.src = config.templateSrc;
            canvas.appendChild(templateImg);
          }
          
          // Add all items back to the canvas
          config.items.forEach((item) => {
            if (item.src) {
              const imgContainer = createImageContainer(item.src);
              imgContainer.style.left = `${item.x}px`;
              imgContainer.style.top = `${item.y}px`;
              imgContainer.style.width = `${item.width}px`;
              imgContainer.style.height = `${item.height}px`;
              imgContainer.style.zIndex = item.zIndex || "auto";
              canvas.appendChild(imgContainer);
            } else if (item.text) {
              createTextbox(item.x, item.y, item.text, item.textBoxName);
              const textbox = document.querySelector(`[data-name="${item.textBoxName}"]`);
              if (textbox) {
                textbox.style.width = `${item.width}px`;
                textbox.style.height = `${item.height}px`;
                textbox.style.fontSize = item.fontSize || "16px";
                textbox.style.color = item.fontColor || "#000000";
                textbox.style.textAlign = item.textAlign || "left";
                textbox.style.zIndex = item.zIndex || "auto";
              }
            }
          });
          
          // If PDF info is available in the config, update PDF controls
          if (config.pdfInfo) {
            pdfControls.style.display = "block";
            currentPage = config.pdfInfo.currentPage || 1;
            totalPages = config.pdfInfo.totalPages || 1;
            updatePageInfo();
          } else {
            pdfControls.style.display = "none";
          }
          
        } catch (error) {
          console.error("Error importing config:", error);
          alert("Invalid configuration file. Please try again.");
        }
      };
      reader.readAsText(file);
    }
  }

  function createPdf() {
    const { jsPDF } = window.jspdf;
  
    // Get canvas dimensions in pixels
    const canvasWidthPx = parseFloat(canvas.style.width);
    const canvasHeightPx = parseFloat(canvas.style.height);
    
    // Convert pixels to mm for PDF (assuming 96 DPI)
    const pxToMm = 0.264583333;
    const canvasWidthMM = canvasWidthPx * pxToMm;
    const canvasHeightMM = canvasHeightPx * pxToMm;
  
    const doc = new jsPDF({
      orientation: canvasWidthMM > canvasHeightMM ? "landscape" : "portrait",
      unit: "mm",
      format: [canvasWidthMM, canvasHeightMM],
    });
  
    const templateImg = document.getElementById("templateImage");
    if (templateImg) {
      doc.addImage(
        templateImg.src,
        "JPEG",
        0,
        0,
        canvasWidthMM,
        canvasHeightMM
      );
    }
  
    Array.from(canvas.children).forEach((item) => {
      if (item.id === "templateImage") return;
  
      // Calculate positions and dimensions in mm
      const x = (item.offsetLeft / canvasWidthPx) * canvasWidthMM;
      const y = (item.offsetTop / canvasHeightPx) * canvasHeightMM;
      const width = (item.offsetWidth / canvasWidthPx) * canvasWidthMM;
      const height = (item.offsetHeight / canvasHeightPx) * canvasHeightMM;
  
      if (item.classList.contains("image-container")) {
        // Find the img inside the container
        const img = item.querySelector("img");
        if (img) {
          try {
            doc.addImage(img.src, "JPG", x, y, width, height);
          } catch (error) {
            console.error("Error adding image to PDF:", error);
          }
        }
      } else if (item.classList.contains("text-item")) {
        // Extract text styling from the div element
        const computedStyle = window.getComputedStyle(item);
        const fontSize = parseFloat(computedStyle.fontSize) || 16;
        
        // Convert font size from px to pt for PDF (1pt ≈ 0.75px)
        const fontSizePt = fontSize * 0.75;
        
        // Set font properties
        doc.setFontSize(fontSizePt);
        doc.setTextColor(computedStyle.color || "#000000");
        
        // Get text alignment
        let textAlign = computedStyle.textAlign || "left";
        
        // Ensure textAlign is one of the allowed values
        if (!["left", "center", "right", "justify"].includes(textAlign)) {
          textAlign = "left"; // Default to left if invalid
        }
        
        // Handle text alignment
        let xPos = x;
        if (textAlign === "center") {
          xPos = x + width/2;
        } else if (textAlign === "right") {
          xPos = x + width;
        }
        
        // Handle font style 
        let fontStyle = "normal";
        if (computedStyle.fontWeight >= 700 && computedStyle.fontStyle === "italic") {
          fontStyle = "bolditalic";
        } else if (computedStyle.fontWeight >= 700) {
          fontStyle = "bold";
        } else if (computedStyle.fontStyle === "italic") {
          fontStyle = "italic";
        }
        
        // Set the font - must use standard jsPDF font names
        doc.setFont("helvetica", fontStyle);
        
        // FIX: Adjust Y position calculation to match the visual position better
        // Consider the padding from the CSS (5px) and adjust vertical alignment
        const padding = 5 * pxToMm; // Convert padding to mm
        const lineHeight = fontSizePt * 1.2 * pxToMm / 0.75; // Approximate line height
        
        // Calculate the Y position based on the text's vertical alignment
        let yPos;
        const verticalAlign = computedStyle.verticalAlign || "top";
        
        if (computedStyle.lineHeight === "normal") {
          // If using default line height, position more precisely
          yPos = y + padding + fontSizePt * 0.352778; // Convert pt to mm (1pt = 0.352778mm)
        } else {
          // For custom line heights, try to match the visual position
          yPos = y + padding + fontSizePt * 0.352778;
        }
        
        // Handle multi-line text by splitting it into lines and positioning each
        const lines = doc.splitTextToSize(item.textContent, width - (padding * 2));
        
        doc.text(lines, xPos, yPos, {
          align: textAlign,
          maxWidth: width - (padding * 2)
        });
      }
    });
  
    doc.save("layout.pdf");
  }
});