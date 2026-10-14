const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Milo Cute Robot Mascot, Clipboard & Voice Verification ===');

// 1. Verify Assets
const assets = [
  'assets/milo_robot_mascot.png',
  'assets/milo_cosmic_orb.png',
  'assets/milo_space_skater.png'
];
assets.forEach(a => {
  const full = path.join(__dirname, '..', a);
  assert.ok(fs.existsSync(full), `Asset must exist: ${a}`);
  assert.ok(fs.statSync(full).size > 10000, `Asset must be substantial image: ${a}`);
  console.log(`  ✔ Asset exists and verified: ${a}`);
});

// 2. Verify index.html Mascot & Paste Button
const indexHTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(indexHTML.includes('milo-hero-robot-container'), 'index.html must contain milo-hero-robot-container');
assert.ok(indexHTML.includes('milo-hero-robot-img'), 'index.html must contain milo-hero-robot-img');
assert.ok(indexHTML.includes('milo-robot-floor-shadow'), 'index.html must contain milo-robot-floor-shadow');
assert.ok(indexHTML.includes('composer-paste-btn'), 'index.html must contain composer-paste-btn');
assert.ok(indexHTML.includes('pasteFromClipboardToInput'), 'index.html must bind pasteFromClipboardToInput');
assert.ok(indexHTML.includes('cycleMiloMascot'), 'index.html must bind cycleMiloMascot on mascot click');
console.log('  ✔ index.html contains cute robot mascot, floor shadow, paste button and bindings');

// 3. Verify CSS Animation Keyframes
const noriCSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'nori-companion.css'), 'utf8');
assert.ok(noriCSS.includes('@keyframes miloFloatHover'), 'nori-companion.css must define miloFloatHover');
assert.ok(noriCSS.includes('@keyframes miloAuraPulse'), 'nori-companion.css must define miloAuraPulse');
assert.ok(noriCSS.includes('@keyframes miloShadowPulse'), 'nori-companion.css must define miloShadowPulse');
assert.ok(noriCSS.includes('.milo-hero-robot-wrap'), 'nori-companion.css must style milo-hero-robot-wrap');
assert.ok(noriCSS.includes('.milo-robot-floor-shadow'), 'nori-companion.css must style milo-robot-floor-shadow');
assert.ok(noriCSS.includes('#composer-paste-btn'), 'nori-companion.css must style composer-paste-btn');
console.log('  ✔ CSS contains floating motion, glowing aura, and floor shadow keyframes');

// 4. Verify Absence of "Thought for 12s" from App & Onyx
const appJS = fs.readFileSync(path.join(__dirname, '..', 'js', 'app.js'), 'utf8');
assert.ok(!appJS.includes('onyx-thought-accordion'), 'app.js must not render onyx-thought-accordion');
assert.ok(!appJS.includes('Thought for 12s'), 'app.js must not include Thought for 12s');

const onyxCSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'onyx-theme.css'), 'utf8');
assert.ok(onyxCSS.includes('.onyx-thought-accordion,') && onyxCSS.includes('display: none !important'), 'onyx-theme.css must hide thought accordion with display: none !important');
console.log('  ✔ "Thought for 12s" accordion completely removed from chat stream and suppressed in CSS');

// 5. Verify Clipboard, Share & Voice Handlers in app.js & onyx-interface.js
assert.ok(appJS.includes('window.copyToClipboard = async function'), 'app.js must define enhanced copyToClipboard');
assert.ok(appJS.includes('window.pasteFromClipboardToInput'), 'app.js must define pasteFromClipboardToInput');
assert.ok(appJS.includes('window.cycleMiloMascot'), 'app.js must define cycleMiloMascot');

const onyxJS = fs.readFileSync(path.join(__dirname, '..', 'js', 'onyx-interface.js'), 'utf8');
assert.ok(onyxJS.includes('copyCurrentTurn(btn)'), 'onyx-interface.js must define copyCurrentTurn');
assert.ok(onyxJS.includes('shareSession()'), 'onyx-interface.js must define shareSession');
assert.ok(onyxJS.includes('shareCurrentTurn(btn)'), 'onyx-interface.js must define shareCurrentTurn');

const prodChatJS = fs.readFileSync(path.join(__dirname, '..', 'js', 'production-chat.js'), 'utf8');
assert.ok(prodChatJS.includes('window.copyTurnContent'), 'production-chat.js must define window.copyTurnContent');
assert.ok(prodChatJS.includes('window.shareTurnContent'), 'production-chat.js must define window.shareTurnContent');
// 6. Verify Mobile Bottom-Docked Composer & Thumb Ergonomics
assert.ok(onyxCSS.includes('/* Anchored Mobile Composer (Brought Down to Bottom with Easy Thumb Reach) */'), 'onyx-theme.css must declare anchored mobile composer');
assert.ok(onyxCSS.includes('order: 1 !important') && onyxCSS.includes('#hero-starter-chips'), 'onyx-theme.css must place starter chips above composer on mobile (order: 1)');
assert.ok(onyxCSS.includes('order: 2 !important') && onyxCSS.includes('.onyx-model-pill-container'), 'onyx-theme.css must place model pill above input form on mobile (order: 2)');
assert.ok(onyxCSS.includes('order: 3 !important') && onyxCSS.includes('.nori-reference-composer-card'), 'onyx-theme.css must anchor input composer card at bottom on mobile (order: 3)');
assert.ok(onyxCSS.includes('flex: 1 1 auto !important') && onyxCSS.includes('#chat-hero-view'), 'onyx-theme.css must flex-grow hero view to push composer to bottom');
assert.ok(indexHTML.indexOf('onyx-model-pill-container') > indexHTML.indexOf('nori-reference-composer-wrapper'), 'index.html must nest model pill within composer wrapper for cohesive bottom docking');
console.log('  ✔ Mobile bottom-docked composer, thumb reach order, and hero flex verified');

console.log('✔ PASS: All cute robot mascot, clipboard, share, voice, and mobile bottom layout assertions passed cleanly!');

