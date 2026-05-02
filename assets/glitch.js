/**
 * glitch.js — Cyberpunk-style glitch text effect
 * Usage:
 *   const glitch = new Glitch('.my-element', options)
 *   glitch.start() / glitch.stop() / glitch.trigger()
 */

class Glitch {
  constructor(target, options = {}) {
    this.elements =
      typeof target === "string"
        ? Array.from(document.querySelectorAll(target))
        : target instanceof Element
        ? [target]
        : Array.from(target);

    this.options = {
      chars: "!<>-_\\/[]{}—=+*^?#░▒▓│┤╡╢╖╕╣║╗╝╜╛┐└┴┬├─┼╞╟╚╔╩╦╠═╬╧╨╤╥╙╘╒╓╫╪┘┌",
      intensity: options.intensity ?? 0.3,   // 0–1, how often a char glitches
      speed: options.speed ?? 60,            // ms per frame
      duration: options.duration ?? 800,     // ms auto-stop (0 = infinite)
      color: options.color ?? "#ff0040",     // glitch colour overlay
      layers: options.layers ?? true,        // CSS pseudo-layer flicker
      auto: options.auto ?? false,           // auto-start on init
      triggerEvents: options.triggerEvents ?? ["mouseenter"], // DOM events to trigger
      className: options.className ?? "glitch-active",
    };

    this._timers = new Map();
    this._originals = new Map();

    this._injectStyles();
    this._bind();

    if (this.options.auto) this.start();
  }

  /* ─── Public API ─────────────────────────────────────────────────── */

  start(el) {
    const targets = el ? [el] : this.elements;
    targets.forEach((e) => this._startEl(e));
    return this;
  }

  stop(el) {
    const targets = el ? [el] : this.elements;
    targets.forEach((e) => this._stopEl(e));
    return this;
  }

  trigger(el) {
    const targets = el ? [el] : this.elements;
    targets.forEach((e) => {
      this._startEl(e);
      if (this.options.duration > 0) {
        setTimeout(() => this._stopEl(e), this.options.duration);
      }
    });
    return this;
  }

  destroy() {
    this.elements.forEach((e) => this._stopEl(e));
    this._removeStyles();
    this._unbind();
  }

  /* ─── Private ─────────────────────────────────────────────────────── */

  _startEl(el) {
    if (this._timers.has(el)) return; // already running
    if (!this._originals.has(el)) this._originals.set(el, el.textContent);

    el.classList.add(this.options.className);
    el.dataset.glitchText = this._originals.get(el);
    el.style.setProperty("--glitch-color", this.options.color);

    const original = this._originals.get(el);
    const chars = this.options.chars;
    const intensity = this.options.intensity;

    const tick = () => {
      el.textContent = original
        .split("")
        .map((char) => {
          if (char === " ") return " ";
          return Math.random() < intensity
            ? chars[Math.floor(Math.random() * chars.length)]
            : char;
        })
        .join("");
    };

    const id = setInterval(tick, this.options.speed);
    this._timers.set(el, id);
  }

  _stopEl(el) {
    const id = this._timers.get(el);
    if (id !== undefined) {
      clearInterval(id);
      this._timers.delete(el);
    }
    el.classList.remove(this.options.className);
    if (this._originals.has(el)) {
      el.textContent = this._originals.get(el);
    }
    delete el.dataset.glitchText;
  }

  _bind() {
    this._handlers = new Map();
    this.elements.forEach((el) => {
      const handler = () => this.trigger(el);
      this._handlers.set(el, handler);
      this.options.triggerEvents.forEach((evt) =>
        el.addEventListener(evt, handler)
      );
    });
  }

  _unbind() {
    if (!this._handlers) return;
    this.elements.forEach((el) => {
      const handler = this._handlers.get(el);
      if (handler) {
        this.options.triggerEvents.forEach((evt) =>
          el.removeEventListener(evt, handler)
        );
      }
    });
  }

  _injectStyles() {
    if (document.getElementById("glitch-js-styles")) return;
    const style = document.createElement("style");
    style.id = "glitch-js-styles";
    style.textContent = `
      .glitch-active {
        position: relative;
        display: inline-block;
      }
      .glitch-active::before,
      .glitch-active::after {
        content: attr(data-glitch-text);
        position: absolute;
        inset: 0;
        opacity: 0.8;
        mix-blend-mode: screen;
        pointer-events: none;
      }
      .glitch-active::before {
        color: var(--glitch-color, #ff0040);
        animation: glitch-shift-a 0.15s steps(2) infinite;
        clip-path: polygon(0 20%, 100% 20%, 100% 40%, 0 40%);
      }
      .glitch-active::after {
        color: #00f0ff;
        animation: glitch-shift-b 0.2s steps(3) infinite;
        clip-path: polygon(0 60%, 100% 60%, 100% 80%, 0 80%);
      }
      @keyframes glitch-shift-a {
        0%   { transform: translate(-3px, 0); }
        50%  { transform: translate(3px, 0); }
        100% { transform: translate(-2px, 1px); }
      }
      @keyframes glitch-shift-b {
        0%   { transform: translate(2px, 0); }
        33%  { transform: translate(-2px, 1px); }
        66%  { transform: translate(1px, -1px); }
        100% { transform: translate(-1px, 0); }
      }
    `;
    document.head.appendChild(style);
  }

  _removeStyles() {
    const el = document.getElementById("glitch-js-styles");
    if (el) el.remove();
  }
}

/* ── Convenience init from data-attributes ─────────────────────────── */
Glitch.autoInit = function () {
  document.querySelectorAll("[data-glitch]").forEach((el) => {
    const intensity = parseFloat(el.dataset.glitchIntensity ?? 0.3);
    const speed = parseInt(el.dataset.glitchSpeed ?? 60);
    const duration = parseInt(el.dataset.glitchDuration ?? 800);
    const color = el.dataset.glitchColor ?? "#ff0040";
    new Glitch(el, { intensity, speed, duration, color });
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", Glitch.autoInit);
} else {
  Glitch.autoInit();
}

export default Glitch;
