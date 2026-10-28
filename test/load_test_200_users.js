/**
 * Milo AI Workspace — 200+ User Load & Capacity Certification Entrypoint
 *
 * Runs the environment-driven load testing suite (Mode A: Local with Mock Provider)
 * across the 200+ user capacity matrix:
 * Stages: 10, 25, 50, 100, 150, 200, 250, 300 concurrent users + 200-user soak test.
 *
 * Supports CLI flags:
 *   --mode=A|B|C
 *   --concurrency=200
 *   --stages=true
 *   --dry-run
 *   --target=URL
 */

const { fork } = require('child_process');
const path = require('path');

const suitePath = path.join(__dirname, 'load_test_suite.js');
const args = process.argv.slice(2);

// Default to Mode A with all stages enabled for 200+ user certification
if (!args.some(a => a.startsWith('--mode'))) {
  args.unshift('--mode=A');
}
if (!args.some(a => a.includes('stages') || a.startsWith('--concurrency'))) {
  args.unshift('--stages=true');
}

const child = fork(suitePath, args, { stdio: 'inherit' });

child.on('exit', (code) => {
  process.exit(code || 0);
});
