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
      // Extraer cualquier numero del nombre
      const match = file.match(/^(\d+)\.png$/i);
      if (!match) {
        console.log(`Ignorado (formato invalido): ${group}/${folder}/${file}`);
        continue;
      }

      const num = parseInt(match[1], 10);

      // Validar rango 0-11
      if (num < 0 || num > 11) {
        console.log(`Borrando (fuera de rango 00-11): ${group}/${folder}/${file}`);
        fs.unlinkSync(path.join(folderPath, file));
        continue;
      }

      // Normalizar a formato 00.png, 01.png, etc.
      const newName = `${String(num).padStart(2, '0')}.png`;
      const oldPath = path.join(folderPath, file);
      const newPath = path.join(folderPath, newName);

      if (oldPath !== newPath) {
        fs.renameSync(oldPath, newPath);
        console.log(`Normalizado: ${group}/${folder}/${file} → ${newName}`);
      }
    }
  }
}

console.log('\n✅ Normalizacion completa');
