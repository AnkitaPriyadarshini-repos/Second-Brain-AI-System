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

// Extract version strings
const utilsVerMatch = html.match(/js\/utils\.js\?v=([0-9.]+)/);
assert.ok(utilsVerMatch, 'HTML must reference utils loader with version');
const utilsVer = utilsVerMatch[0];

const chatVerMatch = utils.match(/const SRC = 'js\/(production-chat\.js\?v=[0-9.]+)';/);
assert.ok(chatVerMatch, 'Primary loader must specify chat controller version');
const chatSrc = chatVerMatch[1];

assert.ok(html.includes(utilsVer), 'HTML must reference current utils loader');
assert.ok(html.includes('js/pwa-installer.js?v=61.0'), 'HTML must reference current PWA installer');
assert.ok(utils.includes('data-juno-production-chat="true"'), 'Parser-blocking controller script must be marked to avoid duplicate loading');
assert.ok(utils.includes("script.dataset.junoProductionChat = 'true';"), 'Dynamic primary loader must mark its script');
assert.ok(pwa.includes("if (typeof window.handleRAGQuery === 'function') return;"), 'Fallback must not replace an initialized controller');
assert.ok(pwa.includes('script[src*="js/production-chat.js"]'), 'Fallback must detect an already requested controller script');
assert.ok(!pwa.includes("js/production-chat.js?v=3.0"), 'Stale v3 controller must not be loaded');

// Service worker alignment
assert.ok(/second-brain-cache-v\d+\.\d+/.test(sw), 'Service worker cache must be version-bumped');
assert.ok(sw.includes(`./${utilsVer}`), 'Service worker must cache current utils version');
assert.ok(sw.includes(`./js/${chatSrc}`), 'Service worker must cache current chat controller version');
assert.ok(sw.includes('./js/pwa-installer.js?v=61.0'), 'Service worker must cache current PWA installer');
assert.ok(sw.includes('./vendor/katex/katex.min.css?v=1.0'), 'Service worker must cache KaTeX CSS');
assert.ok(sw.includes('./vendor/katex/katex.min.js?v=1.0'), 'Service worker must cache KaTeX JS');
assert.ok(pkg.scripts.test.includes('test/run_production_chat_loader_tests.js'), 'Regression test must be part of npm test');

console.log('PASS: production chat controller loads once and service-worker asset versions are aligned.');
