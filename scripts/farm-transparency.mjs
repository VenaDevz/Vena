import sharp from "sharp";
import { readdirSync, renameSync } from "node:fs";
import { join } from "node:path";

const ASSETS =
  "/Users/macintoshi/.cursor/projects/Users-macintoshi-Desktop-ai-agents-vena/assets";
const OUT = "public/farm";
const VERSION = "v4";

const MAP = [
  ["farm-tile.png", "tile"],
  ["farm-shaft1.png", "shaft1"],
  ["farm-conveyor.png", "conveyor"],
  ["farm-shaft2.png", "shaft2"],
  ["farm-processor.png", "processor"],
  ["farm-deepshaft.png", "deepshaft"],
  ["farm-crystallab.png", "crystallab"],
  ["farm-refinery.png", "refinery"],
  ["farm-oreforge.png", "oreforge"],
];

// Remove the neutral white/grey studio background (and its anti-aliased halo)
// while preserving colored neon and dark metal/rock.
const HARD = 208; // >= this neutral brightness → fully transparent
const SOFT = 176; // between SOFT..HARD → feathered alpha
const NEUTRAL = 30; // max-min channel spread to still count as grey/white

for (const [srcName, base] of MAP) {
  const src = join(ASSETS, srcName);
  const outPath = join(OUT, `${base}-${VERSION}.png`);

  const { data, info } = await sharp(src)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let cleared = 0;
  let feathered = 0;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    if (spread > NEUTRAL) continue; // colored → keep

    if (min >= HARD) {
      data[i + 3] = 0;
      cleared++;
    } else if (min >= SOFT) {
      // feather: brighter → more transparent
      const t = (min - SOFT) / (HARD - SOFT); // 0..1
      const a = Math.round((1 - t) * data[i + 3]);
      if (a < data[i + 3]) {
        data[i + 3] = a;
        feathered++;
      }
    }
  }

  await sharp(data, { raw: { width, height, channels } })
    .png()
    .toFile(outPath + ".tmp");
  renameSync(outPath + ".tmp", outPath);

  console.log(
    `${base}-${VERSION}.png  cleared=${cleared} feathered=${feathered} (${width}x${height})`
  );
}

console.log("farm dir:", readdirSync(OUT).join(", "));
