/**
 * Regenerates every brand raster in `public/` from two sources: the icon
 * drawing in `icon-source.svg` and the hero photograph.
 *
 * A one-off design tool, not part of `next build` — run it by hand after
 * editing the SVG:
 *
 *     node scripts/generate-brand-assets.mjs
 *
 * `sharp` is not a declared dependency; it arrives with Next and is only ever
 * loaded here, so nothing in the app depends on it being installed.
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (name) => join(root, "public", name);

const icon = readFileSync(join(root, "scripts", "icon-source.svg"));
/** A high density keeps the SVG crisp when it is rasterised at 512px. */
const render = (size) => sharp(icon, { density: 900 }).resize(size, size).png({ compressionLevel: 9 });

/**
 * A maskable icon is cropped to whatever shape the platform prefers, so the
 * artwork has to survive a circle inscribed in the middle 80%. The square
 * mark is redrawn full-bleed and shrunk into that safe zone.
 */
const maskable = async (size, file) => {
  const inset = Math.round(size * 0.18);
  const mark = await sharp(icon, { density: 900 })
    .resize(size - inset * 2, size - inset * 2)
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: "#244798" },
  })
    .composite([{ input: mark, left: inset, top: inset }])
    .png({ compressionLevel: 9 })
    .toFile(file);
};

/**
 * Packs PNG-sized rasters into a .ico. Each frame is a 32-bit bottom-up BMP
 * (the universally readable form) plus the all-zero AND mask that the format
 * still requires even when the alpha channel carries the transparency.
 */
async function ico(sizes) {
  const frames = await Promise.all(
    sizes.map(async (size) => {
      const { data } = await sharp(icon, { density: 900 })
        .resize(size, size)
        .raw()
        .ensureAlpha()
        .toBuffer({ resolveWithObject: true });

      const rowMask = Math.ceil(size / 32) * 4; // 1bpp AND mask, 4-byte aligned
      const body = Buffer.alloc(40 + size * size * 4 + rowMask * size);

      body.writeUInt32LE(40, 0); // BITMAPINFOHEADER
      body.writeInt32LE(size, 4);
      body.writeInt32LE(size * 2, 8); // XOR + AND masks stacked
      body.writeUInt16LE(1, 12); // planes
      body.writeUInt16LE(32, 14); // bits per pixel
      body.writeUInt32LE(size * size * 4 + rowMask * size, 20);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const src = (y * size + x) * 4;
          const dst = 40 + ((size - 1 - y) * size + x) * 4; // bottom-up
          body[dst] = data[src + 2]; // B
          body[dst + 1] = data[src + 1]; // G
          body[dst + 2] = data[src]; // R
          body[dst + 3] = data[src + 3]; // A
        }
      }

      return { size, body };
    })
  );

  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  let offset = header.length;
  frames.forEach((frame, i) => {
    const entry = 6 + i * 16;
    header[entry] = frame.size % 256; // 256 is written as 0
    header[entry + 1] = frame.size % 256;
    header.writeUInt16LE(1, entry + 4); // planes
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.body.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.body.length;
  });

  writeFileSync(pub("favicon.ico"), Buffer.concat([header, ...frames.map((f) => f.body)]));
}

/**
 * The card social platforms show. 1200x630 is the size every one of them
 * crops to, and staying under ~300KB keeps scrapers that give up on large
 * files (WhatsApp is the strict one) from showing a bare link.
 *
 * The wordmark is blue artwork, so it is recoloured to white through its own
 * alpha rather than shipping a second logo file.
 */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

/**
 * Article covers are shot for the page, not for a share card — one of them is
 * a 2:3 portrait, which social platforms either letterbox or crop through the
 * middle of. Each one is re-cropped to the card frame here and written to
 * `public/og/`, which is what `ogImage` in `app/data/blog.ts` points at.
 *
 * Add an entry when a post is published, and set `ogImage` on the post to
 * match. A post without one shares the site-wide card instead, so a forgotten
 * entry is a plainer preview rather than a broken image.
 */
const ARTICLE_COVERS = [
  { source: "blog-malay-phrases.jpg", out: "og/25-malay-phrases-to-learn-before-visiting-malaysia.jpg" },
  { source: "blog-traveloop-intro.jpg", out: "og/traveloop-malaysia-all-you-need-to-know.jpg" },
];

async function articleCards() {
  await mkdir(join(root, "public", "og"), { recursive: true });

  await Promise.all(
    ARTICLE_COVERS.map(({ source, out }) =>
      sharp(join(root, "public", source))
        // "attention" crops toward the busiest region rather than the centre,
        // which keeps the subject of a tall photo in the frame.
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover", position: "attention" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(pub(out))
    )
  );
}

async function openGraph() {
  const W = OG_WIDTH;
  const H = OG_HEIGHT;

  const photo = await sharp(join(root, "public", "hero3.png"))
    .resize(W, H, { fit: "cover", position: "attention" })
    .toBuffer();

  const logoWidth = 360;
  const logo = sharp(join(root, "public", "traveloop-logo.webp")).resize({ width: logoWidth });
  const { data: logoRaw, info } = await logo.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < logoRaw.length; i += 4) {
    logoRaw[i] = 255;
    logoRaw[i + 1] = 255;
    logoRaw[i + 2] = 255;
  }
  const whiteLogo = await sharp(logoRaw, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const scrim = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
       <defs>
         <linearGradient id="g" x1="0" y1="1" x2="0" y2="0">
           <stop offset="0" stop-color="#061329" stop-opacity="0.92"/>
           <stop offset="0.45" stop-color="#061329" stop-opacity="0.45"/>
           <stop offset="1" stop-color="#061329" stop-opacity="0"/>
         </linearGradient>
       </defs>
       <rect width="${W}" height="${H}" fill="url(#g)"/>
     </svg>`
  );

  await sharp(photo)
    .composite([
      { input: scrim },
      { input: whiteLogo, left: 64, top: H - info.height - 64 },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(pub("og-traveloop.jpg"));
}

await Promise.all([
  render(192).toFile(pub("icon-192.png")),
  render(512).toFile(pub("icon-512.png")),
  maskable(512, pub("icon-maskable-512.png")),
  // iOS ignores transparency and rounds the corners itself, so the Apple icon
  // is the same square art with no rounding of its own to double up on.
  maskable(180, pub("apple-icon.png")),
  ico([16, 32, 48]),
  openGraph(),
  articleCards(),
]);

writeFileSync(pub("icon.svg"), icon);
console.log("brand assets written to public/");
