// Static file server for admin-panel
const http = require('http');
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'admin-panel');
const mime = {
  '.html':'text/html;charset=utf-8', '.js':'text/javascript',
  '.css':'text/css', '.svg':'image/svg+xml',
  '.png':'image/png', '.jpg':'image/jpeg'
};
http.createServer((req, res) => {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.join(dir, p);
  const ext = path.extname(file);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(data);
  });
}).listen(3000, () => console.log('admin-panel on http://localhost:3000'));
