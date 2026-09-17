(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const fileList = document.getElementById("fileList");
  const fileCount = document.getElementById("fileCount");
  const mergeBtn = document.getElementById("mergeBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const mergedPageCount = document.getElementById("mergedPageCount");
  const progressLine = document.getElementById("progressLine");

  let items = []; // { id, file }
  let dragId = null;

  function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add("show"); }
  function clearError() { errorBanner.classList.remove("show"); }
  function pdfIcon() {
    return `<div class="thumb" style="display:flex;align-items:center;justify-content:center;color:var(--accent-ink);background:var(--accent-soft);">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 2h9l5 5v15H6z"/><path d="M15 2v5h5"/></svg>
    </div>`;
  }

  function addFiles(fileArr) {
    clearError();
    const valid = fileArr.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (valid.length === 0) {
      showError("Please choose PDF files.");
      return;
    }
    if (valid.length < fileArr.length) {
      showError("Some files were skipped — only PDF files are supported.");
    }
    valid.forEach((file) => {
      items.push({ id: "f" + Math.random().toString(36).slice(2), file });
    });
    renderList();
    downloadBtn.style.display = "none";
    resultBanner.classList.remove("show");
    workArea.style.display = "block";
  }

  function renderList() {
    fileCount.textContent = items.length;
    fileList.innerHTML = "";
    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "file-row";
      row.draggable = true;
      row.dataset.id = item.id;
      row.innerHTML = `
        ${pdfIcon()}
        <div class="fmeta">
          <div class="fname">${item.file.name}</div>
          <div class="fsize">${qtFormatBytes(item.file.size)}</div>
        </div>
        <div class="fbtns">
          <button class="icon-btn" data-action="up" aria-label="Move up" ${idx === 0 ? "disabled" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </button>
          <button class="icon-btn" data-action="down" aria-label="Move down" ${idx === items.length - 1 ? "disabled" : ""}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>
          </button>
          <button class="icon-btn" data-action="remove" aria-label="Remove">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>`;
      fileList.appendChild(row);
    });
  }

  fileList.addEventListener("click", (e) => {
    const btn = e.target.closest(".icon-btn");
    if (!btn) return;
    const row = e.target.closest(".file-row");
    const idx = items.findIndex((i) => i.id === row.dataset.id);
    if (btn.dataset.action === "remove") {
      items.splice(idx, 1);
    } else if (btn.dataset.action === "up" && idx > 0) {
      [items[idx - 1], items[idx]] = [items[idx], items[idx - 1]];
    } else if (btn.dataset.action === "down" && idx < items.length - 1) {
      [items[idx + 1], items[idx]] = [items[idx], items[idx + 1]];
    }
    renderList();
    if (items.length === 0) workArea.style.display = "none";
  });

  fileList.addEventListener("dragstart", (e) => {
    const row = e.target.closest(".file-row");
    if (!row) return;
    dragId = row.dataset.id;
    e.dataTransfer.effectAllowed = "move";
  });
  fileList.addEventListener("dragover", (e) => {
    e.preventDefault();
    const row = e.target.closest(".file-row");
    if (!row || row.dataset.id === dragId) return;
    row.style.borderColor = "var(--accent)";
  });
  fileList.addEventListener("dragleave", (e) => {
    const row = e.target.closest(".file-row");
    if (row) row.style.borderColor = "";
  });
  fileList.addEventListener("drop", (e) => {
    e.preventDefault();
    const row = e.target.closest(".file-row");
    if (!row || !dragId || row.dataset.id === dragId) return;
    row.style.borderColor = "";
    const fromIdx = items.findIndex((i) => i.id === dragId);
    const toIdx = items.findIndex((i) => i.id === row.dataset.id);
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);
    dragId = null;
    renderList();
  });

  dropzone.addEventListener("click", () => fileInput.click());
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });
  fileInput.addEventListener("change", (e) => { addFiles(Array.from(e.target.files)); fileInput.value = ""; });
  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("drag"); })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("drag"); })
  );
  dropzone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  });

  mergeBtn.addEventListener("click", async () => {
    if (items.length < 2) {
      showError("Add at least two PDF files to merge.");
      return;
    }
    clearError();
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    downloadBtn.style.display = "none";
    try {
      const { PDFDocument } = PDFLib;
      const mergedPdf = await PDFDocument.create();
      let totalPages = 0;
      for (const item of items) {
        const bytes = await item.file.arrayBuffer();
        const srcPdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        pages.forEach((p) => mergedPdf.addPage(p));
        totalPages += pages.length;
      }
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      downloadBtn.href = url;
      mergedPageCount.textContent = totalPages;
      resultBanner.classList.add("show");
      downloadBtn.style.display = "inline-flex";
    } catch (err) {
      showError("Couldn't merge those PDFs — one of the files may be corrupted or password-protected.");
    } finally {
      progressLine.classList.remove("show");
    }
  });

  resetBtn.addEventListener("click", () => {
    items = [];
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
