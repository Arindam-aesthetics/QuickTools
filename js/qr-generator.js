(function () {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const urlInput = document.getElementById("urlInput");
  const textInput = document.getElementById("textInput");
  const upiIdInput = document.getElementById("upiIdInput");
  const upiNameInput = document.getElementById("upiNameInput");
  const upiAmountInput = document.getElementById("upiAmountInput");
  const upiIdCopyRow = document.getElementById("upiIdCopyRow");
  const upiIdEcho = document.getElementById("upiIdEcho");
  const copyUpiIdOnlyBtn = document.getElementById("copyUpiIdOnlyBtn");
  const qrSize = document.getElementById("qrSize");
  const generateBtn = document.getElementById("generateBtn");
  const copyContentBtn = document.getElementById("copyContentBtn");
  const errorBanner = document.getElementById("errorBanner");
  const qrCanvasHost = document.getElementById("qrCanvasHost");
  const qrEmptyState = document.getElementById("qrEmptyState");
  const downloadQrBtn = document.getElementById("downloadQrBtn");
  const qrTip = document.getElementById("qrTip");

  let activeTab = "url";
  let qrObjectUrl = null;

  function showError(msg) { errorBanner.textContent = msg; errorBanner.classList.add("show"); }
  function clearError() { errorBanner.classList.remove("show"); }

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
      btn.classList.add("active");
      btn.setAttribute("aria-selected", "true");
      activeTab = btn.dataset.tab;
      panels.forEach((p) => p.classList.toggle("active", p.dataset.panel === activeTab));
      clearError();
    });
  });

  // Live-echo the UPI ID next to a copy button, so it is always available
  // as a manual fallback even before a QR code has been generated.
  if (upiIdInput) {
    upiIdInput.addEventListener("input", () => {
      const id = upiIdInput.value.trim();
      if (id) {
        upiIdEcho.textContent = id;
        upiIdCopyRow.style.display = "flex";
      } else {
        upiIdCopyRow.style.display = "none";
      }
    });
  }
  if (copyUpiIdOnlyBtn) {
    copyUpiIdOnlyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(upiIdInput.value.trim());
        qtToast("UPI ID copied");
      } catch (err) {
        showError("Couldn't copy - select and copy the UPI ID manually.");
      }
    });
  }

  function buildContent() {
    if (activeTab === "url") {
      const v = urlInput.value.trim();
      if (!v) return { error: "Enter a URL first." };
      const withScheme = /^https?:\/\//i.test(v) ? v : "https://" + v;
      return { value: withScheme };
    }
    if (activeTab === "text") {
      const v = textInput.value.trim();
      if (!v) return { error: "Enter some text first." };
      if (v.length > 1500) return { error: "That's too much text for a single QR code. Try shortening it." };
      return { value: v };
    }
    if (activeTab === "upi") {
      const id = upiIdInput.value.trim().replace(/\s+/g, "");
      if (!id || !/^[\w.\-]+@[\w.\-]+$/.test(id)) return { error: "Enter a valid UPI ID, like name@bank." };
      const name = upiNameInput.value.trim() || "Payee";
      const params = new URLSearchParams();
      params.set("pa", id);
      params.set("pn", name);
      params.set("cu", "INR");
      if (upiAmountInput.value && Number(upiAmountInput.value) > 0) {
        params.set("am", String(Number(upiAmountInput.value)));
      }
      // URLSearchParams percent-encodes every value, which keeps the
      // generated upi://pay link within the standard UPI deep-link format
      // that Google Pay, PhonePe, and Paytm expect.
      return { value: "upi://pay?" + params.toString() };
    }
    return { error: "Choose what you'd like the code to contain." };
  }

  function dataUrlToBlob(dataUrl) {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function renderQr(content, size) {
    // Render into an off-screen container first, then swap in a plain <img>
    // for display. A real <img> (unlike a bare <canvas>) supports the
    // "press and hold to save" gesture in mobile browsers, which is the
    // fallback path when the Download button is restricted.
    const hidden = document.createElement("div");
    hidden.style.position = "absolute";
    hidden.style.left = "-9999px";
    document.body.appendChild(hidden);
    new QRCode(hidden, {
      text: content,
      width: size,
      height: size,
      colorDark: "#15171B",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
    const canvas = hidden.querySelector("canvas");
    if (!canvas) {
      document.body.removeChild(hidden);
      throw new Error("QR render failed");
    }
    const dataUrl = canvas.toDataURL("image/png");
    document.body.removeChild(hidden);

    qrCanvasHost.innerHTML = "";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = "Generated QR code";
    img.width = size;
    img.height = size;
    img.style.display = "block";
    qrCanvasHost.appendChild(img);
    qrEmptyState.style.display = "none";

    if (qrObjectUrl) { URL.revokeObjectURL(qrObjectUrl); qrObjectUrl = null; }
    const blob = dataUrlToBlob(dataUrl);
    qrObjectUrl = URL.createObjectURL(blob);
    downloadQrBtn.href = qrObjectUrl;
    downloadQrBtn.style.display = "inline-flex";
    qrTip.style.display = "block";
  }

  generateBtn.addEventListener("click", () => {
    const result = buildContent();
    if (result.error) {
      showError(result.error);
      downloadQrBtn.style.display = "none";
      qrTip.style.display = "none";
      return;
    }
    clearError();
    try {
      const size = Number(qrSize.value) || 320;
      renderQr(result.value, size);
    } catch (err) {
      showError("Couldn't generate that QR code. Try shortening the content.");
    }
  });

  copyContentBtn.addEventListener("click", async () => {
    const result = buildContent();
    if (result.error) { showError(result.error); return; }
    clearError();
    try {
      await navigator.clipboard.writeText(result.value);
      qtToast("Copied to clipboard");
    } catch (err) {
      showError("Couldn't copy - select and copy the value manually.");
    }
  });
})();
