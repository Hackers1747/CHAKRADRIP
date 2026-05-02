/**
 * size-guide.js — Interactive Size Guide Modal
 * Usage:
 *   const guide = new SizeGuide(options)
 *   guide.open() / guide.close() / guide.setCategory('tops')
 */

class SizeGuide {
  constructor(options = {}) {
    this.options = {
      trigger: options.trigger ?? "[data-size-guide]",
      unit: options.unit ?? "cm",         // 'cm' | 'in'
      category: options.category ?? null, // auto-detect from trigger data-attr
      categories: options.categories ?? SizeGuide.defaultCategories(),
      onOpen: options.onOpen ?? null,
      onClose: options.onClose ?? null,
      onUnitChange: options.onUnitChange ?? null,
    };

    this._unit = this.options.unit;
    this._category = this.options.category;
    this._modal = null;
    this._overlay = null;

    this._injectStyles();
    this._buildModal();
    this._bindTriggers();
    this._bindKeys();
  }

  /* ─── Public API ─────────────────────────────────────────────────── */

  open(category) {
    if (category) this._category = category;
    if (!this._category) {
      const cats = Object.keys(this.options.categories);
      this._category = cats[0];
    }
    this._render();
    this._overlay.classList.add("sg-visible");
    this._modal.classList.add("sg-visible");
    document.body.style.overflow = "hidden";
    this.options.onOpen?.({ category: this._category, unit: this._unit });
    return this;
  }

  close() {
    this._overlay.classList.remove("sg-visible");
    this._modal.classList.remove("sg-visible");
    document.body.style.overflow = "";
    this.options.onClose?.();
    return this;
  }

  setCategory(category) {
    this._category = category;
    this._render();
    return this;
  }

  setUnit(unit) {
    this._unit = unit;
    this._render();
    this.options.onUnitChange?.({ unit });
    return this;
  }

  destroy() {
    this._modal?.remove();
    this._overlay?.remove();
    this._unbindTriggers?.();
    document.removeEventListener("keydown", this._keyHandler);
  }

  /* ─── Build DOM ───────────────────────────────────────────────────── */

  _buildModal() {
    // Overlay
    this._overlay = document.createElement("div");
    this._overlay.className = "sg-overlay";
    this._overlay.addEventListener("click", () => this.close());

    // Modal
    this._modal = document.createElement("div");
    this._modal.className = "sg-modal";
    this._modal.setAttribute("role", "dialog");
    this._modal.setAttribute("aria-modal", "true");
    this._modal.setAttribute("aria-label", "Size Guide");

    this._modal.innerHTML = `
      <div class="sg-header">
        <h2 class="sg-title">Size Guide</h2>
        <button class="sg-close" aria-label="Close size guide">✕</button>
      </div>
      <div class="sg-tabs" id="sg-tabs"></div>
      <div class="sg-unit-toggle">
        <button class="sg-unit-btn" data-unit="cm">CM</button>
        <button class="sg-unit-btn" data-unit="in">IN</button>
      </div>
      <div class="sg-body" id="sg-body"></div>
      <p class="sg-note">Measurements may vary ±1–2 cm. When between sizes, size up.</p>
    `;

    this._modal.querySelector(".sg-close").addEventListener("click", () =>
      this.close()
    );

    this._modal.querySelectorAll(".sg-unit-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.setUnit(btn.dataset.unit));
    });

