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
  const copyButton = document.getElementById("copyItem");
  const pasteButton = document.getElementById("pasteItem");
  const drawHRline = document.getElementById("createHr");
  let isDrawing = false;

  // PDF navigation variables
  let currentPdf = null;
  let currentPage = 1;
  let totalPages = 1;
  let currentDrawMode = null; 
  // Store the PDFLib document
  let pdfLibDoc = null;
  let originalPdfArrayBuffer = null;

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
  copyButton.addEventListener("click", copySelectedItem);
  pasteButton.addEventListener("click", pasteItem);
  drawHRline.addEventListener("click", startDrawHr);

  const selectionBox = document.createElement("div");
  selectionBox.id = "selection-box";
  selectionBox.style.position = "absolute";
  selectionBox.style.border = "1px dashed #0066ff";
  selectionBox.style.backgroundColor = "rgba(0, 102, 255, 0.1)";
  selectionBox.style.pointerEvents = "none"; // This prevents the box from interfering with clicks
  selectionBox.style.display = "none";
  canvas.appendChild(selectionBox);
  
  // // Variables to track selection box
  let isSelecting = false;
  let startX, startY;
  
  // // Add mouse events for selection box
  canvas.addEventListener("mousedown", (e) => {
    // Only start selection if it's a direct click on the canvas (not on an item)
    if (e.target === canvas) {
      isSelecting = true;
      startX = e.clientX - canvas.getBoundingClientRect().left;
      startY = e.clientY - canvas.getBoundingClientRect().top;
      
      // Initialize selection box
      selectionBox.style.left = startX + "px";
      selectionBox.style.top = startY + "px";
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";
    }
  });
  
  canvas.addEventListener("mousemove", (e) => {
    if (!isSelecting) return;
    
    const currentX = e.clientX - canvas.getBoundingClientRect().left;
    const currentY = e.clientY - canvas.getBoundingClientRect().top;
    
    // Calculate the selection box dimensions
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    
    // Set the selection box position and size
    selectionBox.style.left = Math.min(startX, currentX) + "px";
    selectionBox.style.top = Math.min(startY, currentY) + "px";
    selectionBox.style.width = width + "px";
    selectionBox.style.height = height + "px";

    
  });
  
  canvas.addEventListener("mouseup", () => {
    if (!isSelecting) return;
    
    // Get the selection box boundaries
    const boxLeft = parseInt(selectionBox.style.left);
    const boxTop = parseInt(selectionBox.style.top);
    const boxRight = boxLeft + parseInt(selectionBox.style.width);
    const boxBottom = boxTop + parseInt(selectionBox.style.height);
    
    // Find all items that are within the selection box
    const items = Array.from(canvas.children).filter(item => {
      if (item === selectionBox || item.id === "templateImage") return false;
      
      const itemLeft = item.offsetLeft;
      const itemTop = item.offsetTop;
      const itemRight = itemLeft + item.offsetWidth;
      const itemBottom = itemTop + item.offsetHeight;
      
      // Check if the item intersects with the selection box
      return (
        itemLeft < boxRight &&
        itemRight > boxLeft &&
        itemTop < boxBottom &&
        itemBottom > boxTop
      );
    });
      items.forEach((item) => {
        item.classList.add("selected-item");
        selectItem(item, true);
        console.log(item)
        console.log(isSelecting)
      });
      if(items.length > 0){
        document.querySelectorAll(".resize-handle").forEach(handle => handle.remove());
        isSelecting = true;
      }else{
        isSelecting = false;
      }
    
    // Hide the selection box
    selectionBox.style.display = "none";
    // If any items were selected, update the properties panel for the first one
    if (items.length > 0 && items[0].classList.contains("text-item")) {
      updatePropertiesPanel(items[0]);
    }
  });
  
  // Cancel selection if mouse leaves the canvas
  canvas.addEventListener("mouseleave", () => {
    if (isSelecting) {
      selectionBox.style.display = "none";
      isSelecting = false;
    }
  });
  
  // Modify the existing canvas click event to account for the selection box
  canvas.removeEventListener("click", handleCanvasClick);
  canvas.addEventListener("click", (e) => {
    if (isDrawing) {
      handleCanvasClick(e);
      return;
    }
    if (e.target.classList.contains("text-item")) {
      selectItem(e.target);
      e.stopPropagation();
    }
    
  //   // If clicked directly on canvas (not during a selection)
    else if (e.target === canvas && !isSelecting) {
      // Click on empty canvas to clear all selections
      document.querySelectorAll(".selected-item").forEach((item) => {
        item.classList.remove("selected-item");
        removeResizeHandles(item);
        item.style.outline = "1px solid #000";
      });
    }
  });
  function removeResizeHandles(element) {
    const handles = element.querySelectorAll(".resize-handle");
    handles.forEach(handle => handle.remove());
}
function setupImageContainerInteractions(imgContainer) {
  makeDraggable(imgContainer);

  imgContainer.addEventListener("click", (e) => {
    e.stopPropagation();
    
    // Remove selection from all other items
    document.querySelectorAll(".selected-item").forEach(item => {
      item.classList.remove("selected-item");
    });
    
    // Remove existing resize handles
    document.querySelectorAll(".resize-handle").forEach(handle => handle.remove());
    
    // Add selection and resize handles to this image container
    imgContainer.classList.add("selected-item");
    createResizeHandles(
      imgContainer,
      () => (isResizing = true),
      () => (isResizing = false)
    );
  });
}
  // Function to convert hex color to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 };
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
        // Store the original PDF array buffer for later use
        originalPdfArrayBuffer = e.target.result;

        // Load the PDF using PDF.js for preview
        const pdfData = new Uint8Array(e.target.result);
        currentPdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        // Load the PDF using PDF-Lib for manipulation
        pdfLibDoc = await PDFLib.PDFDocument.load(pdfData);

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
        img.onload = async () => {
          // Adjust canvas size based on image dimensions
          canvas.style.width = img.width + "px";
          canvas.style.height = img.height + "px";

          templateImg.src = e.target.result;

          // Create a new PDF document from the image
          pdfLibDoc = await PDFLib.PDFDocument.create();
          const pngImage = await pdfLibDoc.embedPng(
            new Uint8Array(e.target.result)
          );
          const page = pdfLibDoc.addPage([img.width, img.height]);
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
          });

          // Reset PDF navigation
          currentPdf = null;
          totalPages = 1;
          currentPage = 1;
          pdfControls.style.display = "none";
        };
        img.src = e.target.result;
      }
    };

    if (file.type === "application/pdf") {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  async function renderPdfPage(pageNumber) {
    if (!currentPdf) return;

    try {
      const page = await currentPdf.getPage(pageNumber);
      const scale = 2;
      const viewport = page.getViewport({ scale });

      // Adjust the canvas size based on PDF page dimensions
      canvas.style.width = viewport.width + "px";
      canvas.style.height = viewport.height + "px";

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

  function updatePageInfo() {
    pageInfoSpan.textContent = `Page ${currentPage} of ${totalPages}`;

    // Enable/disable navigation buttons based on current page
    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  }

  async function showPreviousPage() {
    if (currentPage > 1) {
      currentPage--;
      await renderPdfPage(currentPage);
    }
  }

  async function showNextPage() {
    if (currentPage < totalPages) {
      currentPage++;
      await renderPdfPage(currentPage);
    }
  }
  let clipboard = { type: null, items: [] }; // Store copied items
let pasteCount = 1; // Track how many times items have been pasted
let lastPastedBottom = 0; // Store the last pasted element’s bottom position

function copySelectedItem() {
    clipboard.items = []; // Clear clipboard
    pasteCount = 1;
    lastPastedBottom = 0; // Reset position tracking

    document.querySelectorAll(".selected-item").forEach((selectedItem) => {
        let copiedData = null;

        if (selectedItem.classList.contains("text-item")) {
            // Copy text item
            copiedData = {
                type: "text",
                content: selectedItem.textContent,
                fontSize: selectedItem.style.fontSize,
                fontColor: selectedItem.style.color,
                textAlign: selectedItem.style.textAlign,
                width: selectedItem.offsetWidth,
                height: selectedItem.offsetHeight,
                name: selectedItem.dataset.name,
                left: selectedItem.offsetLeft,
                top: selectedItem.offsetTop,
            };
        } else if (selectedItem.classList.contains("image-container")) {
            // Copy image item
            const img = selectedItem.querySelector("img");
            if (!img) return;

            copiedData = {
                type: "image",
                src: img.src,
                width: selectedItem.offsetWidth,
                height: selectedItem.offsetHeight,
                left: selectedItem.offsetLeft,
                top: selectedItem.offsetTop,
            };
        }

        if (copiedData) clipboard.items.push(copiedData);
    });

    clipboard.type = clipboard.items.length > 0 ? clipboard.items[0].type : null;

    if (clipboard.items.length > 0) {
        console.log(`${clipboard.items.length} item(s) copied!`);
        lastPastedBottom = Math.max(...clipboard.items.map(item => item.top + item.height)); // Store the bottom of the last copied item
    } else {
        alert("Please select at least one item to copy.");
    }
}

function pasteItem() {
    if (clipboard.items.length === 0) {
        console.log("Nothing to paste!");
        return;
    }

    const MinOffset = 15; // Minimum space between pastes
    let firstPaste = pasteCount === 1; // Check if it's the first paste

    clipboard.items.forEach((copiedItem) => {
        let newElement = null;
        let x = copiedItem.left; // Maintain the same x position
        let y = firstPaste 
            ? copiedItem.top + copiedItem.height + MinOffset // Move it below the copied one
            : lastPastedBottom + MinOffset; // Stack below the last pasted item

        if (copiedItem.type === "text") {
            // Create new textbox
            newElement = createTextbox(x, y, copiedItem.content, copiedItem.name);
            console.log(pasteCount);

            // Apply copied styles
            newElement.style.fontSize = copiedItem.fontSize;
            newElement.style.color = copiedItem.fontColor;
            newElement.style.textAlign = copiedItem.textAlign;
            newElement.style.width = copiedItem.width -10+ "px";
            newElement.style.height = copiedItem.height -10+ "px";
        } else if (copiedItem.type === "image") {
            // Create new image container
            newElement = createImageContainer(copiedItem.src);
            newElement.style.left = x + "px";
            newElement.style.top = y + "px";
            newElement.style.width = copiedItem.width + "px";
            newElement.style.height = copiedItem.height + "px";

            canvas.appendChild(newElement);
        }

        if (newElement) {
            selectItem(newElement, true); // Keep newly pasted items selected
            lastPastedBottom = y + newElement.offsetHeight; // Update last pasted position
        }
    });

    pasteCount++; // Track paste count
    console.log(`${clipboard.items.length} item(s) pasted!`);
}

function selectItem(element) {
  // Toggle selection: If already selected, remove it
  if (element.classList.contains("selected-item") ) {
      //element.classList.remove("selected-item");
      element.style.outline = "1px solid #000";

  } else {  
      element.classList.add("selected-item");
      //element.style.outline = "2px solid #0066ff";
  }

  // Update properties panel for text items
  if (element.classList.contains("text-item")) {
      updatePropertiesPanel(element);
  }
}

// Add keyboard shortcuts for copy-paste
document.addEventListener("keydown", (e) => {
  // Check if Ctrl+C is pressed (Cmd+C on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    copySelectedItem();
  }

  // Check if Ctrl+V is pressed (Cmd+V on Mac)
  if ((e.ctrlKey || e.metaKey) && e.key === "v") {
    pasteItem();
  }
});

function enableGroupMovement() {
  let isDraggingGroup = false;
  let lastX, lastY;

  document.addEventListener("mousedown", (e) => {
    const target = e.target;
    
    // Check if the target or its parent is a selected item
    const selectedElement = target.classList.contains("selected-item") ? 
      target : target.closest(".selected-item");
    
    if (selectedElement && document.querySelectorAll(".selected-item").length > 1) {
      isDraggingGroup = true;
      lastX = e.clientX;
      lastY = e.clientY;
      e.preventDefault();
      e.stopPropagation();
    }
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingGroup) return;
    
    const diffX = e.clientX - lastX;
    const diffY = e.clientY - lastY;
    
    document.querySelectorAll(".selected-item").forEach((item) => {
      const currentLeft = parseInt(item.style.left) || item.offsetLeft;
      const currentTop = parseInt(item.style.top) || item.offsetTop;
      
      item.style.left = (currentLeft + diffX) + "px";
      item.style.top = (currentTop + diffY) + "px";
    });
    
    lastX = e.clientX;
    lastY = e.clientY;
  });

  document.addEventListener("mouseup", () => {
    isDraggingGroup = false;
  });
}

// Add keyboard arrow key movement for selected items
function enableKeyboardMovement() {
  document.addEventListener("keydown", (e) => {
    // Only if we have selected items and not editing text
    if (document.activeElement.contentEditable !== "true" && 
        document.querySelectorAll(".selected-item").length > 0) {
      
      const step = e.shiftKey ? 10 : 1; // Larger movement with Shift key
      let deltaX = 0;
      let deltaY = 0;
      
      switch (e.key) {
        case "ArrowUp":
          deltaY = -step;
          break;
        case "ArrowDown":
          deltaY = step;
          break;
        case "ArrowLeft":
          deltaX = -step;
          break;
        case "ArrowRight":
          deltaX = step;
          break;
        default:
          return; // Exit if not an arrow key
      }
      
      // Prevent scrolling the page
      e.preventDefault();
      
      // Move all selected items
      document.querySelectorAll(".selected-item").forEach((item) => {
        const currentLeft = parseInt(item.style.left) || item.offsetLeft;
        const currentTop = parseInt(item.style.top) || item.offsetTop;
        
        item.style.left = (currentLeft + deltaX) + "px";
        item.style.top = (currentTop + deltaY) + "px";
      });
    }
  });
}
enableGroupMovement();
enableKeyboardMovement();
  
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
      convertImageToBase64(imageUrl)
        .then((base64Image) => {
          img.src = base64Image; // Set the image source to Base64
          img.style.width = "100%";
          img.style.height = "100%";
          img.style.display = "block";
          img.onload = () => {
            imgContainer.appendChild(img);
            setupImageContainerInteractions(imgContainer);
          };
        })
        .catch((error) => {
          alert("Failed to load image. Please check the URL.");
          console.error(error);
        });
    } else {
      img.src = imageUrl; // Direct URL for local files
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.display = "block";
      img.onload = () => {
        imgContainer.appendChild(img);
        setupImageContainerInteractions(imgContainer);
      };
    }
  
    img.onerror = () => {
      alert("Failed to load image. Please check the URL.");
    };
  
    return imgContainer;
  }
  function isValidUrl(url) {
    const pattern = new RegExp("^(https?|ftp)://[^\\s/$.?#].[^\\s]*$", "i");
    return pattern.test(url);
  }

  // Function to convert image URL to Base64
  function convertImageToBase64(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // To handle cross-origin images
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const base64Image = canvas.toDataURL("image/png"); // Get the Base64 representation
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
    // createResizeHandles(
    //   container,
    //   () => (isResizing = true),
    //   () => (isResizing = false)
    // );
  }

  function createResizeHandles(
    container,
    onResizeStart = () => {},
    onResizeEnd = () => {}
  ) {
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
    currentDrawMode = 'textbox'; 
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

  function createTextbox(x, y, textContent, customName = "") {
    const textbox = document.createElement("div");
    textbox.classList.add("textbox", "text-item");
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

    canvas.appendChild(textbox);
    makeDraggable(textbox);
    makeRemovable(textbox);
    //makeSelectable(textbox);
    // makeResizable(textbox);
    // createResizeHandles(
    //   textbox,
    //   () => (isResizing = true),
    //   () => (isResizing = false)
    // );
    updatePropertiesPanel(textbox);
  
    textbox.addEventListener("click", (e) => {
      e.stopPropagation();
      selectItem(textbox);
      document.querySelectorAll(".selected-item").forEach(item => {
        item.classList.remove("selected-item");
      });
      document.querySelectorAll(".resize-handle").forEach(handle => handle.remove());
      textbox.classList.add("selected-item");
      createResizeHandles(
        textbox,
        () => (isResizing = true),
        () => (isResizing = false)
      );
    });
    textbox.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      textbox.contentEditable = true;
      textbox.focus();
    });
    textbox.addEventListener("blur", () => {
      textbox.contentEditable = false;
    });
    return textbox;
  }

  function makeDraggable(element) {
    $(element).draggable({
      containment: "#canvas",
      cursor: "move",
    });
  }
  //just incase
  // function makeResizable(element) {
  //   $(element).resizable({
  //     containment: "#canvas",
  //     handles: "ne, se, sw, nw",
  //   })}

  function makeSelectable(element) {
    $(element).selectable();
  }

  function makeRemovable(element) {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedElement = document.querySelector(".selected-item");
        if (selectedElement && selectedElement === element) {
          if (document.activeElement !== selectedElement) {
            // ป้องกันการลบขณะพิมพ์
            selectedElement.remove();
          }
        }
      }
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
      textbox.style.left = prevLeft + "px";
      textbox.style.top = prevTop + "px";
    });

    createResizeHandles(
      textbox,
      () => (isResizing = true),
      () => (isResizing = false)
    );
    
  }

  function createHr(x, y) {
    const hr = document.createElement("hr");
    hr.classList.add("horizontal-line");
    hr.style.margin = "0";
    hr.style.border = "none";
    hr.style.borderTop = "2px solid black";
   
    // Style the container div
    hr.style.position = "absolute";
    hr.style.left = `${x}px`;
    hr.style.top = `${y}px`;
    hr.style.width = "200px"; // Default width
    
    canvas.appendChild(hr);
    // Make the container draggable and removable
    makeDraggable(hr);
    makeRemovable(hr);
    // Add click and resize functionality
    hr.addEventListener("click", (e) => {
      e.stopPropagation();
      
      // Remove selection from all other items
      document.querySelectorAll(".selected-item").forEach(item => {
        item.classList.remove("selected-item");
      });
      
      // Remove existing resize handles
      document.querySelectorAll(".resize-handle").forEach(handle => handle.remove());
      
      // Add selection and resize handles
      hr.classList.add("selected-item");
      createResizeHandles(
        hr,
        () => (isResizing = true),
        () => (isResizing = false)
      );
    });
    
    return hr;
  }
  
  // Modify the startDrawing and handleCanvasClick functions to support HR creation
  function startDrawHr() {
    isDrawing = true;
    currentDrawMode = 'hr';
  }
  
  function handleCanvasClick(event) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
  
    if (currentDrawMode === 'textbox') {
      const textContent = prompt("Enter the content for the textbox:");
      if (textContent) {
        createTextbox(mouseX, mouseY, textContent);
      }
    } else if (currentDrawMode === 'hr') {
      createHr(mouseX, mouseY);
    }
    
    isDrawing = false;
    currentDrawMode = null; // Reset drawing mode
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
      .filter((item) => item.id !== "templateImage")
      .map((item) => ({
        type: item.tagName.toLowerCase(),
        src:
          item.tagName.toLowerCase() === "div" &&
          item.classList.contains("image-container")
            ? item.querySelector("img")?.src
            : undefined,
        textBoxName: item.classList.contains("text-item")
          ? item.dataset.name
          : undefined,
        text: item.classList.contains("text-item")
          ? item.textContent
          : undefined,
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
      templateSrc: templateSrc,
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
              const textbox = document.querySelector(
                `[data-name="${item.textBoxName}"]`
              );
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
  async function embedFont(doc) {
    // Embed a standard font
    return await doc.embedFont(PDFLib.StandardFonts.Helvetica);
  }
  
  async function createPdf() {
    // If no PDFLib document is available, create one
    if (!pdfLibDoc) {
      // Create a new PDF document with the same dimensions as the canvas
      const canvasWidth = parseFloat(canvas.style.width);
      const canvasHeight = parseFloat(canvas.style.height);
      pdfLibDoc = await PDFLib.PDFDocument.create();
      pdfLibDoc.addPage([canvasWidth, canvasHeight]);
    }

    // If we have a multi-page PDF, work with the current page only
    let workingPdfDoc;
    if (currentPdf && totalPages > 1) {
      // Create a new PDF with just the current page
      workingPdfDoc = await PDFLib.PDFDocument.create();
      const [copiedPage] = await workingPdfDoc.copyPages(pdfLibDoc, [
        currentPage - 1,
      ]);
      workingPdfDoc.addPage(copiedPage);
    } else {
      workingPdfDoc = pdfLibDoc;
    }

    // Get the page we're working with
    const pages = workingPdfDoc.getPages();
    const page = pages[0];
    const { width, height } = page.getSize();

    // Process all elements on the canvas
    const items = Array.from(canvas.children).filter(
      (item) => item.id !== "templateImage"
    );

    // Add images first (to be in the background)
    // For images
    for (const item of items) {
      if (item.classList.contains("image-container")) {
        const img = item.querySelector("img");
        if (img) {
          try {
            // Get canvas dimensions
            const canvasWidth =
              parseFloat(canvas.style.width) || canvas.offsetWidth;
            const canvasHeight =
              parseFloat(canvas.style.height) || canvas.offsetHeight;

            // Calculate scale factor between canvas and PDF
            const scaleX = width / canvasWidth;
            const scaleY = height / canvasHeight;

            // Scale the coordinates and dimensions
            const x = item.offsetLeft * scaleX;
            const y =
              height - item.offsetTop * scaleY - item.offsetHeight * scaleY;
            const imageWidth = item.offsetWidth * scaleX;
            const imageHeight = item.offsetHeight * scaleY;

            console.log("Image position:", x, y);
            console.log("Image dimensions:", imageWidth, imageHeight);

            // Embed the image
            let embeddedImage;
            if (img.src.startsWith("data:image/png;base64,")) {
              const base64Data = img.src.split(",")[1];
              embeddedImage = await workingPdfDoc.embedPng(base64Data);
            } else if (img.src.startsWith("data:image/jpeg;base64,")) {
              const base64Data = img.src.split(",")[1];
              embeddedImage = await workingPdfDoc.embedJpg(base64Data);
            } else {
              console.warn("Unsupported image format:", img.src);
              continue;
            }

            // Draw the image on the page with scaled dimensions
            page.drawImage(embeddedImage, {
              x: Math.min(x, width - 10),
              y: Math.max(Math.min(y, height - 10), 10),
              width: Math.min(imageWidth, width - x - 10),
              height: Math.min(imageHeight, y - 10),
            });
          } catch (error) {
            console.error("Error adding image to PDF:", error);
          }
        }
      }
    }
    const font = await embedFont(workingPdfDoc);
    for (const item of items) {
      if (item.classList.contains("text-item")) {
        // Get text styles
        const computedStyle = window.getComputedStyle(item);
        const fontSize = parseFloat(computedStyle.fontSize) || 16;
        const fontColor = computedStyle.color || "#000000";
        const { r, g, b } = hexToRgb(fontColor);
        const canvasWidth =
          parseFloat(canvas.style.width) || canvas.offsetWidth;
        const canvasHeight =
          parseFloat(canvas.style.height) || canvas.offsetHeight;
        // Calculate scale factor between canvas and PDF
        const scaleX = width / canvasWidth;
        const scaleY = height / canvasHeight;
        const fixedOffset = 10 * scaleY;
        // Scale the coordinates
        const x = item.offsetLeft * scaleX;
        const y =
          height -
          item.offsetTop * scaleY -
          item.offsetHeight * scaleY +
          fixedOffset;

        console.log("Text content:", item.textContent);
        console.log("Scaled Position:", x, y);
        console.log("Page dimensions:", width, height);

        // Add text to PDF with scaled coordinates
        page.drawText(item.textContent, {
          x: Math.min(x, width - 10),
          y: Math.max(Math.min(y, height - 10), 10),
          size: fontSize * Math.min(scaleX, scaleY),
          font: font,
          color: PDFLib.rgb(r / 255, g / 255, b / 255),
        });
      }
    }
    for (const item of items) {
    if (item.classList.contains("horizontal-line")) {
      // Get canvas and PDF page dimensions
      const canvasWidth = parseFloat(canvas.style.width) || canvas.offsetWidth;
      const canvasHeight = parseFloat(canvas.style.height) || canvas.offsetHeight;
      const { width, height } = page.getSize();

      // Calculate scale factors
      const scaleX = width / canvasWidth;
      const scaleY = height / canvasHeight;

      // Calculate line coordinates
      const lineWidth = item.offsetWidth * scaleX;
      const x = item.offsetLeft * scaleX;
      const y = height - (item.offsetTop * scaleY) - (item.offsetHeight * scaleY / 2);

      // Draw the line in PDF
      page.drawLine({
        start: { x: x, y: y },
        end: { x: x + lineWidth, y: y },
        thickness: 2,
        color: PDFLib.rgb(0, 0, 0),
      });
    }
  }
    // page.drawLine({
    //   start: { x: 50, y: 740 },
    //   end: { x: 550, y: 740 },
    //   thickness: 2,
    //   color: PDFLib.rgb(0, 0, 0),
    // });

    // Save the PDF
    const pdfBytes = await workingPdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "layout.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }
});
