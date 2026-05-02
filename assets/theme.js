// ============================================================
//  CHAKRADRIP — theme.js
//  Global utilities, helpers, event bus
// ============================================================

(() => {
  'use strict';

  const CD = window.CHAKRADRIP;

  // ── Event Bus ──────────────────────────────────────────────
  CD.events = {
    _listeners: {},
    on(event, fn)  { (this._listeners[event] ||= []).push(fn); },
    off(event, fn) { this._listeners[event] = (this._listeners[event] || []).filter(f => f !== fn); },
    emit(event, data) { (this._listeners[event] || []).forEach(fn => fn(data)); }
  };

  // ── Format money ───────────────────────────────────────────
  CD.formatMoney = (cents, format) => {
    if (!format) format = CD.shop.money_format;
    const value = (cents / 100).toFixed(2);
    return format.replace(/\{\{\s*amount\s*\}\}/, value)
                 .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(cents / 100));
  };

  // ── Toast notification ─────────────────────────────────────
  CD.toast = (() => {
    let el = null;
    let timer = null;

    const getEl = () => {
      if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        document.body.appendChild(el);
      }
      return el;
    };

    return {
      show(msg, type = '', duration = 3000) {
        const toast = getEl();
        toast.textContent = msg;
        toast.className   = `toast toast--${type}`;
        requestAnimationFrame(() => toast.classList.add('is-visible'));
        clearTimeout(timer);
        timer = setTimeout(() => toast.classList.remove('is-visible'), duration);
      }
    };
  })();

  // ── Trap focus in modals ───────────────────────────────────
  CD.trapFocus = (container, focusEl) => {
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];

    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };

    container.addEventListener('keydown', onKeyDown);
    (focusEl || first)?.focus();
    return () => container.removeEventListener('keydown', onKeyDown);
  };

  // ── Overlay ────────────────────────────────────────────────
  const overlay = document.getElementById('global-overlay');

  CD.overlay = {
    _stack: 0,
    show() {
      this._stack++;
      overlay.classList.add('is-active');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    },
    hide() {
      this._stack = Math.max(0, this._stack - 1);
      if (this._stack === 0) {
        overlay.classList.remove('is-active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }
    }
  };

  overlay?.addEventListener('click', () => {
    CD.events.emit('overlay:click');
  });

  // ── Fetch cart ─────────────────────────────────────────────
  CD.fetchCart = async () => {
    const res  = await fetch(`${CD.routes.cart_url}.js`);
    const cart = await res.json();
    CD.cart = cart;
    CD.events.emit('cart:updated', cart);
    return cart;
  };

  // ── Add to cart ────────────────────────────────────────────
  CD.addToCart = async (variantId, quantity = 1, properties = {}) => {
    const res = await fetch(CD.routes.cart_add_url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body:    JSON.stringify({ id: variantId, quantity, properties })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.description || 'Could not add to cart');
    }

    const item = await res.json();
    await CD.fetchCart();
    CD.events.emit('cart:item-added', item);
    return item;
  };

  // ── Scroll reveal — IntersectionObserver ──────────────────
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
  }

  // ── Debounce ───────────────────────────────────────────────
  CD.debounce = (fn, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  // ── Init on DOMContentLoaded ───────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // Animate elements with data-reveal on load
    document.querySelectorAll('[data-reveal]').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.08}s`;
    });
  });

})();
