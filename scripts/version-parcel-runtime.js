const crypto = require('crypto');
const fs = require('fs');

const filename = process.argv[2];

if (!filename) {
  throw new Error('Expected bundle filename');
}

const source = fs.readFileSync(filename, 'utf8');
const runtimePattern = /parcelRequire[0-9a-f]+/g;
const runtimeNames = [...new Set(source.match(runtimePattern) || [])];

if (runtimeNames.length !== 1) {
  throw new Error(`Expected one Parcel runtime, found ${runtimeNames.length}`);
}

// Parcel derives this name from project metadata, so different builds reuse one
// global module cache. Use bundle content instead, allowing old and new site
// chunks to coexist during deploys and browser cache transitions.
const normalized = source.replace(runtimePattern, 'parcelRequireCONTENT');
const version = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
const output = source.replace(runtimePattern, `parcelRequire${version}`);

fs.writeFileSync(filename, output);
