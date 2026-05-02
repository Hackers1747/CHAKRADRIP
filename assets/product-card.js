/**
 * product-card.js — Dynamic, animated Product Card component
 *
 * Usage (JS):
 *   const card = new ProductCard(containerEl, productData, options)
 *
 * Usage (HTML auto-init):
 *   <div data-product-card data-product='{"id":1,"title":"...","price":1999}'></div>
 *
 * Usage (factory):
 *   ProductCard.create(containerEl, productData, options)
 */

class ProductCard {
  constructor(container, product, options = {}) {
    this.container = typeof container === "string"
      ? document.querySelector(container)
      : container;

    this.product = {
      id: product.id ?? null,
      title: product.title ?? "Untitled",
      brand: product.brand ?? "",
      price: product.price ?? 0,            // in paise/cents (integer)
      comparePrice: product.comparePrice ?? null,
      currency: product.currency ?? "₹",
      images: product.images ?? (product.image ? [product.image] : []),
      badge: product.badge ?? null,         // e.g. "New" | "Sale" | "Sold Out"
      colors: product.colors ?? [],         // [{name, hex, image?}]
      sizes: product.sizes ?? [],           // ["S","M","L","XL"]
      rating: product.rating ?? null,       // 0–5
      reviewCount: product.reviewCount ?? 0,
      inStock: product.inStock ?? true,
      tags: product.tags ?? [],
    };

    this.options = {
      onAddToCart: options.onAddToCart ?? null,
      onWishlist: options.onWishlist ?? null,
      onQuickView: options.onQuickView ?? null,
      onClick: options.onClick ?? null,
      imageAspect: options.imageAspect ?? "4/5",  // CSS aspect-ratio
      currencyDivisor: options.currencyDivisor ?? 100, // price / divisor = display
      animate: options.animate ?? true,
      lazyImages: options.lazyImages ?? true,
      theme: options.theme ?? "light",             // 'light' | 'dark'
    };

    this._selectedColor = this.product.colors[0] ?? null;
    this._selectedSize = null;
    this._wishlisted = false;
    this._activeImg = 0;

    this._injectStyles();
    this._render();
    this._bind();

    if (this.options.animate) this._animateIn();
  }

  /* ─── Public API ──────────────────────────────────────────────────── */

  static create(container, product, options = {}) {
    return new ProductCard(container, product, options);
  }

  updateProduct(data) {
    Object.assign(this.product, data);
    this._render();
    this._bind();
  }

  setWishlisted(state) {
    this._wishlisted = state;
    const btn = this.container.querySelector(".pc-wish");
    if (btn) btn.classList.toggle("pc-wish--active", state);
  }

  /* ─── Render ─────────────────────────────────────────────────────── */

