import fs from 'fs';
import path from 'path';

function findArtifacts(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.git' || file === '.agents') continue;
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(findArtifacts(full));
    } else {
      const lower = file.toLowerCase();
      if (
        lower.endsWith('.log') ||
        lower.includes('result') ||
        lower.includes('output') ||
        lower.includes('report')
      ) {
        results.push({ file: full, size: stat.size, mtime: stat.mtime });
      }
    }
  }
  return results;
}

console.log('--- PRE-POPULATED ARTIFACT AUDIT ---');
const artifacts = findArtifacts('.');
console.log(`Found ${artifacts.length} potential artifact files outside node_modules/.agents:`);
for (const a of artifacts) {
  console.log(`- ${a.file} (${a.size} bytes, modified: ${a.mtime.toISOString()})`);
}
