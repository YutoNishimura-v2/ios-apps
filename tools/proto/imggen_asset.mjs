// ゲーム素材を gpt-image で 1 枚作る（秘書の ui-model-eval/imggen.mjs と同じ鍵を使う。1 枚数円）
// 使い方: node tools/proto/imggen_asset.mjs <出力 png のパス> <size 例 1024x1536> <prompt のテキストファイル> [transparent]
import fs from 'node:fs';
import path from 'node:path';

const [out, size, promptFile, bg] = process.argv.slice(2);
if (!out || !size || !promptFile) {
  console.error('usage: node imggen_asset.mjs <out.png> <size> <prompt.txt> [transparent]');
  process.exit(1);
}
const envText = fs.readFileSync('C:/Users/yuton/workspace/chieri_agent/chieri-agent/.env', 'utf8');
const key = envText.split(/\r?\n/).find(l => l.startsWith('OPENAI_API_KEY='))?.slice('OPENAI_API_KEY='.length).trim();
const prompt = fs.readFileSync(promptFile, 'utf8');
const body = { model: 'gpt-image-2.6-sunburst', prompt, size, n: 1, quality: 'medium' };
if (bg === 'transparent') body.background = 'transparent';
const t0 = Date.now();
const r = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
  body: JSON.stringify(body),
});
const raw = await r.json();
if (!r.ok) { console.error('HTTP', r.status, JSON.stringify(raw).slice(0, 800)); process.exit(1); }
const b64 = raw.data?.[0]?.b64_json;
if (!b64) { console.error('no image', JSON.stringify(raw).slice(0, 600)); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, Buffer.from(b64, 'base64'));
fs.writeFileSync(out.replace(/\.png$/, '.usage.json'), JSON.stringify({ size, ms: Date.now() - t0, usage: raw.usage || {} }, null, 2));
console.log(JSON.stringify({ out, ms: Date.now() - t0, usage: raw.usage || {} }));
