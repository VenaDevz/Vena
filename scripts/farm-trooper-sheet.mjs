// Turn the generated 4-frame trooper strip (drawn on a light checkerboard
// "transparency" background) into a clean, baseline-aligned sprite sheet with
// a real alpha channel. Background is removed with a border flood-fill so the
// white armour INTERIOR (enclosed by the dark outline) is preserved.
import sharp from "sharp";
import path from "node:path";

const SRC = "/Users/macintoshi/.cursor/projects/Users-macintoshi-Desktop-ai-agents-vena/assets/farm-trooper-walk.png";
const OUT = path.resolve("public/farm/trooper-walk-sheet.png");
const FRAMES = 4;

// A pixel counts as "background" (checkerboard/white) when it is light and
// nearly grey (low saturation). The dark outline / teal / visor stay opaque.
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

  // Feather: clear any remaining light pixel that borders transparency (eats
  // the anti-aliased halo left around the outline by one pixel).
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

  // ── Slice into FRAMES columns, trim each to content, remember bbox ──
  const colW = Math.floor(W / FRAMES);
  const cropped = [];
  for (let f = 0; f < FRAMES; f++) {
    const buf = await cleaned
      .clone()
      .extract({ left: f * colW, top: 0, width: colW, height: H })
      .png()
      .toBuffer();
    const meta = await sharp(buf).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
    cropped.push({ buf: meta.data, w: meta.info.width, h: meta.info.height });
  }

  // ── Uniform frame canvas: widest + tallest, feet on shared baseline ──
  const pad = 6;
  const cw = Math.max(...cropped.map((c) => c.w)) + pad * 2;
  const ch = Math.max(...cropped.map((c) => c.h)) + pad * 2;

  const composites = [];
  for (let f = 0; f < FRAMES; f++) {
    const c = cropped[f];
    const left = f * cw + Math.round((cw - c.w) / 2); // centre horizontally
    const top = ch - c.h - pad; // bottom-align (shared baseline)
    composites.push({ input: c.buf, left, top });
  }

  await sharp({
    create: { width: cw * FRAMES, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composites)
    .png()
    .toFile(OUT);

  console.log(`frames=${FRAMES} frameW=${cw} frameH=${ch} sheet=${cw * FRAMES}x${ch}`);
  console.log(`aspect(frameW/frameH)=${(cw / ch).toFixed(3)} -> ${OUT}`);
};

run();
