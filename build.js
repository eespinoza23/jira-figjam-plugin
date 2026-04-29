const fs = require('fs');
const path = require('path');

const srcPublic = path.join(__dirname, 'public');
const srcManifest = path.join(__dirname, 'manifest.json');
const destDir = path.join(__dirname, 'dist');
const destPublic = path.join(destDir, 'public');

// Create dist directory
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy public files
const copyDir = (src, dest) => {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.readdirSync(src).forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
};

if (fs.existsSync(srcPublic)) {
  copyDir(srcPublic, destPublic);
  console.log('✓ Copied public/');
}

// Copy manifest
if (fs.existsSync(srcManifest)) {
  fs.copyFileSync(srcManifest, path.join(destDir, 'manifest.json'));
  console.log('✓ Copied manifest.json');
}

// Copy plugin files to root (manifest references /ui.html and /code.js directly)
['index.html', 'ui.html', 'code.js'].forEach(file => {
  const src = path.join(srcPublic, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(destDir, file));
    console.log(`✓ Copied ${file} to root`);
  }
});

console.log('Build complete: dist/');
