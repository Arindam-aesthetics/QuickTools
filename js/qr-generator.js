(function () {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const panels = document.querySelectorAll(".tab-panel");
  const urlInput = document.getElementById("urlInput");
  const textInput = document.getElementById("textInput");
  const upiIdInput = document.getElementById("upiIdInput");
  const upiNameInput = document.getElementById("upiNameInput");
  const upiAmountInput = document.getElementById("upiAmountInput");
  const qrSize = document.getElementById("qrSize");
  const generateBtn = document.getElementById("generateBtn");
  const copyContentBtn = document.getElementById("copyContentBtn");
  const errorBanner = document.getElementById("errorBanner");
  const qrCanvasHost = document.getElementById("qrCanvasHost");
  const qrEmptyState = document.getElementById("qrEmptyState");
  const downloadQrBtn = document.getElementById("downloadQrBtn");

  let activeTab = "url";
  let currentContent = "";

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
      return { value: v };
    }
    if (activeTab === "upi") {
      const id = upiIdInput.value.trim();
      if (!id || !id.includes("@")) return { error: "Enter a valid UPI ID, like name@bank." };
      const params = new URLSearchParams({ pa: id, pn: upiNameInput.value.trim() || "Payee", cu: "INR" });
      if (upiAmountInput.value) params.set("am", upiAmountInput.value);
      return { value: "upi://pay?" + params.toString() };
    }
    return { error: "Choose what to encode first." };
  }

  function renderQr(content, size) {
    qrCanvasHost.innerHTML = "";
    new QRCode(qrCanvasHost, {
      text: content,
      width: size,
      height: size,
      colorDark: "#15171B",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
    qrEmptyState.style.display = "none";
  }

  generateBtn.addEventListener("click", () => {
    const result = buildContent();
    if (result.error) {
      showError(result.error);
      downloadQrBtn.style.display = "none";
      return;
    }
    clearError();
    currentContent = result.value;
    const size = Number(qrSize.value) || 320;
    renderQr(currentContent, size);

    setTimeout(() => {
      const canvas = qrCanvasHost.querySelector("canvas");
      if (canvas) {
        downloadQrBtn.href = canvas.toDataURL("image/png");
        downloadQrBtn.style.display = "inline-flex";
      }
    }, 60);
  });

  copyContentBtn.addEventListener("click", async () => {
    const result = buildContent();
    if (result.error) { showError(result.error); return; }
    clearError();
    try {
      await navigator.clipboard.writeText(result.value);
      qtToast("Copied to clipboard");
    } catch (err) {
      showError("Couldn't copy — select and copy the value manually.");
    }
  });
})();
