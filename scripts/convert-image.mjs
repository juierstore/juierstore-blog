#!/usr/bin/env node
/**
 * 图片转换助手 —— 把任意图片转成博客需要的 webp 规格
 *
 * 用法:
 *   node scripts/convert-image.mjs <输入文件> avatar
 *   node scripts/convert-image.mjs <输入文件> hero
 *   node scripts/convert-image.mjs <输入文件> cover [输出文件名]
 *
 * 预设:
 *   avatar  头像      → public/img/avatar.webp        (256×256, 1:1)
 *   hero    首页大图  → public/img/site_header_*.webp (800/1200/1600/1920, 16:9)
 *   cover   文章封面  → public/img/cover/<名字>.webp  (1200×675, 16:9)
 *
 * 示例:
 *   node scripts/convert-image.mjs D:/我的头像.jpg avatar
 *   node scripts/convert-image.mjs D:/大图.png hero
 *   node scripts/convert-image.mjs D:/封面.png cover my-cover
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const PRESETS = {
  avatar: {
    outputs: [{ file: 'public/img/avatar.webp', width: 256, height: 256 }],
    quality: 88,
  },
  hero: {
    outputs: [800, 1200, 1600, 1920].map((w) => ({
      file: `public/img/site_header_${w}.webp`,
      width: w,
      height: Math.round((w * 9) / 16),
    })),
    quality: 82,
  },
  cover: {
    outputs: [{ dir: 'public/img/cover', width: 1200, height: 675 }],
    quality: 85,
  },
};

function fail(message) {
  console.error(`\n[错误] ${message}\n`);
  process.exit(1);
}

const rawArgs = process.argv.slice(2);
const positionArg = rawArgs.find((a) => a.startsWith('--position='));
const cropPosition = positionArg ? positionArg.split('=')[1] : 'centre';

const [input, presetName, customName] = rawArgs.filter((a) => !a.startsWith('--'));

if (!input || !presetName) {
  console.log(`
用法: node scripts/convert-image.mjs <输入文件> <avatar|hero|cover> [输出名] [--position=north]

  avatar  头像（256×256）
  hero    首页大图（800/1200/1600/1920 四档）
  cover   文章封面（1200×675）

裁切位置 --position:
  centre  居中（默认）
  north   靠上，保头部/上方内容
  south   靠下
  east/west 靠右/靠左

示例:
  node scripts/convert-image.mjs D:/头像.jpg avatar
  node scripts/convert-image.mjs D:/大图.png hero --position=north
  node scripts/convert-image.mjs D:/封面.png cover my-cover
`);
  process.exit(0);
}

const preset = PRESETS[presetName];
if (!preset) {
  fail(`未知类型 "${presetName}"，可选: ${Object.keys(PRESETS).join(' / ')}`);
}

const source = resolve(input);
if (!existsSync(source)) {
  fail(`找不到输入文件: ${source}`);
}

// 项目根目录 = 本脚本所在目录的上一级
const projectRoot = resolve(import.meta.dirname, '..');
const baseName = customName || basename(source, extname(source));

console.log(`\n输入: ${source}`);
console.log(`类型: ${presetName}`);
console.log(`裁切: ${cropPosition}\n`);

for (const output of preset.outputs) {
  const target =
    output.file ?? join(output.dir, `${baseName}.webp`);

  mkdirSync(resolve(projectRoot, target, '..'), { recursive: true });

  const dest = resolve(projectRoot, target);

  await sharp(source)
    .resize(output.width, output.height, { fit: 'cover', position: cropPosition })
    .webp({ quality: preset.quality })
    .toFile(dest);

  const { size } = statSync(dest);

  console.log(
    `  ✓ ${target}  ${output.width}×${output.height}  ${(size / 1024).toFixed(0)} KB`,
  );
}

console.log(`
完成。接下来:
  pnpm koharu generate lqips    # 重新生成图片占位符
  pnpm dev                      # 本地看效果
  pnpm build                    # 构建
`);
