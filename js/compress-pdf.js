(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const fileName = document.getElementById("fileName");
  const fileMeta = document.getElementById("fileMeta");
  const levelRow = document.getElementById("levelRow");
  const compressBtn = document.getElementById("compressBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const reductionPct = document.getElementById("reductionPct");
  const resultSize = document.getElementById("resultSize");
  const infoBanner = document.getElementById("infoBanner");
  const infoBannerText = document.getElementById("infoBannerText");
  const progressLine = document.getElementById("progressLine");

  const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
  const MAX_PAGES = 60;

  const LEVELS = {
    low: { scale: 2.0, quality: 0.82 },
    balanced: { scale: 1.5, quality: 0.6 },
    strong: { scale: 1.1, quality: 0.35 }
  };

  let sourceFile = null;
  let activeLevel = "balanced";
  let resultUrl = null;

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add("show"); }
  function clearError() { errorBanner.classList.remove("show"); }

  function loadFile(file) {
    clearError();
    if (!file) return;
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      showError("Please choose a PDF file.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      showError("That PDF is larger than 50 MB. Please choose a smaller file.");
      return;
    }
    sourceFile = file;
    fileName.textContent = file.name;
    fileMeta.textContent = qtFormatBytes(file.size);
    downloadBtn.style.display = "none";
    resultBanner.classList.remove("show");
    infoBanner.classList.remove("show");
    workArea.style.display = "block";
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

  levelRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".preset-chip");
    if (!chip) return;
    levelRow.querySelectorAll(".preset-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeLevel = chip.dataset.level;
  });

  compressBtn.addEventListener("click", async () => {
    if (!sourceFile) {
      showError("Choose a PDF first.");
      return;
    }
    if (!window.pdfjsLib || !window.jspdf) {
      showError("Couldn't load the PDF engine. Check your connection and try again.");
      return;
    }
    clearError();
    resultBanner.classList.remove("show");
    infoBanner.classList.remove("show");
    downloadBtn.style.display = "none";
    progressLine.classList.add("show");
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }

    try {
      const settings = LEVELS[activeLevel];
      const bytes = await sourceFile.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: bytes }).promise;

      if (doc.numPages > MAX_PAGES) {
        showError("This tool works best with shorter PDFs - please try one with " + MAX_PAGES + " pages or fewer.");
        return;
      }

      const { jsPDF } = window.jspdf;
      let pdf = null;

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: settings.scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const dataUrl = canvas.toDataURL("image/jpeg", settings.quality);
        const ptViewport = page.getViewport({ scale: 1 });
        const pageW = ptViewport.width;
        const pageH = ptViewport.height;
        const orientation = pageW > pageH ? "l" : "p";

        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: "pt", format: [pageW, pageH], compress: true });
        } else {
          pdf.addPage([pageW, pageH], orientation);
        }
        pdf.addImage(dataUrl, "JPEG", 0, 0, pageW, pageH);
      }

      const outBlob = pdf.output("blob");
      const originalSize = sourceFile.size;
      const newSize = outBlob.size;

      if (newSize >= originalSize * 0.98) {
        infoBannerText.textContent = "This PDF didn't get noticeably smaller (" + qtFormatBytes(originalSize) + " to " + qtFormatBytes(newSize) + "), so here's your original file unchanged.";
        infoBanner.classList.add("show");
        resultUrl = URL.createObjectURL(sourceFile);
        downloadBtn.href = resultUrl;
        downloadBtn.download = sourceFile.name;
        downloadBtn.textContent = "Download original PDF";
      } else {
        const reduction = Math.round((1 - newSize / originalSize) * 100);
        reductionPct.textContent = reduction + "%";
        resultSize.textContent = qtFormatBytes(newSize);
        resultBanner.classList.add("show");
        resultUrl = URL.createObjectURL(outBlob);
        downloadBtn.href = resultUrl;
        downloadBtn.download = "compressed.pdf";
        downloadBtn.textContent = "Download PDF";
      }
      downloadBtn.style.display = "inline-flex";
    } catch (err) {
      showError("Couldn't compress that PDF - it may be corrupted or password-protected.");
    } finally {
      progressLine.classList.remove("show");
    }
  });

  resetBtn.addEventListener("click", () => {
    sourceFile = null;
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
