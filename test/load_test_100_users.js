/**
 * Milo AI Workspace — 100+ User Load Test Entrypoint
 * 
 * Delegates to the environment-driven load testing suite (Mode A: Local with Mock Provider).
 * Supports CLI flags: --mode=A|B|C --concurrency=100 --dry-run --target=URL
 */

const { fork } = require('child_process');
const path = require('path');

const suitePath = path.join(__dirname, 'load_test_suite.js');
const args = process.argv.slice(2);

// If no arguments provided, default to Mode A with 100 concurrent virtual users
if (!args.some(a => a.startsWith('--mode'))) {
  args.unshift('--mode=A');
}
if (!args.some(a => a.startsWith('--concurrency'))) {
  args.unshift('--concurrency=100');
}

const child = fork(suitePath, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});
