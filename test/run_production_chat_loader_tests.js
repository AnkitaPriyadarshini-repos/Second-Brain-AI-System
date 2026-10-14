const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('index.html');
const utils = read('js/utils.js');
const pwa = read('js/pwa-installer.js');
const sw = read('sw.js');
const pkg = JSON.parse(read('package.json'));

assert.ok(html.includes('js/utils.js?v=59.0'), 'HTML must reference the current utils loader');
assert.ok(html.includes('js/pwa-installer.js?v=61.0'), 'HTML must reference current PWA installer');
assert.ok(utils.includes("const SRC = 'js/production-chat.js?v=6.0';"), 'Primary loader must use current version');
assert.ok(utils.includes('data-juno-production-chat="true"'), 'Parser-blocking controller script must be marked to avoid duplicate loading');
assert.ok(utils.includes("script.dataset.junoProductionChat = 'true';"), 'Dynamic primary loader must mark its script');
assert.ok(pwa.includes("if (typeof window.handleRAGQuery === 'function') return;"), 'Fallback must not replace an initialized controller');
assert.ok(pwa.includes('script[src*="js/production-chat.js"]'), 'Fallback must detect an already requested controller script');
assert.ok(pwa.includes("script.src = 'js/production-chat.js?v=6.0';"), 'Fallback must use the same current controller version');
assert.ok(!pwa.includes("js/production-chat.js?v=3.0"), 'Stale v3 controller must not be loaded');
assert.ok(sw.includes("second-brain-cache-v69.0"), 'Service worker cache must be version-bumped');
assert.ok(sw.includes("./js/utils.js?v=59.0"), 'Service worker must cache current utils');
assert.ok(sw.includes("./js/production-chat.js?v=6.0"), 'Service worker must cache current chat controller');
assert.ok(sw.includes("./js/pwa-installer.js?v=61.0"), 'Service worker must cache current PWA installer');
assert.ok(pkg.scripts.test.includes('test/run_production_chat_loader_tests.js'), 'Regression test must be part of npm test');

console.log('PASS: production chat controller loads once and service-worker asset versions are aligned.');
