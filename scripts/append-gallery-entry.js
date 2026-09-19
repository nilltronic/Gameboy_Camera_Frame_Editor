#!/usr/bin/env node
/**
 * append-gallery-entry.js
 *
 * Appends one submission to gallery/gallery.json.
 * Called by .github/workflows/gallery-submission.yml as:
 *
 *   node .github/scripts/append-gallery-entry.js \
 *     --file "gallery/gallery.json" \
 *     --image "gallery/images/xxx.png" \
 *     --name "Some Name" \
 *     --type "Camera photo" \
 *     --caption "A caption" \
 *     --issue "12"
 *
 * Creates gallery.json (and its parent folder) if they don't exist yet.
 */

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const required = ['file', 'image', 'name', 'type', 'issue'];
const missing = required.filter((key) => !args[key]);
if (missing.length > 0) {
  console.error('Missing required argument(s): ' + missing.join(', '));
  process.exit(1);
}

const filePath = args.file;
const dir = path.dirname(filePath);

// Make sure gallery/ exists (in case gallery.json is being created for the first time)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Load existing entries, or start fresh if the file doesn't exist / is empty
let entries = [];
if (fs.existsSync(filePath)) {
  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (raw.length > 0) {
    try {
      entries = JSON.parse(raw);
      if (!Array.isArray(entries)) {
        throw new Error('gallery.json does not contain a JSON array');
      }
    } catch (err) {
      console.error('Could not parse existing ' + filePath + ': ' + err.message);
      process.exit(1);
    }
  }
}

// Guard against accidentally processing the same issue twice
// (e.g. the label gets added, removed, and re-added by mistake)
const issueNumber = parseInt(args.issue, 10);
const alreadyExists = entries.some((e) => e.issue === issueNumber);
if (alreadyExists) {
  console.log('Issue #' + issueNumber + ' is already in the gallery — skipping.');
  process.exit(0);
}

const entry = {
  id: Date.now(),
  image: args.image,
  name: args.name,
  type: args.type,
  caption: args.caption || '',
  issue: issueNumber,
  submittedAt: new Date().toISOString(),
};

entries.push(entry);

fs.writeFileSync(filePath, JSON.stringify(entries, null, 2) + '\n', 'utf8');

console.log('Added gallery entry for issue #' + issueNumber + ' -> ' + filePath);
