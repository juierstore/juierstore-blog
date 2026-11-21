#!/usr/bin/env node
/**
 * favicon 生成器 —— 把任意图片转成标准的多尺寸 favicon.ico
 *
 * 用法:
 *   node scripts/make-favicon.mjs <输入图片> [输出路径]
 *
 * 默认输出到 public/favicon.ico
 * 会生成 16 / 32 / 48 / 256 四个尺寸层，居中裁成正方形。
 *
 * 示例:
 *   node scripts/make-favicon.mjs D:/我的图标.png
 *   node scripts/make-favicon.mjs D:/logo.svg public/favicon.ico
 *
 * 说明:
 *   sharp 不支持写 .ico，这里手工封装 ICO 容器。
 *   每层用 PNG 编码（Vista 以后所有浏览器都支持 PNG-in-ICO）。
 */
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const SIZES = [16, 32, 48, 256];

const [input, outputArg] = process.argv.slice(2);

if (!input) {
  console.log(`
用法: node scripts/make-favicon.mjs <输入图片> [输出路径]

  输入支持 png / jpg / webp / svg 等
  默认输出 public/favicon.ico
  自动生成 ${SIZES.join(' / ')} 四个尺寸，居中裁成正方形

示例:
  node scripts/make-favicon.mjs D:/我的图标.png
`);
  process.exit(0);
}

const source = resolve(input);
if (!existsSync(source)) {
  console.error(`\n[错误] 找不到输入文件: ${source}\n`);
  process.exit(1);
}

const projectRoot = resolve(import.meta.dirname, '..');
const outputPath = resolve(projectRoot, outputArg ?? 'public/favicon.ico');

console.log(`\n输入: ${source}`);
console.log(`输出: ${outputPath}\n`);

// ---- 1. 逐尺寸生成 PNG ----
const layers = [];
for (const size of SIZES) {
  // 先放大到足够大再缩，SVG 和超小图也能拿到清晰结果
  const png = await sharp(source, { density: 384 })
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toBuffer();

  layers.push({ size, png });
  console.log(`  ✓ ${size}×${size}  ${(png.length / 1024).toFixed(1)} KB`);
}

// ---- 2. 封装成 ICO ----
// ICONDIR: reserved(2) type(2) count(2)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // 1 = ICO
header.writeUInt16LE(layers.length, 4);

// 每个 ICONDIRENTRY 16 字节
const entries = [];
let offset = 6 + layers.length * 16;

for (const { size, png } of layers) {
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size === 256 ? 0 : size, 0); // width（0 表示 256）
  entry.writeUInt8(size === 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // 调色板颜色数
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // 数据大小
  entry.writeUInt32LE(offset, 12); // 数据偏移

  entries.push(entry);
  offset += png.length;
}

const ico = Buffer.concat([header, ...entries, ...layers.map((l) => l.png)]);
writeFileSync(outputPath, ico);

console.log(`\n完成: ${(ico.length / 1024).toFixed(1)} KB，${layers.length} 个尺寸层`);
console.log(`
接下来:
  pnpm build     # 重新构建
  # 然后浏览器强刷（Ctrl+Shift+R），或清一下缓存
`);
