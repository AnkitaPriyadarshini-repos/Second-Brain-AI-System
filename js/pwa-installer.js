/* Second Brain AI System — PWA Installer & Production Chat Loader */

(function () {
  'use strict';

  let deferredInstallPrompt = null;
  let isStandalone = false;

  try {
    isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  } catch (_) {}

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('ServiceWorker registration failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const pwaBtn = document.getElementById('pwa-install-nav-btn');
    if (pwaBtn) pwaBtn.style.display = 'flex';
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    isStandalone = true;
    localStorage.setItem('juno_pwa_installed', 'true');
    if (typeof window.showToast === 'function') window.showToast('Juno AI installed successfully.');
    const modal = document.getElementById('pwa-install-modal');
    if (modal) modal.style.display = 'none';
  });

  window.triggerPWAInstall = function () {
    if (isStandalone) {
      if (typeof window.showToast === 'function') window.showToast('You are using the installed Juno AI app.');
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted' && typeof window.showToast === 'function') {
          window.showToast('Installing Juno AI…');
        }
        deferredInstallPrompt = null;
      }).catch((err) => console.warn('Error during PWA installation prompt:', err));
    } else {
      window.openPWAInstallInstructionsModal();
    }
  };

  window.openPWAInstallInstructionsModal = function () {
    let modal = document.getElementById('pwa-install-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwa-install-modal';
      modal.className = 'spec-modal-overlay';
      document.body.appendChild(modal);
    }

    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/i.test(ua);
    let instructionHTML = '';

    if (isIOS) {
      instructionHTML = '<div class="pwa-step-item"><span class="step-num">1</span><span>Tap <strong>Share</strong> in Safari.</span></div><div class="pwa-step-item"><span class="step-num">2</span><span>Select <strong>Add to Home Screen</strong>.</span></div><div class="pwa-step-item"><span class="step-num">3</span><span>Tap <strong>Add</strong>.</span></div>';
    } else if (isAndroid) {
      instructionHTML = '<div class="pwa-step-item"><span class="step-num">1</span><span>Open the Chrome browser menu.</span></div><div class="pwa-step-item"><span class="step-num">2</span><span>Select <strong>Add to Home screen</strong> or <strong>Install app</strong>.</span></div><div class="pwa-step-item"><span class="step-num">3</span><span>Confirm the installation.</span></div>';
    } else {
      instructionHTML = '<div class="pwa-step-item"><span class="step-num">1</span><span>Look for the browser <strong>Install</strong> icon near the address bar.</span></div><div class="pwa-step-item"><span class="step-num">2</span><span>Click <strong>Install</strong>.</span></div>';
    }

    modal.innerHTML = `<div class="pwa-install-dialog glass-panel"><div class="pwa-dialog-header"><div class="pwa-dialog-title"><span class="pwa-app-icon">J</span><div><h3>Install Juno AI</h3><p>A focused workspace for your notes and ideas.</p></div></div><button class="pwa-close-btn" onclick="document.getElementById('pwa-install-modal').style.display='none'">✕</button></div><div class="pwa-dialog-body">${instructionHTML}</div><div class="pwa-dialog-footer"><button class="btn-pwa-close" onclick="document.getElementById('pwa-install-modal').style.display='none'">Got it</button></div></div>`;
    modal.style.display = 'flex';
  };

  window.dismissPWABanner = function () {
    const banner = document.getElementById('pwa-desktop-banner');
    if (banner) {
      banner.classList.add('hiding');
      setTimeout(() => { banner.style.display = 'none'; }, 300);
    }
    sessionStorage.setItem('juno_pwa_banner_dismissed', 'true');
  };

  window.showPWABanner = function () {
    const banner = document.getElementById('pwa-desktop-banner');
    if (banner && !isStandalone) {
      banner.style.display = 'flex';
      banner.classList.remove('hiding');
    }
  };

  window.checkPWAStatus = function () {
    return {
      isStandalone,
      canInstall: !!deferredInstallPrompt,
      serviceWorkerActive: 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
    };
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!isStandalone && sessionStorage.getItem('juno_pwa_banner_dismissed') !== 'true') window.showPWABanner();
    });
  } else if (!isStandalone && sessionStorage.getItem('juno_pwa_banner_dismissed') !== 'true') {
    window.showPWABanner();
  }

  // Load the single production chat controller after legacy app bootstrap.
  // The version query is intentionally bumped whenever the controller changes.
  setTimeout(() => {
    if (document.querySelector('script[data-juno-production-chat]')) return;
    const script = document.createElement('script');
    script.src = 'js/production-chat.js?v=2.0';
    script.dataset.junoProductionChat = 'true';
    document.body.appendChild(script);
  }, 0);
})();
