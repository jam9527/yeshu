/**
 * Post-build script for WeChat mini-program.
 *
 * In `enhance: false` mode, page files run without module context — `exports`
 * is undefined, so `Object.defineProperty(exports, "__esModule", ...)` causes
 * a runtime crash. This script strips that line from page .js files and app.js.
 *
 * Utility files (utils/*.js, config.js) are loaded via require() and keep
 * their module wrappers — they are left untouched.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LINE = 'Object.defineProperty(exports, "__esModule", { value: true });';

const KEEP_DIRS = new Set(['utils', 'node_modules']);
const KEEP_FILES = new Set(['config.js']);

/** Recursively find all .js files in a directory */
function findJsFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!KEEP_DIRS.has(entry.name)) {
        results.push(...findJsFiles(fullPath));
      }
    } else if (entry.name.endsWith('.js') && !KEEP_FILES.has(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

let stripped = 0;

// Process pages/, pages-verifier/ and custom-tab-bar/ directories
for (const dir of ['pages', 'pages-verifier', 'custom-tab-bar']) {
  const fullDir = path.resolve(PROJECT_ROOT, dir);
  for (const filePath of findJsFiles(fullDir)) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(LINE)) {
      fs.writeFileSync(filePath, content.replace(LINE, ''), 'utf-8');
      stripped++;
    }
  }
}

// Process app.js
const appJs = path.resolve(PROJECT_ROOT, 'app.js');
if (fs.existsSync(appJs)) {
  const content = fs.readFileSync(appJs, 'utf-8');
  if (content.includes(LINE)) {
    fs.writeFileSync(appJs, content.replace(LINE, ''), 'utf-8');
    stripped++;
  }
}

if (stripped > 0) {
  console.log(`[postbuild] Stripped __esModule from ${stripped} file(s)`);
} else {
  console.log('[postbuild] No files needed __esModule stripping');
}
