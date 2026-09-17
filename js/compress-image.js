(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const originalPreview = document.getElementById("originalPreview");
  const compressedPreview = document.getElementById("compressedPreview");
  const originalSize = document.getElementById("originalSize");
  const compressedSize = document.getElementById("compressedSize");
  const qualitySlider = document.getElementById("qualitySlider");
  const qualityValue = document.getElementById("qualityValue");
  const outputFormat = document.getElementById("outputFormat");
  const compressBtn = document.getElementById("compressBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const reductionPct = document.getElementById("reductionPct");
  const progressLine = document.getElementById("progressLine");

  let sourceFile = null;
  let sourceImage = null;
  let compressedBlob = null;

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add("show");
  }
  function clearError() {
    errorBanner.classList.remove("show");
  }

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
      originalPreview.src = url;
      originalSize.textContent = qtFormatBytes(file.size);
      compressedPreview.src = url;
      compressedSize.textContent = "—";
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

  qualitySlider.addEventListener("input", () => {
    qualityValue.textContent = qualitySlider.value + "%";
  });

  compressBtn.addEventListener("click", () => {
    if (!sourceImage) return;
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (outputFormat.value === "image/jpeg") {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(sourceImage, 0, 0);
        const quality = Number(qualitySlider.value) / 100;
        canvas.toBlob(
          (blob) => {
            progressLine.classList.remove("show");
            if (!blob) {
              showError("Compression failed — try a different format.");
              return;
            }
            compressedBlob = blob;
            const url = URL.createObjectURL(blob);
            compressedPreview.src = url;
            compressedSize.textContent = qtFormatBytes(blob.size);

            const reduction = Math.max(0, Math.round((1 - blob.size / sourceFile.size) * 100));
            reductionPct.textContent = reduction + "%";
            resultBanner.classList.add("show");

            const ext = outputFormat.value === "image/jpeg" ? "jpg" : outputFormat.value === "image/webp" ? "webp" : "png";
            downloadBtn.href = url;
            downloadBtn.download = "compressed." + ext;
            downloadBtn.style.display = "inline-flex";
          },
          outputFormat.value,
          quality
        );
      } catch (err) {
        progressLine.classList.remove("show");
        showError("Something went wrong compressing that image.");
      }
    }, 150);
  });

  resetBtn.addEventListener("click", () => {
    sourceFile = null;
    sourceImage = null;
    compressedBlob = null;
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
