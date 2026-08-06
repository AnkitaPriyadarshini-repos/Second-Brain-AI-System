/**
 * Second Brain AI System — PWA Installer Engine
 * Manages Service Worker registration, mobile installation popup modals, and native PWA prompt execution.
 */

(function () {
  let deferredPrompt = null;
  const STORAGE_KEY_DISMISSED = 'juno_pwa_install_dismissed_time';

  // 1. Register Service Worker for Offline PWA Support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then((reg) => {
          console.log('[PWA Engine] Service Worker registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA Engine] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Detect iOS Device
  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // 3. Detect Standalone PWA Mode
  function isStandalone() {
    return (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true);
  }

  // 4. Intercept beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA Engine] beforeinstallprompt event captured');

    // Auto launch popup modal if not recently dismissed
    checkAndShowPWAInstallModal();
  });

  // 5. Check if Modal Should Auto Launch
  function checkAndShowPWAInstallModal() {
    if (isStandalone()) return; // Already installed as PWA

    const lastDismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
    const now = Date.now();

    // If dismissed less than 24 hours ago, skip auto popup
    if (lastDismissed && (now - parseInt(lastDismissed, 10) < 24 * 60 * 60 * 1000)) {
      return;
    }

    // Delay modal launch slightly for smoother UI load
    setTimeout(() => {
      showPWAInstallModal();
    }, 1500);
  }

  // 6. Show PWA Install Modal
  function showPWAInstallModal() {
    const modal = document.getElementById('pwa-install-modal');
    if (!modal) return;

    const iosBox = document.getElementById('pwa-ios-instructions');
    const installBtn = document.getElementById('pwa-modal-install-btn');

    if (isIOS()) {
      if (iosBox) iosBox.style.display = 'block';
      if (installBtn) {
        installBtn.innerHTML = `<span style="font-size: 18px;">📲</span> <span>How to Install on iPhone</span>`;
      }
    } else {
      if (iosBox) iosBox.style.display = 'none';
    }

    modal.style.display = 'flex';
  }

  // 7. Global Trigger for PWA Installation (Button click handler)
  window.triggerPWAInstall = function () {
    if (isIOS()) {
      const iosBox = document.getElementById('pwa-ios-instructions');
      if (iosBox) {
        iosBox.style.display = 'block';
        iosBox.scrollIntoView({ behavior: 'smooth' });
      }
      if (typeof showToast === 'function') {
        showToast('📱 Safari: Tap Share -> Add to Home Screen to install!');
      }
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('[PWA Engine] User accepted the PWA installation');
          window.dismissPWAInstallModal();
          if (typeof showToast === 'function') {
            showToast('🎉 Juno AI installed to Home Screen successfully!');
          }
        } else {
          console.log('[PWA Engine] User dismissed the PWA installation');
        }
        deferredPrompt = null;
      });
    } else {
      showPWAInstallModal();
    }
  };

  // 8. Dismiss Modal
  window.dismissPWAInstallModal = function () {
    const modal = document.getElementById('pwa-install-modal');
    if (modal) modal.style.display = 'none';
    localStorage.setItem(STORAGE_KEY_DISMISSED, Date.now().toString());
  };

  // 9. Listen for successful PWA installation
  window.addEventListener('appinstalled', () => {
    console.log('[PWA Engine] Juno AI App was installed');
    window.dismissPWAInstallModal();
    if (typeof showToast === 'function') {
      showToast('🎉 Juno AI app installed! Access anytime from your home screen.');
    }
  });

  // Auto-check on page load for iOS or browsers that don't emit beforeinstallprompt
  window.addEventListener('DOMContentLoaded', () => {
    if (isIOS() && !isStandalone()) {
      checkAndShowPWAInstallModal();
    }
  });

})();
