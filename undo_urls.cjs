const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      content = content.replace(/https:\/\/event-aleropath\.pages\.dev\/events\/\$\{([^}]+)\}\/register/g, 'https://event-aleropath.pages.dev/event/${$1}/form/register');
      content = content.replace(/https:\/\/event-aleropath\.pages\.dev\/events\/\$\{([^}]+)\}/g, 'https://event-aleropath.pages.dev/event/${$1}');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('c:/Users/ADMIN/Desktop/ALEROPATH/websit/Event-flow/src');