    document.body.appendChild(this._overlay);
    document.body.appendChild(this._modal);
  }

  _render() {
    const cats = this.options.categories;

    // Tabs
    const tabsEl = this._modal.querySelector("#sg-tabs");
    tabsEl.innerHTML = Object.keys(cats)
      .map(
        (key) =>
          `<button class="sg-tab${key === this._category ? " sg-tab--active" : ""}" data-cat="${key}">
            ${cats[key].label}
          </button>`
      )
      .join("");

    tabsEl.querySelectorAll(".sg-tab").forEach((btn) => {
      btn.addEventListener("click", () => this.setCategory(btn.dataset.cat));
    });

    // Unit toggle
    this._modal.querySelectorAll(".sg-unit-btn").forEach((btn) => {
      btn.classList.toggle("sg-unit-btn--active", btn.dataset.unit === this._unit);
    });

    // Table
    const data = cats[this._category];
    if (!data) return;

    const bodyEl = this._modal.querySelector("#sg-body");
    const cols = data.columns;
    const rows = data.rows;

    const convert = (val) => {
      if (this._unit === "in" && typeof val === "number") {
        return (val / 2.54).toFixed(1) + '"';
      }
      return typeof val === "number" ? val + " cm" : val;
    };

    bodyEl.innerHTML = `
      <table class="sg-table">
        <thead>
          <tr>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell, i) => `<td>${i === 0 ? cell : convert(cell)}</td>`)
                  .join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    `;
  }

  /* ─── Triggers & Keys ─────────────────────────────────────────────── */

  _bindTriggers() {
    this._triggerHandler = (e) => {
      const btn = e.target.closest(this.options.trigger);
      if (!btn) return;
      e.preventDefault();
      const cat = btn.dataset.sizeGuideCategory ?? this.options.category;
      this.open(cat);
    };
    document.addEventListener("click", this._triggerHandler);
  }

  _unbindTriggers() {
    document.removeEventListener("click", this._triggerHandler);
  }

  _bindKeys() {
    this._keyHandler = (e) => {
      if (e.key === "Escape") this.close();
    };
    document.addEventListener("keydown", this._keyHandler);
  }

  /* ─── Styles ──────────────────────────────────────────────────────── */

  _injectStyles() {
    if (document.getElementById("sg-styles")) return;
    const style = document.createElement("style");
    style.id = "sg-styles";
    style.textContent = `
      .sg-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(4px);
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s;
        z-index: 9998;
      }
      .sg-overlay.sg-visible { opacity: 1; pointer-events: all; }

      .sg-modal {
        position: fixed; inset: 50% auto auto 50%;
        transform: translate(-50%, -44%) scale(0.96);
        width: min(680px, 94vw);
        max-height: 85vh;
        background: #fff;
        border-radius: 16px;
        box-shadow: 0 32px 80px rgba(0,0,0,0.22);
        opacity: 0; pointer-events: none;
        transition: opacity 0.25s, transform 0.25s;
        z-index: 9999;
        display: flex; flex-direction: column;
        overflow: hidden;
        font-family: 'Helvetica Neue', Arial, sans-serif;
      }
      .sg-modal.sg-visible {
        opacity: 1; pointer-events: all;
        transform: translate(-50%, -50%) scale(1);
      }

      .sg-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 24px 16px;
        border-bottom: 1px solid #f0f0f0;
      }
      .sg-title { margin: 0; font-size: 18px; font-weight: 700; color: #111; letter-spacing: -0.3px; }
      .sg-close {
        border: none; background: #f5f5f5; cursor: pointer;
        width: 32px; height: 32px; border-radius: 50%;
        font-size: 13px; color: #555;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .sg-close:hover { background: #e8e8e8; }

      .sg-tabs {
        display: flex; gap: 4px; padding: 14px 24px 0;
        border-bottom: 1px solid #f0f0f0;
      }
      .sg-tab {
        border: none; background: none; cursor: pointer;
        padding: 8px 16px; border-radius: 8px 8px 0 0;
        font-size: 13px; font-weight: 500; color: #777;
        transition: all 0.15s; position: relative; bottom: -1px;
        border: 1px solid transparent;
      }
      .sg-tab:hover { color: #222; }
      .sg-tab--active {
        color: #111; background: #fff;
        border-color: #f0f0f0 #f0f0f0 #fff;
        font-weight: 700;
      }

      .sg-unit-toggle {
        display: flex; gap: 6px; padding: 14px 24px 10px; align-items: center;
      }
      .sg-unit-btn {
        border: 1.5px solid #ddd; background: #fff; cursor: pointer;
        padding: 5px 14px; border-radius: 20px;
        font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #888;
        transition: all 0.15s;
      }
      .sg-unit-btn--active {
        background: #111; border-color: #111; color: #fff;
      }

      .sg-body { overflow-y: auto; padding: 0 24px 16px; flex: 1; }

      .sg-table {
        width: 100%; border-collapse: collapse; font-size: 13.5px;
      }
      .sg-table th {
        text-align: left; padding: 10px 12px;
        background: #fafafa;
        font-size: 11px; font-weight: 700; letter-spacing: 0.6px;
        color: #999; text-transform: uppercase;
        border-bottom: 1px solid #eee; position: sticky; top: 0;
      }
      .sg-table td {
        padding: 11px 12px; color: #333;
        border-bottom: 1px solid #f3f3f3;
      }
      .sg-table tr:last-child td { border-bottom: none; }
      .sg-table tr:nth-child(even) td { background: #fafafa; }
      .sg-table td:first-child { font-weight: 700; color: #111; }

      .sg-note {
        margin: 0; padding: 12px 24px 16px;
        font-size: 11.5px; color: #aaa;
        border-top: 1px solid #f0f0f0;
      }
    `;
    document.head.appendChild(style);
  }

  /* ─── Default size data ───────────────────────────────────────────── */

  static defaultCategories() {
    return {
      tops: {
        label: "Tops",
        columns: ["Size", "Chest", "Shoulder", "Length", "Sleeve"],
        rows: [
          ["XS", 84, 38, 66, 60],
          ["S",  88, 40, 68, 61],
          ["M",  92, 42, 70, 62],
          ["L",  96, 44, 72, 63],
          ["XL", 100, 46, 74, 64],
          ["2XL", 104, 48, 76, 65],
        ],
      },
      bottoms: {
        label: "Bottoms",
        columns: ["Size", "Waist", "Hip", "Inseam", "Rise"],
        rows: [
          ["XS / 26", 66, 88,  76, 24],
          ["S / 28",  71, 93,  77, 25],
          ["M / 30",  76, 98,  78, 26],
          ["L / 32",  81, 103, 79, 27],
          ["XL / 34", 86, 108, 79, 27],
          ["2XL / 36",91, 113, 80, 28],
        ],
      },
      footwear: {
        label: "Footwear",
        columns: ["EU", "UK", "US", "Foot Length (cm)"],
        rows: [
          ["38", "5",  "6",  24],
          ["39", "6",  "7",  24.7],
          ["40", "6.5","7.5",25.4],
          ["41", "7",  "8",  26],
          ["42", "8",  "9",  26.7],
          ["43", "9",  "10", 27.3],
          ["44", "9.5","10.5",28],
          ["45", "10", "11", 28.6],
        ],
      },
    };
  }
}

/* ─── Auto-init ────────────────────────────────────────────────────── */
SizeGuide.autoInit = function (options = {}) {
  return new SizeGuide(options);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => SizeGuide.autoInit());
} else {
  SizeGuide.autoInit();
}

export default SizeGuide;
