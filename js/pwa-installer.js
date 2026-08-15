// ============================================
// Juno AI — Progressive Web App (PWA) Engine
// Handles Service Worker registration, deferred installation prompts,
// standalone app detection, and graceful device installation support.
// ============================================

(function () {
  'use strict';

  let deferredInstallPrompt = null;
  let isStandalone = false;

  // 1. Standalone Display Mode Detection
  function checkStandaloneMode() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  isStandalone = checkStandaloneMode();

  // 2. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => {
          console.log('✅ ServiceWorker registered successfully with scope:', reg.scope);
          
          // Check for service worker updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('⚡ New Juno AI Service Worker update available.');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('⚠️ ServiceWorker registration failed:', err);
        });
    });
  }

  // 3. BeforeInstallPrompt Event Capture
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent immediate automated browser mini-infobar prompt
    e.preventDefault();
    deferredInstallPrompt = e;
    console.log('📱 Captured PWA beforeinstallprompt event.');

    // Reveal in-app install pill/button if hidden
    const pwaBtn = document.getElementById('pwa-install-nav-btn');
    if (pwaBtn) {
      pwaBtn.style.display = 'flex';
    }
  });

  // 4. App Installed Event Listener
  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    isStandalone = true;
    localStorage.setItem('juno_pwa_installed', 'true');
    console.log('🎉 Juno AI successfully installed as a Progressive Web App!');

    if (typeof window.showToast === 'function') {
      window.showToast('🎉 Juno AI installed successfully! Launch it from your home screen.');
    }

    const modal = document.getElementById('pwa-install-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  });

  // 5. Global Trigger Function for PWA Installation Flow
  window.triggerPWAInstall = function () {
    if (isStandalone) {
      if (typeof window.showToast === 'function') {
        window.showToast('📱 You are using the installed Juno AI standalone app! ✓');
      }
      return;
    }

    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice
        .then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the PWA install prompt');
            if (typeof window.showToast === 'function') {
              window.showToast('📥 Installing Juno AI on your home screen...');
            }
          } else {
            console.log('User dismissed the PWA install prompt');
          }
          deferredInstallPrompt = null;
        })
        .catch((err) => {
          console.warn('Error during PWA installation prompt:', err);
        });
    } else {
      // Fallback: Gracefully display step-by-step instructions for manual installation
      window.openPWAInstallInstructionsModal();
    }
  };

  window.installPWA = window.triggerPWAInstall;

  // 6. Graceful Installation Instructions Modal
  window.openPWAInstallInstructionsModal = function () {
    let modal = document.getElementById('pwa-install-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'pwa-install-modal';
      modal.className = 'pwa-install-modal-backdrop';
      document.body.appendChild(modal);
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);

    let instructionHTML = '';
    if (isIOS) {
      instructionHTML = `
        <div class="pwa-step-item">
          <span class="step-num">1</span>
          <span>Tap the <strong>Share button</strong> <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> at the bottom of Safari.</span>
        </div>
        <div class="pwa-step-item">
          <span class="step-num">2</span>
          <span>Scroll down and select <strong>"Add to Home Screen"</strong> <span class="plus-box">＋</span>.</span>
        </div>
        <div class="pwa-step-item">
          <span class="step-num">3</span>
          <span>Tap <strong>Add</strong> in the top right corner to launch Juno AI as a native app!</span>
        </div>
      `;
    } else if (isAndroid) {
      instructionHTML = `
        <div class="pwa-step-item">
          <span class="step-num">1</span>
          <span>Tap the <strong>browser menu button (⋮)</strong> in Chrome.</span>
        </div>
        <div class="pwa-step-item">
          <span class="step-num">2</span>
          <span>Select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</span>
        </div>
        <div class="pwa-step-item">
          <span class="step-num">3</span>
          <span>Confirm installation to run Juno AI independently from Chrome!</span>
        </div>
      `;
    } else {
      instructionHTML = `
        <div class="pwa-step-item">
          <span class="step-num">1</span>
          <span>Look for the <strong>Install icon (⊕)</strong> in your browser address bar (Chrome/Edge).</span>
        </div>
        <div class="pwa-step-item">
          <span class="step-num">2</span>
          <span>Click <strong>"Install"</strong> to add Juno AI as a standalone desktop application.</span>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="pwa-install-dialog glass-panel">
        <div class="pwa-dialog-header">
          <div class="pwa-dialog-title">
            <span class="pwa-app-icon">🚀</span>
            <div>
              <h3>Install Juno AI App</h3>
              <p>Run full-screen with offline support & sub-50ms speed</p>
            </div>
          </div>
          <button class="pwa-close-btn" onclick="document.getElementById('pwa-install-modal').style.display='none'">✕</button>
        </div>

        <div class="pwa-dialog-body">
          ${instructionHTML}
        </div>

        <div class="pwa-dialog-footer">
          <button class="btn-pwa-close" onclick="document.getElementById('pwa-install-modal').style.display='none'">Got it</button>
        </div>
      </div>
    `;

    modal.style.display = 'flex';
  };

  // Export functions to window
  window.dismissPWABanner = function () {
    const banner = document.getElementById('pwa-desktop-banner');
    if (banner) {
      banner.classList.add('hiding');
      setTimeout(() => {
        banner.style.display = 'none';
      }, 300);
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
      isStandalone: isStandalone,
      canInstall: !!deferredInstallPrompt,
      serviceWorkerActive: 'serviceWorker' in navigator && !!navigator.serviceWorker.controller
    };
  };

  // Auto-init banner check on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (!isStandalone && sessionStorage.getItem('juno_pwa_banner_dismissed') !== 'true') {
        window.showPWABanner();
      }
    });
  } else {
    if (!isStandalone && sessionStorage.getItem('juno_pwa_banner_dismissed') !== 'true') {
      window.showPWABanner();
    }
  }

})();

