// Turn the generated 4-frame trooper MINING strip (drawn on a flat light-grey
// background) into a clean, baseline-aligned sprite sheet with a real alpha
// channel. The generated strip's first frame is oversized, so we keep the three
// consistent frames and reorder them into a clean raise → swing → impact loop.
// Frames are LEFT-aligned (not centred) so the trooper's body stays put while
// the pickaxe swings out to the right.
import sharp from "sharp";
import path from "node:path";

const SRC = "/Users/macintoshi/.cursor/projects/Users-macintoshi-Desktop-ai-agents-vena/assets/farm-trooper-mine.png";
const OUT = path.resolve("public/farm/trooper-mine-sheet.png");
const FRAMES_IN = 4;
// source indices reordered → raised, mid-swing, impact
const ORDER = [3, 1, 2];

// Light near-grey background counts as transparent; dark outline / teal / white
// armour interior (enclosed by the outline) stay opaque via border flood-fill.
const isBg = (r, g, b) => {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mn >= 200 && mx - mn <= 22;
};

const run = async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const alphaAt = (i) => data[i * C + 3];
  const setClear = (i) => { data[i * C + 3] = 0; };

  // ── Border flood fill ──
  const stack = [];
  const visited = new Uint8Array(W * H);
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = y * W + x;
    if (visited[i]) return;
    visited[i] = 1;
    const o = i * C;
    if (isBg(data[o], data[o + 1], data[o + 2])) stack.push(i);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }

  while (stack.length) {
    const i = stack.pop();
    setClear(i);
    const x = i % W;
    const y = (i / W) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // Feather anti-aliased halo left around the outline.
  for (let pass = 0; pass < 2; pass++) {
    const clearNow = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        if (alphaAt(i) === 0) continue;
        const o = i * C;
        if (!isBg(data[o], data[o + 1], data[o + 2])) continue;
        const nb =
          (x > 0 && alphaAt(i - 1) === 0) ||
          (x < W - 1 && alphaAt(i + 1) === 0) ||
          (y > 0 && alphaAt(i - W) === 0) ||
          (y < H - 1 && alphaAt(i + W) === 0);
        if (nb) clearNow.push(i);
      }
    }
    clearNow.forEach(setClear);
    if (!clearNow.length) break;
  }

  const cleaned = sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } }).png();

  // ── Slice into equal columns, trim each to content ──
  const colW = Math.floor(W / FRAMES_IN);
  const cropped = [];
  for (let f = 0; f < FRAMES_IN; f++) {
    const buf = await cleaned
      .clone()
      .extract({ left: f * colW, top: 0, width: colW, height: H })
      .png()
      .toBuffer();
    const meta = await sharp(buf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    cropped.push({ buf: meta.data, w: meta.info.width, h: meta.info.height });
  }

  const frames = ORDER.map((idx) => cropped[idx]);

  // ── Uniform canvas: widest + tallest, feet on shared baseline, body LEFT-aligned ──
  const pad = 6;
  const cw = Math.max(...frames.map((c) => c.w)) + pad * 2;
  const ch = Math.max(...frames.map((c) => c.h)) + pad * 2;

  const composites = frames.map((c, f) => ({
    input: c.buf,
    left: f * cw + pad,          // left-align: body back edge stays fixed
    top: ch - c.h - pad,         // bottom-align: feet share a baseline
  }));

  await sharp({
    create: { width: cw * frames.length, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(OUT);

  console.log(`frames=${frames.length} frameW=${cw} frameH=${ch} sheet=${cw * frames.length}x${ch}`);
  console.log(`aspect(frameW/frameH)=${(cw / ch).toFixed(3)} -> ${OUT}`);
};

run();
