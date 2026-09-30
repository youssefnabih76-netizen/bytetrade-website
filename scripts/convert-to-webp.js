/**
 * Fallback only — prefer the Vercel Image Optimization proxy (see vercel.json).
 * Use this if you outgrow that proxy's free-tier transform limits and want to
 * pre-convert your GitHub-hosted image repo to .webp once, ahead of time.
 *
 * Usage:
 *   1. npm install --save-dev sharp
 *   2. Clone your byte-trade-images repo locally next to this project
 *   3. node scripts/convert-to-webp.js ./path/to/byte-trade-images
 *   4. Commit + push the repo, then bulk-replace .jpg/.png with .webp
 *      in products-data.js (a simple find/replace on the file extension,
 *      since your image slugs already match SKU codes 1:1).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputDir = process.argv[2];
if (!inputDir) {
    console.error('Usage: node convert-to-webp.js <path-to-image-folder>');
    process.exit(1);
}

const IMAGE_EXT = /\.(jpe?g|png)$/i;

function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        if (!IMAGE_EXT.test(entry.name)) return;

        const outPath = full.replace(IMAGE_EXT, '.webp');
        sharp(full)
            .webp({ quality: 80 })
            .toFile(outPath)
            .then(() => console.log(`✓ ${path.relative(inputDir, outPath)}`))
            .catch((err) => console.error(`✗ ${full}:`, err.message));
    });
}

walk(inputDir);