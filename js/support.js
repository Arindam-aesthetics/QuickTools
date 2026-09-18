// ---------------------------------------------------------------------
// Editable configuration - change these three values to use your own
// UPI details. qrImage should point at a QR code you generated from
// your own UPI app; it is shown as-is and is not read by this code.
// ---------------------------------------------------------------------
const SUPPORT_CONFIG = {
  upiId: "bhattacharyaa421@oksbi",
  displayName: "QuickTools",
  qrImage: "assets/upi-qr.png"
};

(function () {
  const upiIdText = document.getElementById("upiIdText");
  const copyBtn = document.getElementById("copyUpiBtn");
  const payBtn = document.getElementById("payUpiBtn");
  const qrImage = document.getElementById("qrImage");
  const amountRow = document.getElementById("amountRow");
  const customAmountInput = document.getElementById("customAmount");

  if (!upiIdText) return;

  upiIdText.textContent = SUPPORT_CONFIG.upiId;
  if (qrImage) qrImage.src = SUPPORT_CONFIG.qrImage;

  let selectedAmount = null;

  function buildUpiLink() {
    const params = new URLSearchParams({
      pa: SUPPORT_CONFIG.upiId,
      pn: SUPPORT_CONFIG.displayName,
      cu: "INR"
    });
    if (selectedAmount && Number(selectedAmount) > 0) params.set("am", selectedAmount);
    return "upi://pay?" + params.toString();
  }

  function refreshLink() {
    if (payBtn) payBtn.href = buildUpiLink();
  }
  refreshLink();

  if (amountRow) {
    amountRow.querySelectorAll(".amount-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        amountRow.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        selectedAmount = chip.dataset.amount;
        if (customAmountInput) customAmountInput.value = "";
        refreshLink();
      });
    });
  }

  if (customAmountInput) {
    customAmountInput.addEventListener("input", () => {
      amountRow.querySelectorAll(".amount-chip").forEach((c) => c.classList.remove("active"));
      selectedAmount = customAmountInput.value ? customAmountInput.value : null;
      refreshLink();
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(SUPPORT_CONFIG.upiId);
        qtToast("UPI ID copied");
      } catch (err) {
        qtToast("Couldn't copy - select and copy manually");
      }
    });
  }
})();
