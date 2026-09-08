const crypto = require('crypto');
const fs = require('fs');
const http = require('http');

const [url, username, password] = process.argv.slice(2);
let sessionId = '';
function rpc(method, args = {}) {
  return new Promise((resolve, reject) => {
    const request = http.request(url, { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, 'Content-Type': 'application/json', ...(sessionId && { 'X-Transmission-Session-Id': sessionId }) } }, response => {
      if (response.statusCode === 409) { sessionId = response.headers['x-transmission-session-id']; response.resume(); return resolve(rpc(method, args)); }
      let body = '';
      response.on('data', chunk => body += chunk);
      response.on('end', () => { if (response.statusCode !== 200) return reject(new Error(`RPC HTTP ${response.statusCode}: ${body}`)); const reply = JSON.parse(body); reply.result === 'success' ? resolve(reply.arguments) : reject(new Error(reply.result)); });
    });
    request.on('error', reject);
    request.end(JSON.stringify({ method, arguments: args }));
  });
}
function bencode(value) {
  if (Buffer.isBuffer(value)) return Buffer.concat([Buffer.from(`${value.length}:`), value]);
  if (typeof value === 'string') return bencode(Buffer.from(value));
  if (Number.isInteger(value)) return Buffer.from(`i${value}e`);
  return Buffer.concat([Buffer.from('d'), ...Object.keys(value).sort().flatMap(key => [bencode(key), bencode(value[key])]), Buffer.from('e')]);
}
async function add({ name, byte, size, completed, state }) {
  const pieceLength = 524288;
  const content = Buffer.alloc(size, byte);
  const pieces = [];
  for (let offset = 0; offset < size; offset += pieceLength) pieces.push(crypto.createHash('sha1').update(content.subarray(offset, offset + pieceLength)).digest());
  const metainfo = bencode({ info: { length: size, name, 'piece length': pieceLength, pieces: Buffer.concat(pieces) } });
  const path = `/data/downloads/Release Assets/${name}`;
  fs.mkdirSync('/data/downloads/Release Assets', { recursive: true });
  if (completed) fs.writeFileSync(path, content.subarray(0, completed));
  const reply = await rpc('torrent-add', { metainfo: metainfo.toString('base64'), paused: state === 'stopped', 'download-dir': '/data/downloads/Release Assets' });
  const torrent = reply['torrent-added'];
  if (!torrent) throw new Error(`${name} was not added`);
  if (state === 'started') await rpc('torrent-start', { ids: [torrent.id] });
}
(async () => {
  const existing = await rpc('torrent-get', { fields: ['id'] });
  if (existing.torrents.length) throw new Error('seed requires a reset; existing transfers found');
  await add({ name: 'Arrival Manifest.pdf', byte: 65, size: 524288, completed: 524288, state: 'started' });
  await add({ name: 'Product Research Archive.zip', byte: 82, size: 1048576, completed: 524288, state: 'started' });
  await add({ name: 'Design Assets 2026-09.tar', byte: 68, size: 786432, completed: 0, state: 'stopped' });
  console.log('Seeded 3 local no-tracker transfers.');
})().catch(error => { console.error(error.message); process.exit(1); });
