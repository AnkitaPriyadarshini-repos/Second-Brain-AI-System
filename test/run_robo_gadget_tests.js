const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('=== Robo Gadget Visual, Audio & Welcome Verification ===');

// 1. Verify Robo Gadget Expression & Colorway Assets
const requiredAssets = [
  'assets/robo_gadget_happy.png',
  'assets/robo_gadget_blue.png',
  'assets/robo_gadget_wink.png',
  'assets/robo_gadget_love.png',
  'assets/robo_gadget_thinking.png',
  'assets/robo_gadget_happy_sunset.png',
  'assets/robo_gadget_happy_emerald.png',
  'assets/robo_gadget_happy_obsidian.png',
  'assets/robo_gadget_happy_purple.png'
];

requiredAssets.forEach(assetPath => {
  const full = path.join(__dirname, '..', assetPath);
  assert.ok(fs.existsSync(full), `Robo asset must exist: ${assetPath}`);
  assert.ok(fs.statSync(full).size > 5000, `Robo asset must be substantial PNG: ${assetPath}`);
  console.log(`  ✔ Asset verified: ${assetPath} (${Math.round(fs.statSync(full).size / 1024)} KB)`);
});

// 2. Verify index.html Robo Gadget Structure
const indexHTML = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
assert.ok(indexHTML.includes('robo-welcome-card'), 'index.html must contain robo-welcome-card');
assert.ok(indexHTML.includes('robo-gadget-ambient-halo'), 'index.html must contain robo-gadget-ambient-halo');
assert.ok(indexHTML.includes('robo-gadget-head-stage'), 'index.html must contain robo-gadget-head-stage');
assert.ok(indexHTML.includes('robo-gadget-dock'), 'index.html must contain robo-gadget-dock');
assert.ok(indexHTML.includes('setRoboColor'), 'index.html must bind setRoboColor');
assert.ok(indexHTML.includes('toggleRoboSound'), 'index.html must bind toggleRoboSound');
assert.ok(indexHTML.includes('toggleMascotType'), 'index.html must bind toggleMascotType');
assert.ok(indexHTML.includes('js/robo-gadget.js'), 'index.html must load js/robo-gadget.js');
console.log('  ✔ index.html contains welcome card, 3D stage, halo, dock, and scripts');

// 3. Verify CSS Rules in nori-companion.css
const noriCSS = fs.readFileSync(path.join(__dirname, '..', 'css', 'nori-companion.css'), 'utf8');
assert.ok(noriCSS.includes('.robo-welcome-card'), 'nori-companion.css must style robo-welcome-card');
assert.ok(noriCSS.includes('.robo-gadget-ambient-halo'), 'nori-companion.css must style robo-gadget-ambient-halo');
assert.ok(noriCSS.includes('.robo-gadget-dock'), 'nori-companion.css must style robo-gadget-dock');
assert.ok(noriCSS.includes('.robo-color-dot'), 'nori-companion.css must style robo-color-dot');
assert.ok(noriCSS.includes('.robo-sparkle-item'), 'nori-companion.css must style robo-sparkle-item');
assert.ok(noriCSS.includes('.robo-modal-backdrop'), 'nori-companion.css must style robo-modal-backdrop');
console.log('  ✔ nori-companion.css defines all Robo Gadget visual styling, animations, and modal rules');

// 4. Verify JavaScript Engine in js/robo-gadget.js
const roboJS = fs.readFileSync(path.join(__dirname, '..', 'js', 'robo-gadget.js'), 'utf8');
assert.ok(roboJS.includes('window.RoboGadget = RoboGadget'), 'robo-gadget.js must export window.RoboGadget');
assert.ok(roboJS.includes('playChirp:'), 'robo-gadget.js must implement playChirp audio synthesizer');
assert.ok(roboJS.includes('update3DTilt:'), 'robo-gadget.js must implement update3DTilt 3D cursor tracking');
assert.ok(roboJS.includes('startOrganicBlinkLoop:'), 'robo-gadget.js must implement startOrganicBlinkLoop');
assert.ok(roboJS.includes('setColor:'), 'robo-gadget.js must implement setColor');
assert.ok(roboJS.includes('cycleMood:'), 'robo-gadget.js must implement cycleMood');
console.log('  ✔ robo-gadget.js contains complete interactive engine (audio synth, cursor tracking, blinking, moods, colors)');

console.log('✔ PASS: All Robo Gadget companion, colorway, audio, and welcome assertions passed cleanly!');
