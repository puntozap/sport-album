const fs = require('fs');
const path = require('path');

const BASE = path.join(__dirname, 'cromos_extraidos', 'grupos');

if (!fs.existsSync(BASE)) {
  console.log('No existe cromos_extraidos/grupos/');
  process.exit(1);
}

const groups = fs.readdirSync(BASE).filter(g => fs.statSync(path.join(BASE, g)).isDirectory());

for (const group of groups) {
  const groupPath = path.join(BASE, group);
  const folders = fs.readdirSync(groupPath)
    .filter(p => fs.statSync(path.join(groupPath, p)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  for (const folder of folders) {
    const folderPath = path.join(groupPath, folder);
    const files = fs.readdirSync(folderPath)
      .filter(f => f.toLowerCase().endsWith('.png'));

    for (const file of files) {
      const match = file.match(/cromo_(\d{2})/i);
      if (!match) continue;

      const num = match[1];
      const newName = `${num}.png`;
      const oldPath = path.join(folderPath, file);
      const newPath = path.join(folderPath, newName);

      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        console.log(`Renombrado: ${group}/${folder}/${file} → ${newName}`);
      }
    }
  }
}

console.log('\n✅ Renombrado completo');
