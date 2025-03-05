document.addEventListener("DOMContentLoaded", () => {
  const paperSizeSelect = document.getElementById("paperSize");
  const canvas = document.getElementById("canvas");
  //const addImageButton = document.getElementById('addImage'); //for browsing local file
  const addImageURLButton = document.getElementById("addImageURL");
  const exportConfigButton = document.getElementById("exportConfig");
  const importConfigButton = document.getElementById("importConfig");
  const importFileInput = document.getElementById("importFile");
  const createPDFButton = document.getElementById("createPDF");
  const importTemplate = document.getElementById("addTemplate");
  //const imageUrLInput = document.getElementById("imageUrlInput");
  const startDraw = document.getElementById("startDraw");
  let isDrawing = false;

  paperSizeSelect.addEventListener("change", updateCanvasSize);
  //addImageButton.addEventListener('click', addImage);
  addImageURLButton.addEventListener("click", addImageURL);
  exportConfigButton.addEventListener("click", exportConfig);
  importConfigButton.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", importConfig);
  createPDFButton.addEventListener("click", createPDF);
  importTemplate.addEventListener("click", addTemplate);
  startDraw.addEventListener("click", startDrawing);
  canvas.addEventListener("click", handleCanvasClick);
  function updateCanvasSize() {
    const size = paperSizeSelect.value;
    switch (size) {
      case "A4":
        canvas.style.width = "210mm";
        canvas.style.height = "297mm";
        break;
      case "A3":
        canvas.style.width = "297mm";
        canvas.style.height = "420mm";
        break;
      case "custom":
        const customWidth = prompt("Enter custom width (mm):");
        const customHeight = prompt("Enter custom height (mm):");
        canvas.style.width = `${customWidth}mm`;
        canvas.style.height = `${customHeight}mm`;
        break;
      default:
        canvas.style.width = "210mm";
        canvas.style.height = "297mm";
    }
  }

  function addTemplate() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", function (event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          let templateImg = document.getElementById("templateImage");
          if (!templateImg) {
            templateImg = document.createElement("img");
            templateImg.id = "templateImage";
            templateImg.style.position = "absolute";
            templateImg.style.top = "0";
            templateImg.style.left = "0";
            templateImg.style.zIndex = "-1"; // Send to the background
            canvas.appendChild(templateImg);
          }
          templateImg.src = e.target.result;
          templateImg.style.width = canvas.style.width;
          templateImg.style.height = canvas.style.height;
        };
        reader.readAsDataURL(file);
      }
    });
    input.click();
  }

  // For Browsing local file
  // function addImage() {
  //     const input = document.createElement('input');
  //     input.type = 'file';
  //     input.accept = 'image/*';
  //     input.addEventListener('change', function (event) {
  //         const file = event.target.files[0];
  //         if (file) {
  //             const reader = new FileReader();
  //             reader.onload = function (e) {
  //                 const imgContainer = document.createElement('div');
  //                 imgContainer.classList.add('image-container');
  //                 imgContainer.style.position = 'absolute';
  //                 imgContainer.style.left = '50px';
  //                 imgContainer.style.top = '50px';

  //                 const img = document.createElement('img');
  //                 img.src = e.target.result;
  //                 img.style.width = '150px';
  //                 img.style.height = '150px';
  //                 img.style.display = 'block';

  //                 imgContainer.appendChild(img);
  //                 createResizeHandles(imgContainer, img);
  //                 makeDraggable(imgContainer);
  //                 canvas.appendChild(imgContainer);
  //             };
  //             reader.readAsDataURL(file);
  //         }
  //     });
  //     input.click();
  // }

  function addImageURL() {
    if (isDrawing) return;
    isDrawing = true;
    let imageURL =
      document.getElementById("imageUrlInput")?.value ||
      prompt("Enter image URL:");
    const imagePattern = /\.(jpg|jpeg|png|gif|bmp)$/i;

    if (imageURL && imagePattern.test(imageURL)) {
      const imgContainer = document.createElement("div");
      imgContainer.classList.add("image-container");
      imgContainer.style.position = "absolute";
      imgContainer.style.left = "50px";
      imgContainer.style.top = "50px";

      const img = document.createElement("img");
      img.src = imageURL;
      img.style.width = "150px";
      img.style.height = "150px";
      img.style.display = "block";

      img.onload = function () {
        imgContainer.appendChild(img);
        createResizeHandles(imgContainer, img);
        makeDraggable(imgContainer);
        canvas.appendChild(imgContainer);
        isDrawing = false;
      };

      img.onerror = function () {
        alert("Failed to load image. Please check the URL.");
        isDrawing = false;
      };
    } else {
      alert("Please enter a valid image URL.");
      isDrawing = false;
    }
  }

  function createResizeHandles(container, img) {
    const corners = ["top-left", "top-right", "bottom-left", "bottom-right"];

    corners.forEach((corner) => {
      const handle = document.createElement("div");
      handle.classList.add("resize-handle", corner);
      container.appendChild(handle);

      handle.addEventListener("mousedown", function (e) {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = container.offsetWidth;
        const startHeight = container.offsetHeight;

        function resize(e) {
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
        }

        function stopResize() {
          document.removeEventListener("mousemove", resize);
          document.removeEventListener("mouseup", stopResize);
        }

        document.addEventListener("mousemove", resize);
        document.addEventListener("mouseup", stopResize);
      });
    });
  }

  // function addText() {
  //   if (isDrawing) return;
  //   isDrawing = true;

  //   const text = prompt("Enter text:");
  //   if (text) {
  //     const div = document.createElement("div");
  //     div.textContent = text;
  //     div.classList.add("item", "text-item");
  //     div.style.width = "100px";
  //     div.style.height = "50px";
  //     makeDraggable(div);
  //     makeRemovable(div);
  //     canvas.appendChild(div);
  //     isDrawing = false;
  //   } else {
  //     isDrawing = false;
  //   }
  // }

  let clickPosition = null;

  // Function to start drawing mode
  function startDrawing() {
    isDrawing = true;
    clickPosition = null; // Reset previous position
    alert("Click anywhere inside the canvas to create a textbox");
  }

  // Function to handle click inside the canvas and store the position
  function handleCanvasClick(event) {
    if (!isDrawing) return; 
      const canvas = document.getElementById("canvas");
      const rect = canvas.getBoundingClientRect();
  
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
  
      console.log(`Mouse clicked at: X: ${mouseX}, Y: ${mouseY}`);
      clickPosition = { x: mouseX, y: mouseY };
  
      const textContent = prompt("Enter the content for the textbox:");
  
      if (textContent) {
        createTextbox(clickPosition.x, clickPosition.y, textContent);
      }
      isDrawing = false;   
  }
  

  // Function to create a textbox at the specified position
  function createTextbox(x, y, textContent) {
    const canvas = document.getElementById("canvas");

    // Create a new textbox element
    const textbox = document.createElement("div");
    textbox.classList.add("textbox");
    textbox.contentEditable = true;
    textbox.textContent = textContent;
    // Style the textbox: position it at the click position
    textbox.style.position = "absolute"; // Make sure it's positioned absolutely within the canvas
    textbox.style.left = `${x}px`;
    textbox.style.top = `${y}px`;
    textbox.style.width= "100px";
    textbox.style.height= "50px";
    // Add the textbox to the canvas
    canvas.appendChild(textbox);
    makeDraggable(textbox);
    makeRemovable(textbox);
  }

  function makeDraggable(element) {
    $(element).draggable({
      containment: "#canvas",
    });
  }

  function makeRemovable(element) {
    element.addEventListener("dblclick", () => {
      element.remove();
    });
  }

  function exportConfig() {
    const items = Array.from(canvas.children).map((item) => {
      return {
        type: item.tagName.toLowerCase(),
        src: item.tagName.toLowerCase() === "img" ? item.src : undefined,
        text: item.tagName.toLowerCase() === "div" ? item.textContent : undefined,
        x: item.offsetLeft,
        y: item.offsetTop,
        width: item.offsetWidth,
        height: item.offsetHeight,
        zIndex: item.style.zIndex || "auto",
        fontSize: item.style.fontSize || "16px",
        fontColor: item.style.color || "#000000",
        textAlign: item.style.textAlign || "left"
      };
    });
  
    const config = { paperSize: paperSizeSelect.value, items };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
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
            element.textContent = item.text;
            element.classList.add("text-item");
          }
          element.classList.add("item");
          element.style.left = `${item.x}px`;
          element.style.top = `${item.y}px`;
          element.style.width = `${item.width}px`;
          element.style.height = `${item.height}px`;
          makeDraggable(element);
          canvas.appendChild(element);
        });
      };
      reader.readAsText(file);
    }
  }

  function createPDF() {
    const { jsPDF } = window.jspdf;

    // Get the canvas size in mm
    const canvasWidthMM = parseFloat(canvas.style.width);
    const canvasHeightMM = parseFloat(canvas.style.height);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: [canvasWidthMM, canvasHeightMM], // Ensure correct page size
    });

    // Check if a template image exists and add it as background
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

    // Convert positions and sizes relative to the canvas
    Array.from(canvas.children).forEach((item) => {
      if (item.id === "templateImage") return; // Skip template image, already added

      const x = (item.offsetLeft / canvas.offsetWidth) * canvasWidthMM;
      const y = (item.offsetTop / canvas.offsetHeight) * canvasHeightMM;
      const width = (item.offsetWidth / canvas.offsetWidth) * canvasWidthMM;
      const height = (item.offsetHeight / canvas.offsetHeight) * canvasHeightMM;

      if (item.tagName.toLowerCase() === "img") {
        // Convert image to Base64 before adding to PDF
        const imgCanvas = document.createElement("canvas");
        imgCanvas.width = item.naturalWidth;
        imgCanvas.height = item.naturalHeight;
        const ctx = imgCanvas.getContext("2d");
        ctx.drawImage(item, 0, 0);

        const imageData = imgCanvas.toDataURL("image/jpg"); // Convert to Base64
        doc.addImage(imageData, "JPG", x, y, width, height);
      } else if (item.tagName.toLowerCase() === "div") {
        doc.text(item.textContent, x + 2, y + height / 2); // Adjust text position
      }
    });

    doc.save("layout.pdf");
  }

  updateCanvasSize(); // Initialize the canvas with default size
});
