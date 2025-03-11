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

  paperSizeSelect.addEventListener("change", updateCanvasSize);
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

  function updateCanvasSize() {
    const size = paperSizeSelect.value;
    const sizes = {
      A4: { width: "210mm", height: "297mm" },
      A3: { width: "297mm", height: "420mm" },
      custom: () => {
        const customWidth = prompt("Enter custom width (mm):");
        const customHeight = prompt("Enter custom height (mm):");
        return { width: `${customWidth}mm`, height: `${customHeight}mm` };
      },
    };
    const { width, height } = sizes[size] || sizes.A4;
    canvas.style.width = width;
    canvas.style.height = height;
  }

  function addTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpg, application/pdf, image/png, image/jpeg";
    input.addEventListener("change", handleTemplateChange);
    input.click();
  }

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
        
        // Render the first page
        await renderPdfPage(currentPage);
      } else {
        // For non-PDF files, hide the PDF controls
        pdfControls.style.display = "none";
        templateImg.src = e.target.result;
        templateImg.style.width = canvas.style.width;
        templateImg.style.height = canvas.style.height;
      }
    };

    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsDataURL(file);
    }
  }

  async function renderPdfPage(pageNumber) {
    if (!currentPdf) return;
    
    try {
      const page = await currentPdf.getPage(pageNumber);
      const scale = 2;
      const viewport = page.getViewport({ scale });
      
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
      templateImg.style.width = canvas.style.width;
      templateImg.style.height = canvas.style.height;
      
      updatePageInfo();
    } catch (error) {
      console.error("Error rendering PDF page:", error);
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

    const img = document.createElement("img");
    img.src = imageUrl;
    img.style.width = "150px";
    img.style.height = "150px";
    img.style.display = "block";

    img.onload = () => {
      imgContainer.appendChild(img);
      createResizeHandles(imgContainer, img);
      makeDraggable(imgContainer);
    };

    img.onerror = () => {
      alert("Failed to load image. Please check the URL.");
    };

    return imgContainer;
  }

  function createResizeHandles(container, img) {
    const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];

    corners.forEach((corner) => {
      const handle = document.createElement("div");
      handle.classList.add("resize-handle", corner);
      container.appendChild(handle);

      handle.addEventListener("mousedown", (e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = container.offsetWidth;
        const startHeight = container.offsetHeight;

        const resize = (e) => {
          const diffX = e.clientX - startX;
          const diffY = e.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;

          if (corner.includes("right")) {
            newWidth = Math.min(
              startWidth + diffX,
              canvas.offsetWidth - container.offsetLeft
            );
          }
          if (corner.includes("left")) {
            newWidth = Math.max(10, startWidth - diffX);
          }
          if (corner.includes("bottom")) {
            newHeight = Math.min(
              startHeight + diffY,
              canvas.offsetHeight - container.offsetTop
            );
          }
          if (corner.includes("top")) {
            newHeight = Math.max(10, startHeight - diffY);
          }

          container.style.width = `${newWidth}px`;
          container.style.height = `${newHeight}px`;
          img.style.width = `${newWidth}px`;
          img.style.height = `${newHeight}px`;
        };

        const stopResize = () => {
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
    textbox.style.width = "100px";
    textbox.style.height = "50px";

    canvas.appendChild(textbox);
    makeDraggable(textbox);
    makeRemovable(textbox);
    makeResizable(textbox);
    updatePropertiesPanel(textbox);
  }

  function makeDraggable(element) {
    $(element).draggable({
      containment: "#canvas",
      cursor: "move",
      cursorAt: { top: 25, left: 50 },
    });
  }

  function makeResizable(element) {
    $(element).resizable({
      containment: "#canvas",
    });
  }

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

      textbox.style.fontSize = document.getElementById("fontSize").value + "px";
      textbox.textContent = document.getElementById("textContent").value;
      textbox.style.left = document.getElementById("posX").value + "px";
      textbox.style.top = document.getElementById("posY").value + "px";

      $(textbox).resizable("destroy");
      makeResizable(textbox);
  }

  function exportConfig() {
    const items = Array.from(canvas.children).map((item) => ({
      type: item.tagName.toLowerCase(),
      src: item.tagName.toLowerCase() === "img" ? item.src : undefined,
      textBoxName: item.tagName.toLowerCase() === "div" ? item.dataset.name : undefined,
      text: item.tagName.toLowerCase() === "div" ? item.textContent : undefined,
      x: item.offsetLeft,
      y: item.offsetTop,
      width: item.offsetWidth,
      height: item.offsetHeight,
      zIndex: item.style.zIndex || "auto",
      fontSize: item.style.fontSize || "16px",
      fontColor: item.style.color || "#000000",
      textAlign: item.style.textAlign || "left",
    }));

    const config = { 
      paperSize: paperSizeSelect.value, 
      items,
      pdfInfo: currentPdf ? { currentPage, totalPages } : null
    };
    
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
        const config = JSON.parse(e.target.result);
        paperSizeSelect.value = config.paperSize;
        updateCanvasSize();
        canvas.innerHTML = "";

        config.items.forEach((item) => {
          let element;
          if (item.type === "img") {
            element = document.createElement("img");
            element.src = item.src;
          } else if (item.type === "div") {
            element = document.createElement("div");
            element.dataset.name = item.textBoxName;
            element.textContent = item.text;
            element.classList.add("text-item");
            element.contentEditable = true;
            element.style.fontSize = item.fontSize || "16px";
            element.style.color = item.fontColor || "#000000";
            element.style.textAlign = item.textAlign || "left";
          }
          element.classList.add("item");
          element.style.position = "absolute";
          element.style.left = `${item.x}px`;
          element.style.top = `${item.y}px`;
          element.style.width = `${item.width}px`;
          element.style.height = `${item.height}px`;
          element.style.zIndex = item.zIndex || "auto";

          makeDraggable(element);
          makeResizable(element);
          makeRemovable(element);

          canvas.appendChild(element);
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
      };
      reader.readAsText(file);
    }
  }

  function createPdf() {
    const { jsPDF } = window.jspdf;

    const canvasWidthMM = parseFloat(canvas.style.width);
    const canvasHeightMM = parseFloat(canvas.style.height);

    const doc = new jsPDF({
      orientation: "portrait",
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

      const x = (item.offsetLeft / canvas.offsetWidth) * canvasWidthMM;
      const y = (item.offsetTop / canvas.offsetHeight) * canvasHeightMM;
      const width = (item.offsetWidth / canvas.offsetWidth) * canvasWidthMM;
      const height = (item.offsetHeight / canvas.offsetHeight) * canvasHeightMM;

      if (item.tagName.toLowerCase() === "img") {
        const imgCanvas = document.createElement("canvas");
        imgCanvas.width = item.naturalWidth;
        imgCanvas.height = item.naturalHeight;
        const ctx = imgCanvas.getContext("2d");
        ctx.drawImage(item, 0, 0);

        const imageData = imgCanvas.toDataURL("image/jpg");
        doc.addImage(imageData, "JPG", x, y, width, height);
      } else if (item.tagName.toLowerCase() === "div") {
        doc.setFontSize(parseFloat(item.style.fontSize) || 16);
        doc.setTextColor(item.style.color || "#000000");
        doc.text(item.textContent, x + 2, y + height / 2, {
          align: item.style.textAlign || "left",
        });
      }
    });

    doc.save("layout.pdf");
  }

  updateCanvasSize();
});