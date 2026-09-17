// Shared across every page: mobile nav toggle + tiny toast helper.
// Page-specific search / filter logic lives at the bottom, guarded by
// checks for the elements it needs, so this file is safe to include
// everywhere without errors.

(function () {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".main-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      })
    );
  }
})();

function qtToast(message) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove("show"), 2200);
}

function qtFormatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// ---------------------------------------------------------------------
// Homepage search
// ---------------------------------------------------------------------
(function () {
  const input = document.getElementById("heroSearch");
  const resultsBox = document.getElementById("heroSearchResults");
  if (!input || !resultsBox || typeof QT_TOOLS === "undefined") return;

  const pathPrefix = document.body.dataset.pathPrefix || "";

  function iconSvg(name) {
    return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>`;
  }

  function render(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      resultsBox.classList.remove("open");
      resultsBox.innerHTML = "";
      return;
    }
    const matches = QT_TOOLS.filter((t) => {
      const hay = (t.name + " " + t.desc + " " + t.keywords).toLowerCase();
      return q.split(/\s+/).every((word) => hay.includes(word));
    }).slice(0, 6);

    resultsBox.innerHTML = "";
    if (matches.length === 0) {
      resultsBox.innerHTML = `<div class="empty">No matching tool yet — try “compress”, “merge”, or “QR”.</div>`;
    } else {
      matches.forEach((t) => {
        const a = document.createElement("a");
        a.href = pathPrefix + t.href;
        a.innerHTML = `${iconSvg()}<span><span class="sr-name">${t.name}</span><br><span class="sr-desc">${t.desc}</span></span>`;
        resultsBox.appendChild(a);
      });
    }
    resultsBox.classList.add("open");
  }

  input.addEventListener("input", (e) => render(e.target.value));
  input.addEventListener("focus", (e) => {
    if (e.target.value.trim()) render(e.target.value);
  });
  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.classList.remove("open");
    }
  });
  const form = input.closest("form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim().toLowerCase();
      const match = QT_TOOLS.find((t) =>
        (t.name + " " + t.desc + " " + t.keywords).toLowerCase().includes(q.split(/\s+/)[0] || "")
      );
      if (match) window.location.href = pathPrefix + match.href;
    });
  }
})();

// ---------------------------------------------------------------------
// Tools directory: render grid + filter chips + search
// ---------------------------------------------------------------------
(function () {
  const grid = document.getElementById("directoryGrid");
  if (!grid || typeof QT_TOOLS === "undefined") return;

  const searchInput = document.getElementById("dirSearch");
  const chips = document.querySelectorAll(".filter-chip");
  const emptyState = document.getElementById("dirEmpty");
  let activeCategory = "all";

  function iconGlyph(icon) {
    const glyphs = {
      compress: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
      resize: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4" y="4" width="10" height="10" rx="1.5"/><path d="M14 20h6v-6M20 14L13 21"/></svg>',
      img2pdf: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="12" height="12" rx="1.5"/><path d="M9 21h9a2 2 0 0 0 2-2V9l-5-5"/></svg>',
      merge: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 3v6a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3V3M12 12v9M8 17l4 4 4-4"/></svg>',
      qr: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20h.01"/></svg>'
    };
    return glyphs[icon] || "";
  }

  function draw() {
    const q = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const filtered = QT_TOOLS.filter((t) => {
      const catOk = activeCategory === "all" || t.category === activeCategory;
      const hay = (t.name + " " + t.desc + " " + t.keywords).toLowerCase();
      const qOk = !q || q.split(/\s+/).every((w) => hay.includes(w));
      return catOk && qOk;
    });

    grid.innerHTML = filtered
      .map(
        (t) => `
      <a class="tool-card" href="${t.href}">
        <div class="tool-icon">${iconGlyph(t.icon)}</div>
        <h3>${t.name}</h3>
        <p>${t.desc}</p>
        <span class="tool-cat">${QT_CATEGORY_LABEL[t.category]}</span>
      </a>`
      )
      .join("");

    if (emptyState) emptyState.classList.toggle("show", filtered.length === 0);
  }

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeCategory = chip.dataset.category;
      draw();
    });
  });
  if (searchInput) searchInput.addEventListener("input", draw);

  draw();
})();
