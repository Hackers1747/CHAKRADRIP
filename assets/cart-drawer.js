// ============================================================
//  CHAKRADRIP — cart-drawer.js
//  Slide-out cart panel — open, close, update, remove
// ============================================================

(() => {
  'use strict';

  const CD = window.CHAKRADRIP;

  class CartDrawer extends HTMLElement {
    connectedCallback() {
      this.drawer      = this.querySelector('[data-cart-panel]');
      this.itemsWrap   = this.querySelector('[data-cart-items]');
      this.subtotalEl  = this.querySelector('[data-cart-subtotal]');
      this.emptyEl     = this.querySelector('[data-cart-empty]');
      this.filledEl    = this.querySelector('[data-cart-filled]');
      this.checkoutBtn = this.querySelector('[data-checkout-btn]');

      // Open triggers
      document.querySelectorAll('[data-cart-open]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); this.open(); });
      });

      // Close triggers
      this.querySelector('[data-cart-close]')?.addEventListener('click', () => this.close());
      CD.events.on('overlay:click', () => this.close());
      document.addEventListener('keydown', e => { if (e.key === 'Escape') this.close(); });

      // Cart updated
      CD.events.on('cart:updated', cart => this.render(cart));
      CD.events.on('cart:item-added', () => this.open());

      // Initial render
      this.render(CD.cart);
    }

    open() {
      this.drawer.classList.add('is-open');
      this.setAttribute('aria-hidden', 'false');
      CD.overlay.show();
      CD.trapFocus(this.drawer, this.querySelector('[data-cart-close]'));
    }

    close() {
      this.drawer.classList.remove('is-open');
      this.setAttribute('aria-hidden', 'true');
      CD.overlay.hide();
    }

    render(cart) {
      if (!cart) return;

      const isEmpty = cart.item_count === 0;
      this.emptyEl?.classList.toggle('is-hidden', !isEmpty);
      this.filledEl?.classList.toggle('is-hidden', isEmpty);

      if (isEmpty) return;

      // Subtotal
      if (this.subtotalEl) {
        this.subtotalEl.textContent = CD.formatMoney(cart.total_price);
      }

      // Items
      if (this.itemsWrap) {
        this.itemsWrap.innerHTML = cart.items.map(item => this._itemHTML(item)).join('');
        this._bindItemEvents();
      }
    }

    _itemHTML(item) {
      return `
        <div class="cart-item" data-key="${item.key}">
          <a href="${item.url}" class="cart-item__image">
            <img src="${item.image}" alt="${item.product_title}" loading="lazy" width="80" height="96">
          </a>
          <div class="cart-item__body">
            <a href="${item.url}" class="cart-item__title">${item.product_title}</a>
            ${item.variant_title !== 'Default Title' ? `<p class="cart-item__variant">${item.variant_title}</p>` : ''}
            <div class="cart-item__footer">
              <div class="quantity-selector">
                <button class="quantity-selector__btn" data-qty-change="-1" aria-label="Decrease quantity">−</button>
                <input class="quantity-selector__input" type="number" value="${item.quantity}" min="0" data-qty-input>
                <button class="quantity-selector__btn" data-qty-change="1" aria-label="Increase quantity">+</button>
              </div>
              <span class="cart-item__price">${CD.formatMoney(item.final_line_price)}</span>
              <button class="cart-item__remove" data-remove aria-label="Remove ${item.product_title}">✕</button>
            </div>
          </div>
        </div>
      `;
    }

    _bindItemEvents() {
      this.itemsWrap.querySelectorAll('.cart-item').forEach(item => {
        const key = item.dataset.key;
        const qtyInput = item.querySelector('[data-qty-input]');

        // +/- buttons
        item.querySelectorAll('[data-qty-change]').forEach(btn => {
          btn.addEventListener('click', () => {
            const delta = parseInt(btn.dataset.qtyChange);
            const newQty = Math.max(0, parseInt(qtyInput.value) + delta);
            this._updateItem(key, newQty);
          });
        });

        // Direct input
        qtyInput?.addEventListener('change', () => {
          this._updateItem(key, Math.max(0, parseInt(qtyInput.value) || 0));
        });

        // Remove
        item.querySelector('[data-remove]')?.addEventListener('click', () => {
          this._updateItem(key, 0);
        });
      });
    }

    async _updateItem(key, quantity) {
      try {
        const res = await fetch(CD.routes.cart_change_url, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id: key, quantity })
        });
        const cart = await res.json();
        CD.cart = cart;
        CD.events.emit('cart:updated', cart);
      } catch {
        CD.toast.show('Could not update cart', 'error');
      }
    }
  }

  customElements.define('cart-drawer', CartDrawer);

})();
