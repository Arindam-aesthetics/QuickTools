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
  const qualityNote = document.getElementById("qualityNote");
  const outputFormat = document.getElementById("outputFormat");
  const compressBtn = document.getElementById("compressBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const reductionPct = document.getElementById("reductionPct");
  const progressLine = document.getElementById("progressLine");

  const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB
  const FORMAT_MIME = { jpg: "image/jpeg", webp: "image/webp", png: "image/png" };
  const FORMAT_EXT = { jpg: "jpg", webp: "webp", png: "png" };

  let sourceFile = null;
  let sourceImage = null;
  const activeUrls = [];

  function trackUrl(url) {
    activeUrls.push(url);
    return url;
  }
  function revokeAllUrls() {
    while (activeUrls.length) URL.revokeObjectURL(activeUrls.pop());
  }

  function showError(msg) {
    errorBanner.textContent = msg;
    errorBanner.classList.add("show");
  }
  function clearError() {
    errorBanner.classList.remove("show");
  }

  function updateQualityAvailability() {
    const isPng = outputFormat.value === "png";
    qualitySlider.disabled = isPng;
    qualityNote.textContent = isPng
      ? "PNG doesn't use a quality setting - it's always lossless, so file size depends on the image itself."
      : "Lower quality means a smaller file.";
  }

  function loadFile(file) {
    clearError();
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      showError("This file type isn't supported. Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("That image is larger than 25 MB. Please choose a smaller file.");
      return;
    }
    revokeAllUrls();
    sourceFile = file;
    const url = trackUrl(URL.createObjectURL(file));
    const img = new Image();
    img.onload = () => {
      sourceImage = img;
      originalPreview.src = url;
      originalSize.textContent = qtFormatBytes(file.size);
      compressedPreview.src = url;
      compressedSize.textContent = "-";
      resultBanner.classList.remove("show");
      downloadBtn.style.display = "none";
      workArea.style.display = "block";
      workArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };
    img.onerror = () => showError("That file couldn't be opened as an image. It may be corrupted.");
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
  outputFormat.addEventListener("change", updateQualityAvailability);
  updateQualityAvailability();

  compressBtn.addEventListener("click", () => {
    if (!sourceImage) {
      showError("Choose an image first.");
      return;
    }
    clearError();
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    setTimeout(() => {
      try {
        const mime = FORMAT_MIME[outputFormat.value];
        const canvas = document.createElement("canvas");
        canvas.width = sourceImage.naturalWidth;
        canvas.height = sourceImage.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (mime === "image/jpeg") {
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(sourceImage, 0, 0);
        const quality = Number(qualitySlider.value) / 100;
        canvas.toBlob(
          (blob) => {
            progressLine.classList.remove("show");
            if (!blob) {
              showError("Compression failed. Try a different format or a smaller image.");
              return;
            }
            const url = trackUrl(URL.createObjectURL(blob));
            compressedPreview.src = url;
            compressedSize.textContent = qtFormatBytes(blob.size);

            const reduction = Math.max(0, Math.round((1 - blob.size / sourceFile.size) * 100));
            reductionPct.textContent = reduction + "%";
            resultBanner.classList.add("show");

            downloadBtn.href = url;
            downloadBtn.download = "compressed." + FORMAT_EXT[outputFormat.value];
            downloadBtn.style.display = "inline-flex";
          },
          mime,
          quality
        );
      } catch (err) {
        progressLine.classList.remove("show");
        showError("Something went wrong compressing that image. Please try again.");
      }
    }, 150);
  });

  resetBtn.addEventListener("click", () => {
    revokeAllUrls();
    sourceFile = null;
    sourceImage = null;
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
