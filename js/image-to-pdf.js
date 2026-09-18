(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("fileInput");
  const errorBanner = document.getElementById("errorBanner");
  const workArea = document.getElementById("workArea");
  const fileList = document.getElementById("fileList");
  const fileCount = document.getElementById("fileCount");
  const buildBtn = document.getElementById("buildBtn");
  const downloadBtn = document.getElementById("downloadBtn");
  const resetBtn = document.getElementById("resetBtn");
  const resultBanner = document.getElementById("resultBanner");
  const pageCount = document.getElementById("pageCount");
  const progressLine = document.getElementById("progressLine");

  const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per image

  let items = []; // { id, file, url }
  let dragId = null;
  let pdfUrl = null;

  function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add("show"); }
  function clearError() { errorBanner.classList.remove("show"); }

  function addFiles(fileArr) {
    clearError();
    const tooBig = fileArr.filter((f) => f.size > MAX_FILE_BYTES);
    const supported = fileArr.filter((f) => ["image/jpeg", "image/png", "image/webp"].includes(f.type) && f.size <= MAX_FILE_BYTES);

    if (supported.length === 0) {
      showError(tooBig.length ? "Those images are larger than 25 MB each. Please choose smaller files." : "Please choose JPG, PNG, or WebP images.");
      return;
    }
    if (supported.length < fileArr.length) {
      showError("Some files were skipped - only JPG, PNG, and WebP images under 25 MB are supported.");
    }
    supported.forEach((file) => {
      items.push({ id: "f" + Math.random().toString(36).slice(2), file, url: URL.createObjectURL(file) });
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
        <img class="thumb" src="${item.url}" alt="">
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
          <button class="icon-btn" data-action="remove" aria-label="Remove ${item.file.name}">
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
      URL.revokeObjectURL(items[idx].url);
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

  function loadImageEl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("image load failed"));
      img.src = url;
    });
  }

  // Draw every image onto a canvas first and re-encode as JPEG/PNG.
  // This avoids relying on jsPDF's WebP support, which varies by version.
  function toDataUrl(img, isPng) {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!isPng) {
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.92);
  }

  buildBtn.addEventListener("click", async () => {
    if (items.length === 0) {
      showError("Add at least one image first.");
      return;
    }
    clearError();
    progressLine.classList.add("show");
    resultBanner.classList.remove("show");
    downloadBtn.style.display = "none";
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; }
    try {
      const { jsPDF } = window.jspdf;
      let pdf = null;
      for (let i = 0; i < items.length; i++) {
        const img = await loadImageEl(items[i].url);
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const orientation = w >= h ? "l" : "p";
        const isPng = items[i].file.type === "image/png";
        const dataUrl = toDataUrl(img, isPng);
        if (!pdf) {
          pdf = new jsPDF({ orientation, unit: "px", format: [w, h], compress: true });
        } else {
          pdf.addPage([w, h], orientation);
        }
        pdf.addImage(dataUrl, isPng ? "PNG" : "JPEG", 0, 0, w, h);
      }
      const blob = pdf.output("blob");
      pdfUrl = URL.createObjectURL(blob);
      downloadBtn.href = pdfUrl;
      pageCount.textContent = items.length;
      resultBanner.classList.add("show");
      downloadBtn.style.display = "inline-flex";
    } catch (err) {
      showError("Couldn't build the PDF. Try again with fewer or smaller images.");
    } finally {
      progressLine.classList.remove("show");
    }
  });

  resetBtn.addEventListener("click", () => {
    items.forEach((item) => URL.revokeObjectURL(item.url));
    items = [];
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); pdfUrl = null; }
    fileInput.value = "";
    workArea.style.display = "none";
    clearError();
  });
})();
