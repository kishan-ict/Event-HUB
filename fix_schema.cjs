const fs = require('fs');
let content = fs.readFileSync('C:/Users/ADMIN/.gemini/antigravity-ide/brain/354f63a7-1c6b-4a3d-b129-50cded5e0fa2/database_schema.md', 'utf8');
content = content.replace(/CREATE POLICY \"([^\"]+)\" ON ([\w\.]+)/g, 'DROP POLICY IF EXISTS "$1" ON $2;\nCREATE POLICY "$1" ON $2');
content = content.replace(/CREATE TABLE ([\w\.]+)/g, 'CREATE TABLE IF NOT EXISTS $1');
fs.writeFileSync('C:/Users/ADMIN/.gemini/antigravity-ide/brain/354f63a7-1c6b-4a3d-b129-50cded5e0fa2/database_schema.md', content);
