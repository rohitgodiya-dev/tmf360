// Trial360 OS — Page Health Check
// Run: node scripts/page-health-check.js

const https = require('https');

const PAGES = [
  'https://trial360os.com/platform',
  'https://trial360os.com/site360/home',
  'https://trial360os.com/site360/login',
  'https://trial360os.com/site360/book-demo',
  'https://trial360os.com/site360/isf',
  'https://trial360os.com/participant360',
  'https://trial360os.com/book-demo',
];

// Follows redirects (apex → www, /site360/isf → /site360/login when signed out).
function fetchPage(url, hops = 0) {
  return new Promise((resolve) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops < 5) {
        res.resume();
        resolve(fetchPage(new URL(res.headers.location, url).toString(), hops + 1));
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, finalUrl: url }));
    });
    req.on('error', (e) => resolve({ status: 0, body: '', finalUrl: url, error: e.message }));
    req.setTimeout(10000, () => { req.destroy(); resolve({ status: 0, body: '', finalUrl: url, error: 'timeout' }); });
  });
}

async function checkPage(url) {
  const r = await fetchPage(url);
  if (r.error) return { url, status: 0, pass: false, note: r.error };
  const isBlank = r.body.length < 500;
  // Match Next.js error pages, not any "500" digits inside chunk hashes.
  const hasError = r.body.includes('Application error') || /<title>\s*500\b/.test(r.body);
  const redirected = r.finalUrl !== url ? ` → ${new URL(r.finalUrl).pathname}` : '';
  return {
    url,
    status: r.status,
    pass: r.status === 200 && !isBlank && !hasError,
    note: (isBlank ? 'blank page' : hasError ? 'error in body' : 'ok') + redirected,
  };
}

async function run() {
  console.log('=== Trial360 OS Page Health Check ===\n');
  const results = await Promise.all(PAGES.map(checkPage));
  results.forEach(r => {
    console.log(`${r.pass ? '✅' : '❌'} ${r.status} ${r.url} — ${r.note}`);
  });
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} pages passing`);
  process.exit(passed === results.length ? 0 : 1);
}

run();
