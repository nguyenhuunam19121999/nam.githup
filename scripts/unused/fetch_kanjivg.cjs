// fetch_kanjivg.cjs
// Tải dữ liệu nét thật từ KanjiVG GitHub cho các kanji N3 còn thiếu/hỏng
// Chạy: node scripts/fetch_kanjivg.cjs

const https = require('https');
const fs = require('fs');
const path = require('path');

const STROKES_FILE = path.join(__dirname, '../artifacts/mirai-jp/assets/data_JLPT_kanji/kanji_strokes.json');
const N3_FILE      = path.join(__dirname, '../artifacts/mirai-jp/assets/data_JLPT_kanji/n3_soumatome.json');

const strokes = JSON.parse(fs.readFileSync(STROKES_FILE, 'utf8'));
const n3data  = JSON.parse(fs.readFileSync(N3_FILE, 'utf8'));

// Kanji cần cập nhật
const missing = n3data.filter(k => !strokes[k.kanji]).map(k => k.kanji);
const bad     = n3data.filter(k => {
  const p = strokes[k.kanji];
  if (!p) return false;
  return k.strokes > 0 && p.length < k.strokes * 0.6;
}).map(k => k.kanji);
const needed  = [...new Set([...missing, ...bad])];

console.log(`Cần tải: ${needed.length} kanji (${missing.length} thiếu + ${bad.length} bị hỏng)`);

// Parse paths từ KanjiVG SVG XML (regex-based, no parser needed)
function parsePaths(svgText) {
  // KanjiVG paths nằm trong group có id chứa "-s"
  // <path id="kvg:...-s1" d="..." />
  const pathRe = /<path[^>]*\bid="[^"]*-s\d+"[^>]*\bd="([^"]+)"/g;
  const paths = [];
  let m;
  while ((m = pathRe.exec(svgText)) !== null) {
    paths.push(m[1]);
  }
  // Nếu không tìm được, thử pattern d trước id
  if (paths.length === 0) {
    const altRe = /<path[^>]*\bd="([^"]+)"[^>]*\bid="[^"]*-s\d+"/g;
    while ((m = altRe.exec(svgText)) !== null) {
      paths.push(m[1]);
    }
  }
  return paths;
}

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'MiraiJP-App/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  let updated = 0;
  let failed  = [];

  for (let i = 0; i < needed.length; i++) {
    const kanji = needed[i];
    const cp    = kanji.codePointAt(0).toString(16).padStart(5, '0');
    const url   = `https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji/${cp}.svg`;

    process.stdout.write(`[${i+1}/${needed.length}] ${kanji} (U+${cp.toUpperCase()})... `);

    try {
      const svg   = await fetchUrl(url);
      const paths = parsePaths(svg);

      if (paths.length === 0) {
        console.log(`SKIP (0 paths parsed)`);
        failed.push({ kanji, reason: 'parse=0' });
      } else {
        strokes[kanji] = paths;
        updated++;
        console.log(`OK (${paths.length} nét)`);
      }
    } catch (err) {
      console.log(`FAIL: ${err.message}`);
      failed.push({ kanji, reason: err.message });
    }

    // Rate limit nhẹ
    if (i < needed.length - 1) await sleep(120);
  }

  fs.writeFileSync(STROKES_FILE, JSON.stringify(strokes, null, 0));
  console.log(`\n✓ Đã cập nhật ${updated}/${needed.length} kanji vào kanji_strokes.json`);
  if (failed.length > 0) {
    console.log(`✗ Thất bại ${failed.length}:`, failed.map(f => f.kanji).join(' '));
  }
}

main().catch(err => { console.error(err); process.exit(1); });