  _render() {
    const p = this.product;
    const o = this.options;
    const price = (p.price / o.currencyDivisor).toLocaleString("en-IN");
    const comparePrice = p.comparePrice
      ? (p.comparePrice / o.currencyDivisor).toLocaleString("en-IN")
      : null;
    const discount = comparePrice
      ? Math.round((1 - p.price / p.comparePrice) * 100)
      : null;

    const imgs = p.images.length ? p.images : ["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='500'%3E%3Crect fill='%23eee' width='400' height='500'/%3E%3Ctext x='50%25' y='50%25' fill='%23bbb' text-anchor='middle' font-size='18' dy='.3em'%3ENo image%3C/text%3E%3C/svg%3E"];

    const stars = p.rating != null ? this._renderStars(p.rating) : "";
    const badge = p.badge ? `<span class="pc-badge pc-badge--${p.badge.toLowerCase().replace(/\s+/g,"-")}">${p.badge}</span>` : "";

    this.container.className = `pc-card pc-card--${o.theme}${!p.inStock ? " pc-card--oos" : ""}`;
    this.container.innerHTML = `
      <div class="pc-image-wrap" style="aspect-ratio:${o.imageAspect}">
        ${badge}
        <div class="pc-images" id="pc-images-${p.id}">
          ${imgs.map((src, i) => `
            <img
              class="pc-img${i === 0 ? " pc-img--active" : ""}"
              ${o.lazyImages && i > 0 ? `loading="lazy"` : ""}
              src="${src}"
              alt="${p.title} — image ${i + 1}"
              draggable="false"
            />`).join("")}
        </div>
        ${imgs.length > 1 ? `
          <div class="pc-img-dots">
            ${imgs.map((_, i) => `<span class="pc-dot${i === 0 ? " pc-dot--active" : ""}" data-img="${i}"></span>`).join("")}
          </div>
          <button class="pc-arrow pc-arrow--prev" aria-label="Previous image">‹</button>
          <button class="pc-arrow pc-arrow--next" aria-label="Next image">›</button>
        ` : ""}
        <div class="pc-actions">
          <button class="pc-wish${this._wishlisted ? " pc-wish--active" : ""}" aria-label="Wishlist" title="Save to wishlist">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </button>
          ${o.onQuickView ? `
            <button class="pc-quick" aria-label="Quick view" title="Quick view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          ` : ""}
        </div>
      </div>

      <div class="pc-info">
        ${p.brand ? `<p class="pc-brand">${p.brand}</p>` : ""}
        <h3 class="pc-title">${p.title}</h3>

        ${p.rating != null ? `
          <div class="pc-rating" title="${p.rating} out of 5">
            <span class="pc-stars">${stars}</span>
            <span class="pc-review-count">(${p.reviewCount})</span>
          </div>
        ` : ""}

        <div class="pc-price-row">
          <span class="pc-price">${p.currency}${price}</span>
          ${comparePrice ? `<span class="pc-compare">${p.currency}${comparePrice}</span>` : ""}
          ${discount ? `<span class="pc-discount">-${discount}%</span>` : ""}
        </div>

        ${p.colors.length ? `
          <div class="pc-colors" role="group" aria-label="Select colour">
            ${p.colors.map((c) => `
              <button
                class="pc-color${this._selectedColor?.name === c.name ? " pc-color--active" : ""}"
                style="background:${c.hex}"
                data-color='${JSON.stringify(c)}'
                title="${c.name}"
                aria-label="${c.name}"
              ></button>`).join("")}
          </div>
        ` : ""}

        ${p.sizes.length ? `
          <div class="pc-sizes" role="group" aria-label="Select size">
            ${p.sizes.map((s) => `
              <button
                class="pc-size${this._selectedSize === s ? " pc-size--active" : ""}"
                data-size="${s}"
                aria-label="Size ${s}"
              >${s}</button>`).join("")}
          </div>
        ` : ""}

        <button
          class="pc-add-btn${!p.inStock ? " pc-add-btn--oos" : ""}"
          ${!p.inStock ? "disabled" : ""}
          aria-label="${p.inStock ? "Add to cart" : "Out of stock"}"
        >
          ${p.inStock ? `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            Add to Cart
          ` : "Out of Stock"}
        </button>
      </div>
    `;
  }

  /* ─── Events ──────────────────────────────────────────────────────── */

  _bind() {
    const el = this.container;

    // Image navigation
    el.querySelectorAll(".pc-arrow--next").forEach((btn) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); this._nextImg(); })
    );
    el.querySelectorAll(".pc-arrow--prev").forEach((btn) =>
      btn.addEventListener("click", (e) => { e.stopPropagation(); this._prevImg(); })
    );
    el.querySelectorAll(".pc-dot").forEach((dot) =>
      dot.addEventListener("click", (e) => {
        e.stopPropagation();
        this._goToImg(parseInt(dot.dataset.img));
      })
    );

    // Color
    el.querySelectorAll(".pc-color").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const color = JSON.parse(btn.dataset.color);
        this._selectedColor = color;
        el.querySelectorAll(".pc-color").forEach((b) =>
          b.classList.toggle("pc-color--active", b.dataset.color === btn.dataset.color)
        );
        if (color.image) this._setMainImage(color.image);
      });
    });

    // Size
    el.querySelectorAll(".pc-size").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._selectedSize = btn.dataset.size;
        el.querySelectorAll(".pc-size").forEach((b) =>
          b.classList.toggle("pc-size--active", b.dataset.size === btn.dataset.size)
        );
      });
    });

    // Wishlist
    const wishBtn = el.querySelector(".pc-wish");
    if (wishBtn) {
      wishBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._wishlisted = !this._wishlisted;
        wishBtn.classList.toggle("pc-wish--active", this._wishlisted);
        this._popAnimation(wishBtn);
        this.options.onWishlist?.({
          product: this.product,
          wishlisted: this._wishlisted,
        });
      });
    }

    // Quick view
    const quickBtn = el.querySelector(".pc-quick");
    if (quickBtn) {
      quickBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.options.onQuickView?.({ product: this.product });
      });
    }

    // Add to cart
    const addBtn = el.querySelector(".pc-add-btn");
    if (addBtn && !addBtn.disabled) {
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this._addToCartAnimation(addBtn);
        this.options.onAddToCart?.({
          product: this.product,
          color: this._selectedColor,
          size: this._selectedSize,
        });
      });
    }

    // Card click
    if (this.options.onClick) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () =>
        this.options.onClick?.({ product: this.product })
      );
    }

    // Touch swipe
    this._bindSwipe();
  }

  _bindSwipe() {
    const wrap = this.container.querySelector(".pc-image-wrap");
    if (!wrap) return;
    let startX = 0;
    wrap.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
    wrap.addEventListener("touchend", (e) => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) dx < 0 ? this._nextImg() : this._prevImg();
    }, { passive: true });
  }

  /* ─── Image helpers ───────────────────────────────────────────────── */

  _goToImg(index) {
    const imgs = this.container.querySelectorAll(".pc-img");
    const dots = this.container.querySelectorAll(".pc-dot");
    imgs.forEach((img, i) => img.classList.toggle("pc-img--active", i === index));
    dots.forEach((d, i) => d.classList.toggle("pc-dot--active", i === index));
    this._activeImg = index;
  }

  _nextImg() {
    const total = this.container.querySelectorAll(".pc-img").length;
    this._goToImg((this._activeImg + 1) % total);
  }

  _prevImg() {
    const total = this.container.querySelectorAll(".pc-img").length;
    this._goToImg((this._activeImg - 1 + total) % total);
  }

  _setMainImage(src) {
    const first = this.container.querySelector(".pc-img");
    if (first) first.src = src;
  }

  /* ─── Micro-animations ────────────────────────────────────────────── */

  _animateIn() {
    this.container.style.opacity = "0";
    this.container.style.transform = "translateY(18px)";
    requestAnimationFrame(() => {
      this.container.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      this.container.style.opacity = "1";
      this.container.style.transform = "translateY(0)";
    });
  }

  _popAnimation(el) {
    el.style.transform = "scale(1.3)";
    setTimeout(() => { el.style.transform = ""; }, 200);
  }

  _addToCartAnimation(btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> Added!`;
    btn.classList.add("pc-add-btn--success");
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.classList.remove("pc-add-btn--success");
    }, 1800);
  }

  /* ─── Utilities ───────────────────────────────────────────────────── */

  _renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => {
      const filled = rating >= i + 1;
      const half = !filled && rating >= i + 0.5;
      return `<svg viewBox="0 0 20 20" width="13" height="13" fill="${filled || half ? "#f5a623" : "none"}" stroke="#f5a623" stroke-width="1.5">
        <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7"/>
      </svg>`;
    }).join("");
  }

  /* ─── Styles ──────────────────────────────────────────────────────── */

  _injectStyles() {
    if (document.getElementById("pc-styles")) return;
    const style = document.createElement("style");
    style.id = "pc-styles";
    style.textContent = `
      .pc-card {
        border-radius: 14px;
        overflow: hidden;
        background: #fff;
        box-shadow: 0 2px 12px rgba(0,0,0,0.07);
        transition: box-shadow 0.25s, transform 0.25s;
        position: relative;
        font-family: 'Helvetica Neue', Arial, sans-serif;
        max-width: 320px;
      }
      .pc-card:hover {
        box-shadow: 0 8px 32px rgba(0,0,0,0.13);
        transform: translateY(-3px);
      }
      .pc-card--dark { background: #1a1a1a; color: #f0f0f0; }
      .pc-card--oos { opacity: 0.7; }

      /* Image */
      .pc-image-wrap {
        position: relative; overflow: hidden; background: #f7f7f7;
      }
      .pc-card--dark .pc-image-wrap { background: #222; }
      .pc-images { width: 100%; height: 100%; position: relative; }
      .pc-img {
        position: absolute; inset: 0; width: 100%; height: 100%;
        object-fit: cover; opacity: 0;
        transition: opacity 0.35s ease;
      }
      .pc-img--active { opacity: 1; }

      .pc-badge {
        position: absolute; top: 12px; left: 12px; z-index: 2;
        padding: 4px 10px; border-radius: 20px;
        font-size: 10px; font-weight: 800; letter-spacing: 0.8px; text-transform: uppercase;
        background: #111; color: #fff;
      }
      .pc-badge--sale { background: #e53e3e; }
      .pc-badge--new { background: #38a169; }
      .pc-badge--sold-out { background: #718096; }

      .pc-img-dots {
        position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
        display: flex; gap: 5px; z-index: 2;
      }
      .pc-dot {
        width: 6px; height: 6px; border-radius: 50%;
        background: rgba(255,255,255,0.5); cursor: pointer;
        transition: background 0.2s, transform 0.2s; border: none;
      }
      .pc-dot--active { background: #fff; transform: scale(1.3); }

      .pc-arrow {
        position: absolute; top: 50%; transform: translateY(-50%);
        background: rgba(255,255,255,0.85); border: none; cursor: pointer;
        width: 30px; height: 30px; border-radius: 50%;
        font-size: 18px; color: #333;
        opacity: 0; pointer-events: none;
        transition: opacity 0.2s;
        display: flex; align-items: center; justify-content: center;
        z-index: 2;
      }
      .pc-arrow--prev { left: 8px; }
      .pc-arrow--next { right: 8px; }
      .pc-image-wrap:hover .pc-arrow { opacity: 1; pointer-events: all; }

      .pc-actions {
        position: absolute; top: 10px; right: 10px; z-index: 3;
        display: flex; flex-direction: column; gap: 8px;
        opacity: 0; pointer-events: none; transform: translateX(6px);
        transition: opacity 0.2s, transform 0.2s;
      }
      .pc-image-wrap:hover .pc-actions { opacity: 1; pointer-events: all; transform: translateX(0); }
      .pc-wish, .pc-quick {
        width: 34px; height: 34px; border-radius: 50%;
        background: #fff; border: none; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        transition: all 0.2s; color: #888;
      }
      .pc-wish svg, .pc-quick svg { width: 15px; height: 15px; }
      .pc-wish:hover, .pc-quick:hover { background: #111; color: #fff; }
      .pc-wish--active { color: #e53e3e !important; }
      .pc-wish--active svg { fill: #e53e3e; stroke: #e53e3e; }

      /* Info */
      .pc-info { padding: 14px 16px 16px; }
      .pc-brand { margin: 0 0 2px; font-size: 10px; font-weight: 700; letter-spacing: 0.8px; text-transform: uppercase; color: #aaa; }
      .pc-card--dark .pc-brand { color: #666; }
      .pc-title { margin: 0 0 6px; font-size: 14.5px; font-weight: 600; color: #111; line-height: 1.35; }
      .pc-card--dark .pc-title { color: #f0f0f0; }

      .pc-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; }
      .pc-stars { display: flex; gap: 1px; }
      .pc-review-count { font-size: 11px; color: #999; }

      .pc-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 10px; flex-wrap: wrap; }
      .pc-price { font-size: 16px; font-weight: 700; color: #111; }
      .pc-card--dark .pc-price { color: #f0f0f0; }
      .pc-compare { font-size: 13px; color: #bbb; text-decoration: line-through; }
      .pc-discount { font-size: 11px; font-weight: 700; color: #e53e3e; background: #fff0f0; padding: 2px 6px; border-radius: 4px; }

      .pc-colors { display: flex; gap: 7px; margin-bottom: 10px; flex-wrap: wrap; }
      .pc-color {
        width: 20px; height: 20px; border-radius: 50%; border: 2px solid transparent;
        cursor: pointer; transition: all 0.15s; outline: none;
        box-shadow: 0 0 0 1px rgba(0,0,0,0.15);
      }
      .pc-color--active { border-color: #111; box-shadow: 0 0 0 3px rgba(0,0,0,0.15); }

      .pc-sizes { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
      .pc-size {
        padding: 5px 11px; border: 1.5px solid #ddd; background: #fff;
        cursor: pointer; border-radius: 6px; font-size: 11.5px; font-weight: 600; color: #444;
        transition: all 0.15s;
      }
      .pc-size:hover { border-color: #111; color: #111; }
      .pc-size--active { background: #111; border-color: #111; color: #fff; }
      .pc-card--dark .pc-size { background: #2a2a2a; border-color: #444; color: #ccc; }
      .pc-card--dark .pc-size--active { background: #f0f0f0; border-color: #f0f0f0; color: #111; }

      .pc-add-btn {
        width: 100%; padding: 11px 16px; border: none; border-radius: 8px;
        background: #111; color: #fff; font-size: 13px; font-weight: 700;
        cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        transition: background 0.2s, transform 0.1s;
        letter-spacing: 0.3px;
      }
      .pc-add-btn:hover:not(:disabled) { background: #333; }
      .pc-add-btn:active:not(:disabled) { transform: scale(0.98); }
      .pc-add-btn--oos { background: #e0e0e0; color: #999; cursor: not-allowed; }
      .pc-add-btn--success { background: #38a169 !important; }
      .pc-card--dark .pc-add-btn { background: #f0f0f0; color: #111; }
      .pc-card--dark .pc-add-btn:hover:not(:disabled) { background: #ccc; }
    `;
    document.head.appendChild(style);
  }
}

/* ─── Auto-init from HTML ─────────────────────────────────────────── */
ProductCard.autoInit = function () {
  document.querySelectorAll("[data-product-card]").forEach((el) => {
    try {
      const data = JSON.parse(el.dataset.product ?? "{}");
      const opts = JSON.parse(el.dataset.productOptions ?? "{}");
      new ProductCard(el, data, opts);
    } catch (e) {
      console.warn("[ProductCard] Failed to parse