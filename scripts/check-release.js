const { execFileSync } = require('child_process');

const major = Number(process.versions.node.split('.')[0]);

if (major < 22 || major >= 25) {
  throw new Error(`Releasing nt-track requires Node >=22 <25; found ${process.version}`);
}

const branch = execFileSync('git', ['branch', '--show-current'], {
  encoding: 'utf8'
}).trim();

if (branch !== 'master') {
  throw new Error(`Release from master, not ${branch || 'detached HEAD'}`);
}

const status = execFileSync('git', ['status', '--porcelain'], {
  encoding: 'utf8'
}).trim();

if (status) {
  throw new Error('Commit or stash all changes before releasing nt-track');
}

console.log(`Release checks passed on ${branch} with ${process.version}`);
