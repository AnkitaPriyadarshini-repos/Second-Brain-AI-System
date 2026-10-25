const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const gateway = fs.readFileSync(path.join(root, 'api/ai/gateway.js'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'js/production-chat.js'), 'utf8');
const utils = fs.readFileSync(path.join(root, 'js/utils.js'), 'utf8');

const primaryMatch = gateway.match(/const\s+PRIMARY_MODEL\s*=\s*['"]([^'"]+)['"]/);
const fastMatch = gateway.match(/const\s+FAST_MODEL\s*=\s*['"]([^'"]+)['"]/);

const checks = [
  ['primary Gemini model is actively configured as gemini-3.8-flash', Boolean(primaryMatch && primaryMatch[1] === 'gemini-3.8-flash')],
  ['fast Gemini model is actively configured as gemini-3.5-flash-lite', Boolean(fastMatch && fastMatch[1] === 'gemini-3.5-flash-lite')],
  ['primary and fast tiers are intentionally distinct', Boolean(primaryMatch && fastMatch && primaryMatch[1] !== fastMatch[1])],
  ['latest user turn is explicitly sent', gateway.includes("{ role: 'user', parts: [{ text: prompt }] }")],
  ['private context is marked untrusted', gateway.includes('untrusted reference data')],
  ['context-free cache is isolated from history', gateway.includes('if (context || history.length) return null')],
  ['production chat owns the request flow', chat.includes("fetch('/api/ai/gateway'")],
  ['legacy utils does not call Gemini directly', !utils.includes('generativelanguage.googleapis.com')],
  ['legacy utils delegates to production handler', utils.includes('window.handleRAGQuery')],
  ['AI output is escaped before markdown rendering', utils.includes('escapeHTML(')]
];

let failed = 0;
for (const [name, passed] of checks) {
  if (passed) console.log(`PASS: ${name}`);
  else {
    failed += 1;
    console.error(`FAIL: ${name}`);
  }
}

if (failed) process.exit(1);
console.log(`Juno gateway regression checks passed (${checks.length}/${checks.length}).`);
