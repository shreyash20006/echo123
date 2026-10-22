const fs = require('fs');
const path = require('path');

function getEnv() {
  const envVars = {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
    CLOUDINARY_LOGO_URL: process.env.CLOUDINARY_LOGO_URL || process.env.VITE_CLOUDINARY_LOGO_URL || ''
  };

  if (!envVars.SUPABASE_URL && fs.existsSync('.env')) {
    const lines = fs.readFileSync('.env', 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [k, ...v] = trimmed.split('=');
      if (k) envVars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
    }
  }
  return envVars;
}

const env = getEnv();
const envScript = `window.__ENV__ = ${JSON.stringify(env, null, 2)};\n`;
fs.writeFileSync('env.js', envScript, 'utf8');

if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

fs.writeFileSync(path.join('dist', 'env.js'), envScript, 'utf8');

const staticFiles = [
  'index.html',
  'echo.css',
  'echo.js',
  'login.html',
  'events.html',
  'team.html',
  'collab.html',
  'echo_logo_white_transparent.png'
];

for (const file of staticFiles) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
  }
}

if (fs.existsSync('assets')) {
  if (!fs.existsSync(path.join('dist', 'assets'))) {
    fs.mkdirSync(path.join('dist', 'assets'), { recursive: true });
  }
  fs.readdirSync('assets').forEach(f => {
    fs.copyFileSync(path.join('assets', f), path.join('dist', 'assets', f));
  });
}

console.log('Build completed successfully for Vercel deployment.');
