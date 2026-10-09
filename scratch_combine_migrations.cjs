const fs = require('fs');
const path = require('path');

const migrationsDir = path.join('c:\\Users\\ADMIN\\Desktop\\ALEROPATH\\websit\\Event-flow', 'supabase', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combinedSql = '-- ALEROPATH Events Database Schema\n\n';

for (const file of files) {
  combinedSql += `-- Migration: ${file}\n`;
  const buf = fs.readFileSync(path.join(migrationsDir, file));
  let text = '';
  if (buf[0] === 0xFF && buf[1] === 0xFE) {
    text = buf.toString('utf16le');
  } else {
    text = buf.toString('utf8');
  }
  combinedSql += text.trim();
  combinedSql += '\n\n';
}

const outPath = 'C:\\Users\\ADMIN\\.gemini\\antigravity-ide\\brain\\354f63a7-1c6b-4a3d-b129-50cded5e0fa2\\database_schema.md';

const mdContent = `# Database Schema Setup\n\nCopy and paste this entire block into your Supabase SQL Editor and click **Run** to set up your new database:\n\n\`\`\`sql\n${combinedSql}\n\`\`\`\n`;

fs.writeFileSync(outPath, mdContent);
console.log('Wrote combined SQL to', outPath);
