#!/usr/bin/env node
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(path.dirname(__dirname));
const dirs = ['api', 'apps/app', 'apps/website'];

for (const dir of dirs) {
  const target = path.join(root, dir);
  console.log(`Installing in ${dir}...`);
  execSync('npm install', { stdio: 'inherit', cwd: target });
}
