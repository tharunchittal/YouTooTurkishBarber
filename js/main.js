(function () {
  'use strict';

  /* ---------- Lucide icons ---------- */
  if (window.lucide) {
    window.lucide.createIcons();
  }

  /* ---------- Mockup notice banner: keep sticky-header offsets in sync ---------- */
  var mockupNotice = document.getElementById('mockup-notice');
  if (mockupNotice) {
    var updateBannerHeightVar = function () {
      var height = document.body.contains(mockupNotice) ? mockupNotice.offsetHeight : 0;
      document.documentElement.style.setProperty('--banner-height', height + 'px');
    };
    updateBannerHeightVar();
    window.addEventListener('resize', updateBannerHeightVar);
    // The dismiss button removes the banner from the DOM directly (inline
    // onclick) — watch for that so the nav/scroll offsets settle back to 0.
    new MutationObserver(updateBannerHeightVar).observe(document.body, { childList: true });
  }

  /* ---------- Sticky nav: active tab tracking via IntersectionObserver ---------- */
  var navPills = Array.prototype.slice.call(document.querySelectorAll('.nav-pill'));
  var sections = navPills
    .map(function (pill) {
      var id = pill.getAttribute('href');
      return id ? document.querySelector(id) : null;
    })
    .filter(Boolean);

  function setActivePill(id) {
    navPills.forEach(function (pill) {
      var isActive = pill.getAttribute('href') === '#' + id;
      pill.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  // While a click-triggered smooth scroll is in flight, the observer can catch
  // sections it's transiting through (e.g. Gallery, en route from Reviews back
  // up to Services) and briefly mark them active. Suppress observer updates
  // until that scroll settles so the clicked pill "wins".
  var suppressObserverUntilSettled = false;
  var settleTimeoutId = null;

  function resumeObserver() {
    suppressObserverUntilSettled = false;
    window.removeEventListener('scrollend', resumeObserver);
    if (settleTimeoutId) {
      clearTimeout(settleTimeoutId);
      settleTimeoutId = null;
    }
  }

  if ('IntersectionObserver' in window && sections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        if (suppressObserverUntilSettled) return;
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActivePill(entry.target.id);
          }
        });
      },
      {
        // Treat the section as "active" once it occupies the vertical center band
        // of the viewport, accounting for the sticky top bar / bottom tab bar.
        rootMargin: '-45% 0px -45% 0px',
        threshold: 0
      }
    );
    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* ---------- Smooth scroll with sticky-bar offset ---------- */
  navPills.forEach(function (pill) {
    pill.addEventListener('click', function (e) {
      var targetId = pill.getAttribute('href');
      var target = targetId ? document.querySelector(targetId) : null;
      if (!target) return;
      e.preventDefault();
      // Clear any pending settle-cleanup from a previous click before starting a new one.
      window.removeEventListener('scrollend', resumeObserver);
      if (settleTimeoutId) clearTimeout(settleTimeoutId);
      suppressObserverUntilSettled = true;
      setActivePill(target.id);
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', targetId);
      window.addEventListener('scrollend', resumeObserver);
      // Fallback in case 'scrollend' isn't supported by the browser.
      settleTimeoutId = setTimeout(resumeObserver, 1000);
    });
  });

  /* ---------- Entrance / reveal animations ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
    );
    revealEls.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    revealEls.forEach(function (el) {
      el.classList.add('in-view');
    });
  }

  /* ---------- Service category toggle (Hair / Beard & Shave / Extras) ---------- */
  var serviceTabs = Array.prototype.slice.call(document.querySelectorAll('.service-tab'));
  var servicePanels = Array.prototype.slice.call(document.querySelectorAll('.service-panel'));

  function activateServiceTab(tab) {
    serviceTabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', selected ? 'true' : 'false');
      t.tabIndex = selected ? 0 : -1;
    });
    var targetPanelId = tab.getAttribute('aria-controls');
    servicePanels.forEach(function (panel) {
      panel.hidden = panel.id !== targetPanelId;
    });
  }

  serviceTabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      activateServiceTab(tab);
    });
    tab.addEventListener('keydown', function (e) {
      var newIndex = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIndex = (index + 1) % serviceTabs.length;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIndex = (index - 1 + serviceTabs.length) % serviceTabs.length;
      }
      if (newIndex !== null) {
        e.preventDefault();
        serviceTabs[newIndex].focus();
        activateServiceTab(serviceTabs[newIndex]);
      }
    });
  });

  /* ---------- FAQ accordion ---------- */
  var accordionItems = Array.prototype.slice.call(document.querySelectorAll('.accordion-item'));
  accordionItems.forEach(function (item) {
    var button = item.querySelector('.accordion-trigger');
    var panel = item.querySelector('.accordion-panel');
    if (!button || !panel) return;

    // Panel starts closed: keep it out of the accessibility tree until opened.
    panel.setAttribute('aria-hidden', 'true');

    button.addEventListener('click', function () {
      var isOpen = item.getAttribute('data-open') === 'true';
      var willOpen = !isOpen;
      item.setAttribute('data-open', willOpen ? 'true' : 'false');
      button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
    });
  });

  /* ---------- Gallery lightbox ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxImg = document.getElementById('lightbox-img');
  var lightboxCaption = document.getElementById('lightbox-caption');
  var lightboxCloseBtn = document.getElementById('lightbox-close');
  var galleryThumbs = Array.prototype.slice.call(document.querySelectorAll('.gallery-thumb'));
  var lastFocusedEl = null;

  function openLightbox(thumb) {
    var img = thumb.querySelector('img');
    if (!img || !lightbox || !lightboxImg) return;
    lastFocusedEl = thumb;
    lightboxImg.src = img.getAttribute('data-full') || img.src;
    lightboxImg.alt = img.alt || '';
    if (lightboxCaption) {
      lightboxCaption.textContent = img.alt || '';
    }
    lightbox.setAttribute('data-open', 'true');
    lightbox.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lightboxCloseBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.setAttribute('data-open', 'false');
    lightbox.classList.add('hidden');
    document.body.style.overflow = '';
    if (lightboxImg) lightboxImg.src = '';
    if (lastFocusedEl) lastFocusedEl.focus();
  }

  galleryThumbs.forEach(function (thumb) {
    thumb.addEventListener('click', function () {
      openLightbox(thumb);
    });
    thumb.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openLightbox(thumb);
      }
    });
  });

  if (lightbox) {
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) closeLightbox();
    });
  }
  if (lightboxCloseBtn) {
    lightboxCloseBtn.addEventListener('click', closeLightbox);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && lightbox && lightbox.getAttribute('data-open') === 'true') {
      closeLightbox();
    }
  });

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
