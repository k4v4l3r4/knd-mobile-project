const path = require('path');
const sharp = require('sharp');

(async () => {
  const canvasSize = 1024;
  const safeRatio = 0.60;
  const targetSize = Math.round(canvasSize * safeRatio);

  const SRC = path.join(__dirname, '..', 'assets', 'adaptive-android.png');
  const OUT = SRC; // overwrite same file

  // Prepare transparent canvas
  const canvas = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });

  // Resize source into safe area
  const resizedBuffer = await sharp(SRC)
    .resize(targetSize, targetSize, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const offset = Math.round((canvasSize - targetSize) / 2);

  const result = await canvas
    .composite([{ input: resizedBuffer, left: offset, top: offset }])
    .png()
    .toBuffer();

  await sharp(result).toFile(OUT);
  console.log(`Padded adaptive icon written: ${OUT}`);
})().catch(err => {
  console.error('Failed to pad adaptive icon:', err && err.message ? err.message : String(err));
  process.exit(1);
});
