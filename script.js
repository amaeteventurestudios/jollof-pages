/* ============================================================
   JOLLOF PAGES — script.js
   Theme toggle, login logic, dashboard interactions
   ============================================================ */

(function () {
  'use strict';

  /* ── Constants ── */
  const THEME_KEY    = 'jp_theme';
  const DEMO_USER    = 'jollof';
  const DEMO_PASS    = 'pages';
  const DARK_THEME   = 'dark';
  const LIGHT_THEME  = 'light';

  /* ── Theme Management ── */

  function getStoredTheme() {
    return localStorage.getItem(THEME_KEY) || DARK_THEME;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateToggleButtons(theme);
  }

  function toggleTheme() {
    const current = getStoredTheme();
    applyTheme(current === DARK_THEME ? LIGHT_THEME : DARK_THEME);
  }

  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle');
    buttons.forEach(function (btn) {
      const icon  = btn.querySelector('.toggle-icon');
      const label = btn.querySelector('.toggle-label');

      if (icon) {
        icon.textContent = theme === DARK_THEME ? '☀️' : '🌙';
      }
      if (label) {
        label.textContent = theme === DARK_THEME ? 'Light' : 'Dark';
      }
      btn.setAttribute('aria-label', 'Switch to ' + (theme === DARK_THEME ? 'light' : 'dark') + ' mode');
      btn.setAttribute('title',      'Switch to ' + (theme === DARK_THEME ? 'light' : 'dark') + ' mode');
    });
  }

  function initTheme() {
    applyTheme(getStoredTheme());
  }

  function bindThemeToggles() {
    document.addEventListener('click', function (e) {
      var toggle = e.target.closest('.theme-toggle');
      if (toggle) toggleTheme();
    });
  }

  /* ── Login Page Logic ── */

  function initLoginPage() {
    var form     = document.getElementById('loginForm');
    var usernameInput = document.getElementById('loginUsername');
    var passwordInput = document.getElementById('loginPassword');
    var toggleBtn = document.getElementById('togglePassword');
    var errorBox  = document.getElementById('loginError');
    var submitBtn = document.getElementById('loginSubmit');

    if (!form) return;

    /* Show/hide password */
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', function () {
        var isText = passwordInput.type === 'text';
        passwordInput.type = isText ? 'password' : 'text';
        toggleBtn.textContent = isText ? '👁' : '🙈';
        toggleBtn.setAttribute('aria-label', isText ? 'Show password' : 'Hide password');
      });
    }

    /* Auto-fill demo credentials on click */
    var demoFill = document.getElementById('demoFill');
    if (demoFill) {
      demoFill.addEventListener('click', function () {
        if (usernameInput) usernameInput.value = DEMO_USER;
        if (passwordInput) passwordInput.value = DEMO_PASS;
        hideError();
      });
    }

    /* Form submit */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      handleLogin(
        usernameInput ? usernameInput.value.trim() : '',
        passwordInput ? passwordInput.value        : '',
        errorBox,
        submitBtn
      );
    });

    /* Clear error on input */
    [usernameInput, passwordInput].forEach(function (el) {
      if (el) el.addEventListener('input', hideError);
    });

    function hideError() {
      if (errorBox) {
        errorBox.classList.remove('show');
      }
    }
  }

  function handleLogin(username, password, errorBox, submitBtn) {
    if (!username || !password) {
      showError(errorBox, '⚠️ Please enter both username and password.');
      return;
    }

    if (username === DEMO_USER && password === DEMO_PASS) {
      /* Success */
      if (submitBtn) {
        submitBtn.textContent = '✓ Redirecting…';
        submitBtn.disabled    = true;
        submitBtn.style.opacity = '0.8';
      }
      setTimeout(function () {
        window.location.href = 'dashboard.html';
      }, 600);
    } else {
      showError(errorBox, '❌ Incorrect username or password. Try the demo credentials below.');
    }
  }

  function showError(errorBox, message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.classList.add('show');

    /* Shake animation */
    var loginBox = document.querySelector('.login-box');
    if (loginBox) {
      loginBox.style.animation = 'none';
      loginBox.offsetHeight; /* reflow */
      loginBox.style.animation = 'shake 0.4s ease';
    }
  }

  /* ── Dashboard Logic ── */

  function initDashboard() {
    var sidebar = document.getElementById('dashSidebar');
    if (!sidebar) return;

    var toggleBtn = document.getElementById('sidebarToggle');
    var overlay   = document.getElementById('sidebarOverlay');

    /* Sidebar mobile toggle */
    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        openSidebar(sidebar, overlay);
      });
    }
    if (overlay) {
      overlay.addEventListener('click', function () {
        closeSidebar(sidebar, overlay);
      });
    }

    /* Close on Escape */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeSidebar(sidebar, overlay);
    });

    /* Module cards — placeholder interaction */
    var moduleCards = document.querySelectorAll('.module-card');
    moduleCards.forEach(function (card) {
      card.addEventListener('click', function () {
        var title = card.querySelector('.module-card-title');
        var status = card.querySelector('.module-status');
        if (status && status.classList.contains('coming-soon')) {
          showToast('🚧 ' + (title ? title.textContent : 'This module') + ' is coming in a future version.', 'info');
        } else if (status && status.classList.contains('ready')) {
          showToast('✓ ' + (title ? title.textContent : 'Module') + ' — ready to build on.', 'success');
        }
      });
    });

    /* Sidebar nav items */
    var navItems = document.querySelectorAll('.sidebar-nav-item');
    navItems.forEach(function (item) {
      item.addEventListener('click', function () {
        /* Remove active from all, add to clicked */
        navItems.forEach(function (n) { n.classList.remove('active'); });
        item.classList.add('active');
        /* On mobile, close sidebar */
        if (window.innerWidth <= 992) {
          closeSidebar(sidebar, overlay);
        }
      });
    });

    /* Quick start items */
    var qsItems = document.querySelectorAll('.quickstart-item');
    qsItems.forEach(function (item) {
      item.addEventListener('click', function () {
        var label = item.querySelector('span:not(.qs-icon):not(.qs-arrow)');
        showToast('🚧 ' + (label ? label.textContent : 'Feature') + ' — coming soon.', 'info');
      });
    });
  }

  function openSidebar(sidebar, overlay) {
    if (sidebar) sidebar.classList.add('open');
    if (overlay) overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebar(sidebar, overlay) {
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
    document.body.style.overflow = '';
  }

  /* ── Toast Notification ── */

  var toastTimer = null;

  function showToast(message, type) {
    var existing = document.getElementById('jpToast');
    if (existing) existing.remove();
    if (toastTimer) clearTimeout(toastTimer);

    var toast = document.createElement('div');
    toast.id = 'jpToast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    var bgColor = type === 'success' ? 'rgba(39,201,63,0.15)' : 'rgba(232,98,42,0.15)';
    var borderColor = type === 'success' ? 'rgba(39,201,63,0.30)' : 'rgba(232,98,42,0.30)';
    var textColor = type === 'success' ? '#27c93f' : 'var(--accent)';

    toast.style.cssText = [
      'position: fixed',
      'bottom: 28px',
      'right: 28px',
      'z-index: 9999',
      'background: var(--bg-card)',
      'border: 1px solid ' + borderColor,
      'border-radius: 10px',
      'padding: 14px 20px',
      'font-size: 0.88rem',
      'font-weight: 500',
      'color: ' + textColor,
      'box-shadow: 0 8px 32px rgba(0,0,0,0.3)',
      'max-width: 340px',
      'animation: fadeUp 0.3s ease forwards',
      'font-family: var(--font-sans)',
      'backdrop-filter: blur(12px)',
    ].join(';');

    toast.textContent = message;
    document.body.appendChild(toast);

    toastTimer = setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(function () {
        if (toast.parentNode) toast.remove();
      }, 300);
    }, 3000);
  }

  /* ── Smooth Scroll for Anchor Links ── */

  function initSmoothScroll() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  /* ── Intersection Observer — Fade Animations ── */

  function initScrollAnimations() {
    if (!window.IntersectionObserver) return;

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '';
          entry.target.style.transform = '';
          entry.target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    document.querySelectorAll('.feature-card, .chaos-card, .module-card, .status-card').forEach(function (el) {
      if (!el.closest('.hero')) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        observer.observe(el);
      }
    });
  }

  /* ── Topbar scroll effect ── */

  function initTopbarScroll() {
    var topbar = document.querySelector('.topbar');
    if (!topbar) return;

    window.addEventListener('scroll', function () {
      if (window.scrollY > 40) {
        topbar.style.background = 'var(--bg-overlay)';
      } else {
        topbar.style.background = 'transparent';
      }
    }, { passive: true });
  }

  /* ── Shake Keyframe Injection ── */

  function injectShakeKeyframe() {
    var style = document.createElement('style');
    style.textContent = '@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }';
    document.head.appendChild(style);
  }

  /* ── Init ── */

  function init() {
    initTheme();
    bindThemeToggles();
    initSmoothScroll();
    initScrollAnimations();
    injectShakeKeyframe();

    /* Page-specific inits */
    var page = document.body.dataset.page;

    if (page === 'login') {
      initLoginPage();
    } else if (page === 'dashboard') {
      initDashboard();
    } else if (page === 'landing') {
      initTopbarScroll();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
