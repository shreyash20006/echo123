const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// 1. Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// 2. Copy index.html to dist and public
fs.copyFileSync('index.html', path.join('dist', 'index.html'));
fs.copyFileSync('index.html', path.join('public', 'index.html'));

// 3. Copy public folder to dist/public and dist directly
if (fs.existsSync('public')) {
  copyRecursiveSync('public', path.join('dist', 'public'));
  if (fs.existsSync(path.join('public', 'images'))) {
    copyRecursiveSync(path.join('public', 'images'), path.join('dist', 'images'));
    copyRecursiveSync(path.join('public', 'images'), 'images');
  }
}

// 4. Copy logo to dist and root
if (fs.existsSync('echo_logo_white_transparent.png')) {
  fs.copyFileSync('echo_logo_white_transparent.png', path.join('dist', 'echo_logo_white_transparent.png'));
}

console.log('Build completed successfully. Artifacts ready in root, dist/, and public/.');
