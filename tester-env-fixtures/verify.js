const http = require('http');
const [url, username, password] = process.argv.slice(2);
let sessionId = '';
function rpc() {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, 'Content-Type': 'application/json', ...(sessionId && { 'X-Transmission-Session-Id': sessionId }) } }, response => {
      if (response.statusCode === 409) { sessionId = response.headers['x-transmission-session-id']; response.resume(); return resolve(rpc()); }
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => response.statusCode === 200 ? resolve(JSON.parse(body).arguments.torrents) : reject(new Error(`RPC HTTP ${response.statusCode}`)));
    });
    request.on('error', reject);
    request.end(JSON.stringify({ method: 'torrent-get', arguments: { fields: ['name', 'percentDone', 'status', 'totalSize', 'trackers'] } }));
  });
}
(async () => {
  const torrents = await rpc();
  const expected = new Map([['Arrival Manifest.pdf', [1, 6, 524288]], ['Product Research Archive.zip', [0.5, 4, 1048576]], ['Design Assets 2026-09.tar', [0, 0, 786432]]]);
  if (torrents.length !== expected.size) throw new Error(`expected 3 transfers, got ${torrents.length}`);
  for (const torrent of torrents) {
    const wanted = expected.get(torrent.name);
    if (!wanted || torrent.percentDone !== wanted[0] || torrent.status !== wanted[1] || torrent.totalSize !== wanted[2] || torrent.trackers.length) throw new Error(`unexpected transfer state: ${torrent.name}`);
  }
  console.log('Verified 3 transfers: 100% seeding, 50% downloading, 0% stopped; no trackers.');
})().catch(error => { console.error(error.message); process.exit(1); });
