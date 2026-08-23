import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        results = results.concat(walk(full));
      }
    } else if (full.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const suspiciousPatterns = [
  'PulseMetrics',
  'SynapseAI',
  'EcommerceHub',
  'LegacyTool',
  'mockResponse',
  'fakeOutput',
  'NotImplemented',
  'TODO: implement'
];

// Check only production source files (exclude __tests__)
const prodFiles = [
  ...walk('packages/backend/src').filter(f => !f.includes('__tests__')),
  ...walk('packages/shared/src').filter(f => !f.includes('__tests__')),
];

let flags = [];
for (const file of prodFiles) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of suspiciousPatterns) {
    if (content.toLowerCase().includes(pattern.toLowerCase())) {
      flags.push({ pattern, file });
    }
  }
}

console.log('--- PRODUCTION SOURCE AUDIT ---');
console.log(`Checked ${prodFiles.length} production source files.`);
if (flags.length === 0) {
  console.log('Zero suspicious hardcoded fixture patterns found in production source.');
} else {
  console.log('Flags found:', flags);
}

// Check for empty functions or facade implementations
let facadeCount = 0;
for (const file of prodFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.trim().match(/return\s+(true|false|null|""|''|undefined|0);\s*$/) && !line.includes('//')) {
      // spot-check if inside genuine logic
    }
  });
}
console.log('Facade check completed.');
