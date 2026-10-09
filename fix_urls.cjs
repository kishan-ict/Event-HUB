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
      
      // Fix form/register links
      content = content.replace(/https:\/\/aleropath\.pages\.dev\/event\/\$\{([^}]+)\}\/form\/register/g, 'https://event-aleropath.pages.dev/events/${$1}/register');
      
      // Fix base event links
      content = content.replace(/https:\/\/aleropath\.pages\.dev\/event\/\$\{([^}]+)\}/g, 'https://event-aleropath.pages.dev/events/${$1}');
      
      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir('c:/Users/ADMIN/Desktop/ALEROPATH/websit/Event-flow/src');
