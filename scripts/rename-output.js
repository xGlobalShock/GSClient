const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const oldName = path.join(distDir, 'win-unpacked');
const newName = path.join(distDir, 'GS Optimizer');

try {
  if (fs.existsSync(oldName)) {
    if (fs.existsSync(newName)) {
      console.log('Destination already exists, removing it first...');
      fs.rmSync(newName, { recursive: true, force: true });
    }
    fs.renameSync(oldName, newName);
    console.log(`Renamed '${oldName}' to '${newName}'`);
  } else {
    console.log(`No '${oldName}' folder found, skipping rename.`);
  }
} catch (err) {
  console.error('Failed to rename output folder:', err.message || err);
  process.exitCode = 1;
}