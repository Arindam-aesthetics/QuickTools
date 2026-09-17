(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const preview = document.getElementById("preview");
  const originalDims = document.getElementById("originalDims");
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const lockAspect = document.getElementById("lockAspect");
  const presetRow = document.getElementById("presetRow");
  const resizeBtn = document.getElementById("resizeBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const resultDims = document.getElementById("resultDims");
  const progressLine = document.getElementById("progressLine");

  let sourceImage = null;
  let sourceFile = null;
  let ratio = 1;

  function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add("show"); }
  function clearError() { errorBanner.classList.remove("show"); }

  function loadFile(file) {
    clearError();
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    sourceFile = file;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      ratio = img.naturalWidth / img.naturalHeight;
      preview.src = url;
      originalDims.textContent = img.naturalWidth + " × " + img.naturalHeight + " px";
      widthInput.value = img.naturalWidth;
      heightInput.value = img.naturalHeight;
      resultBanner.classList.remove("show");
      downloadBtn.style.display = "none";
      workArea.style.display = "block";
      workArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    img.onerror = () => showError("That file couldn't be read as an image.");
    img.src = url;
  }

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => loadFile(e.target.files[0]));
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
  );
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
  });

  widthInput.addEventListener("input", () => {
    if (lockAspect.checked && widthInput.value) {
      heightInput.value = Math.round(Number(widthInput.value) / ratio);
    }
  });
  heightInput.addEventListener("input", () => {
    if (lockAspect.checked && heightInput.value) {
      widthInput.value = Math.round(Number(heightInput.value) * ratio);
    }
  });

  presetRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".preset-chip");
    if (!chip || !sourceImage) return;
    presetRow.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    if (chip.dataset.pct) {
      const pct = Number(chip.dataset.pct) / 100;
      widthInput.value = Math.round(sourceImage.naturalWidth * pct);
      heightInput.value = Math.round(sourceImage.naturalHeight * pct);
    } else {
      widthInput.value = chip.dataset.w;
      heightInput.value = lockAspect.checked ? Math.round(Number(chip.dataset.w) / ratio) : chip.dataset.h;
    }
  });

  resizeBtn.addEventListener("click", () => {
    if (!sourceImage) return;
    const w = Number(widthInput.value);
    const h = Number(heightInput.value);
    if (!w || !h || w < 1 || h < 1) {
      showError("Enter a width and height greater than 0.");
      return;
    }
    clearError();
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(sourceImage, 0, 0, w, h);
        const mime = sourceFile.type === "image/png" ? "image/png" : "image/jpeg";
        canvas.toBlob(
          (blob) => {
            progressLine.classList.remove("show");
            if (!blob) { showError("Resizing failed. Try a smaller size."); return; }
            const url = URL.createObjectURL(blob);
            resultDims.textContent = w + " × " + h + " px";
            resultBanner.classList.add("show");
            const ext = mime === "image/png" ? "png" : "jpg";
            downloadBtn.href = url;
            downloadBtn.download = "resized." + ext;
            downloadBtn.style.display = "inline-flex";
          },
          mime,
          0.92
        );
      } catch (err) {
        progressLine.classList.remove("show");
        showError("Something went wrong resizing that image.");
      }
    }, 150);
  });

  resetBtn.addEventListener("click", () => {
    sourceImage = null;
    sourceFile = null;
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
