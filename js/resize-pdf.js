(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const fileName = document.getElementById("fileName");
  const fileMeta = document.getElementById("fileMeta");
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  const orientationSelect = document.getElementById("orientationSelect");
  const customSizeRow = document.getElementById("customSizeRow");
  const customWidth = document.getElementById("customWidth");
  const customHeight = document.getElementById("customHeight");
  const sizeSummary = document.getElementById("sizeSummary");
  const resizeBtn = document.getElementById("resizeBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const resultPageCount = document.getElementById("resultPageCount");
  const progressLine = document.getElementById("progressLine");

  const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB
  const MM_TO_PT = 2.834645669;

  // Standard sizes in points, portrait orientation (width, height).
  const PRESETS = {
    a4: [595.28, 841.89],
    a5: [419.53, 595.28],
    letter: [612, 792],
    legal: [612, 1008]
  };
  const PRESET_LABEL = { a4: "A4", a5: "A5", letter: "Letter", legal: "Legal", custom: "your custom size" };

  let sourceFile = null;
  let sourceBytes = null;
  let resultUrl = null;

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
    workArea.style.display = "block";
    updateSummary();
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

  function getTargetSizePt() {
    let w, h;
    if (pageSizeSelect.value === "custom") {
      const wmm = Number(customWidth.value);
      const hmm = Number(customHeight.value);
      if (!wmm || !hmm || wmm < 10 || hmm < 10) return null;
      w = wmm * MM_TO_PT;
      h = hmm * MM_TO_PT;
    } else {
      [w, h] = PRESETS[pageSizeSelect.value];
    }
    if (orientationSelect.value === "landscape" && w < h) { [w, h] = [h, w]; }
    if (orientationSelect.value === "portrait" && w > h) { [w, h] = [h, w]; }
    return { w, h };
  }

  function updateSummary() {
    customSizeRow.style.display = pageSizeSelect.value === "custom" ? "flex" : "none";
    const label = PRESET_LABEL[pageSizeSelect.value];
    const orientation = orientationSelect.value === "landscape" ? "landscape" : "portrait";
    sizeSummary.textContent = "Every page will be resized to fit " + label + ", " + orientation + ".";
  }
  pageSizeSelect.addEventListener("change", updateSummary);
  orientationSelect.addEventListener("change", updateSummary);
  customWidth.addEventListener("input", updateSummary);
  customHeight.addEventListener("input", updateSummary);

  resizeBtn.addEventListener("click", async () => {
    if (!sourceFile) {
      showError("Choose a PDF first.");
      return;
    }
    const target = getTargetSizePt();
    if (!target) {
      showError("Enter a custom width and height of at least 10 mm.");
      return;
    }
    clearError();
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    downloadBtn.style.display = "none";
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }

    try {
      const { PDFDocument } = PDFLib;
      const bytes = await sourceFile.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = pdf.getPages();

      if (pages.length === 0) {
        showError("That PDF doesn't contain any pages.");
        return;
      }

      pages.forEach((page) => {
        const { width: origW, height: origH } = page.getSize();
        const scale = Math.min(target.w / origW, target.h / origH);
        page.scale(scale, scale);
        const newW = origW * scale;
        const newH = origH * scale;
        const dx = (target.w - newW) / 2;
        const dy = (target.h - newH) / 2;
        page.translateContent(dx, dy);
        page.setSize(target.w, target.h);
      });

      const outBytes = await pdf.save();
      const blob = new Blob([outBytes], { type: "application/pdf" });
      resultUrl = URL.createObjectURL(blob);
      downloadBtn.href = resultUrl;
      resultPageCount.textContent = pages.length;
      resultBanner.classList.add("show");
      downloadBtn.style.display = "inline-flex";
    } catch (err) {
      showError("Couldn't resize that PDF - it may be corrupted or password-protected.");
    } finally {
      progressLine.classList.remove("show");
    }
  });

  resetBtn.addEventListener("click", () => {
    sourceFile = null;
    sourceBytes = null;
    if (resultUrl) { URL.revokeObjectURL(resultUrl); resultUrl = null; }
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
