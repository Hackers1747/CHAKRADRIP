// ============================================================
//  CHAKRADRIP — nav.js
//  Sticky nav, mobile menu, cart icon count
// ============================================================

(() => {
  'use strict';

  const CD = window.CHAKRADRIP;

  class StickyNav {
    constructor() {
      this.nav         = document.getElementById('site-nav');
      this.menuBtn     = document.getElementById('nav-menu-btn');
      this.closeBtn    = document.getElementById('nav-close-btn');
      this.mobileMenu  = document.getElementById('mobile-menu');
      this.cartCount   = document.querySelectorAll('[data-cart-count]');
      this.lastScroll  = 0;
      this.scrollThreshold = 80;

      if (!this.nav) return;
      this.init();
    }

    init() {
      // Scroll behaviour — hide on scroll down, show on scroll up
      window.addEventListener('scroll', CD.debounce(() => this.onScroll(), 10), { passive: true });

      // Mobile menu toggle
      this.menuBtn?.addEventListener('click', () => this.openMenu());
      this.closeBtn?.addEventListener('click', () => this.closeMenu());

      // Close menu on overlay click
      CD.events.on('overlay:click', () => this.closeMenu());

      // Escape key closes menu
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeMenu();
      });

      // Update cart count on cart changes
      CD.events.on('cart:updated', (cart) => this.updateCartCount(cart.item_count));

      // Set initial cart count
      this.updateCartCount(CD.cart?.item_count || 0);
    }

    onScroll() {
      const current = window.scrollY;

      // Add scrolled class after threshold
      if (current > this.scrollThreshold) {
        this.nav.classList.add('is-scrolled');
      } else {
        this.nav.classList.remove('is-scrolled');
      }

      // Hide on scroll down, reveal on scroll up
      if (current > this.lastScroll && current > 200) {
        this.nav.classList.add('is-hidden');
      } else {
        this.nav.classList.remove('is-hidden');
      }

      this.lastScroll = current <= 0 ? 0 : current;
    }

    openMenu() {
      this.mobileMenu?.classList.add('is-open');
      this.menuBtn?.setAttribute('aria-expanded', 'true');
      this.nav.classList.add('menu-open');
      CD.overlay.show();
      CD.trapFocus(this.mobileMenu, this.closeBtn);
      document.body.style.overflow = 'hidden';
    }

    closeMenu() {
      this.mobileMenu?.classList.remove('is-open');
      this.menuBtn?.setAttribute('aria-expanded', 'false');
      this.nav.classList.remove('menu-open');
      CD.overlay.hide();
      document.body.style.overflow = '';
      this.menuBtn?.focus();
    }

    updateCartCount(count) {
      this.cartCount.forEach(el => {
        el.textContent = count;
        el.classList.toggle('is-hidden', count === 0);
        if (count > 0) el.classList.add('pop');
        setTimeout(() => el.classList.remove('pop'), 400);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', () => new StickyNav());

})();
