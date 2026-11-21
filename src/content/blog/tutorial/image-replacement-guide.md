---
title: 网页图片替换教程
link: image-replacement-guide
catalog: true
date: 2026-11-21 03:20:00
description: 头像、首页大图、文章封面、站点图标分别在哪个文件，要多大尺寸、换成什么格式，以及怎么生成图片占位符和重新发布。
tags:
  - 教程
  - 图片
  - webp
categories:
  - 教程
keywords:
  - 替换头像
  - 替换封面
  - webp
  - LQIP
cover: /img/cover/4.webp
---

站的视觉由四类图片决定：**头像、首页大图、文章封面、站点图标**。它们都在 `public/img/` 里，但用途和规格完全不同，混着换会出问题。

## 一、图片都在哪

```plain
public/
├── favicon.ico                        ← 浏览器标签页小图标
└── img/
    ├── avatar.webp                    ← 头像（侧边栏、页脚、分享卡片）
    ├── site_header_800.webp           ┐
    ├── site_header_1200.webp          │ 首页大图（4 个尺寸，同一张图的缩小版）
    ├── site_header_1600.webp          │
    ├── site_header_1920.webp          ┘
    ├── cover/                         ← 文章封面
    │   ├── 1.webp  ...  21.webp
    ├── weekly_header.webp             ← 周刊头图（当前没用到）
    └── effects/                       ← 特效素材
```

`public/` 下的文件会被原样复制到网站根目录，所以 `public/img/avatar.webp` 对应的网址就是 `/img/avatar.webp`。

## 二、换头像

**文件**：`public/img/avatar.webp`

**规格**：正方形，建议 **256×256** 或 512×512，webp 格式。

:::warning
**文件名不能改**：`config/site.yaml` 里写的是 `avatar: /img/avatar.webp`。换内容可以，改名就得同步改配置，否则头像直接裂掉。
:::

头像出现在三个地方：侧边栏个人信息区、页脚、以及分享到社交平台时的预览卡片。

## 三、换首页大图

**文件**：`site_header_800.webp`、`1200.webp`、`1600.webp`、`1920.webp`

**规格**：16:9，最长边分别对应 800 / 1200 / 1600 / 1920 像素。

:::info
**为什么要四个文件**：浏览器根据屏幕宽度挑最合适的一档下载。手机上加载 800 那档，4K 显示器才用 1920。全用一张大图会让手机白等几秒钟。
:::

这四个文件名是**代码里写死的**（`src/lib/responsive-image.ts`），不能改名。

不想做四份的话，至少把 `site_header_1920.webp` 换掉，另外三档可以继续用旧图——只要你不介意手机上有张图跟桌面不一致。

## 四、换文章封面

**文件**：放进 `public/img/cover/`，文件名随意。

**引用**：在文章 frontmatter 里写路径：

```yaml
cover: /img/cover/my-cover.webp
```

**规格**：建议 16:9，1200×675 左右。封面会出现在文章列表卡片和文章页顶部，太小的图会糊。

现有 `1.webp` 到 `21.webp` 是主题自带的示例插画，可以留着当占位，也可以全删掉换成自己的。

## 五、换站点图标

**文件**：`public/favicon.ico`

就是浏览器标签页上那个小图标。需要一个 `.ico` 格式文件，建议包含 16×16、32×32、48×48 三个尺寸。

在线转换工具很多，搜「png 转 ico」即可。也可以直接用一张 32×32 的 png 改名为 `favicon.ico`，大多数浏览器能认。

## 六、生成图片占位符（重要）

换完图片后必须跑一次：

```powershell
pnpm koharu generate lqips
```

它会扫描 `public/img/` 下所有图片，为每张生成一个「主色调渐变」字符串，写进 `src/assets/lqips.json`。

作用是：图片真正加载出来之前，先显示这块渐变，避免大片空白抖动（专业叫法是 LQIP，Low Quality Image Placeholder）。

不跑也能用，只是新图片没有占位色，加载时会闪一下。

## 七、把图片转成合适的格式

手机拍的、网上存的图多半是 jpg 或 png，又大又没必要。项目里已经装了 `sharp`，我基于它写了个转换脚本 `scripts/convert-image.mjs`，不用额外装任何工具。

### 头像（正方形）

```powershell
node scripts/convert-image.mjs D:/我的头像.jpg avatar
```

### 首页大图（一次生成四档）

```powershell
node scripts/convert-image.mjs D:/我的大图.jpg hero
```

### 文章封面

```powershell
node scripts/convert-image.mjs D:/封面.png cover my-cover
```

最后那个参数是输出文件名，省略就用原文件名。

脚本会按比例裁切填满（`fit: "cover"`），不会把图拉变形，并直接覆盖到正确的目标路径。不加参数运行可以看到完整用法：

```powershell
node scripts/convert-image.mjs
```

## 八、完整流程

```powershell
# 1. 换好图片文件
# 2. 重新生成占位符
pnpm koharu generate lqips

# 3. 本地看效果
pnpm dev

# 4. 满意后发布
cd ..\deploy
.\upload.ps1 -Server 你的公网IP
```

## 九、常见错误

**换完图网站还是旧的**

图片没重新构建上传。改 `public/` 下的文件同样要 `pnpm build`，因为它会参与图片优化，不是简单复制。

**头像变形了**

头像按正方形渲染。原图不是 1:1 的话会被拉伸，用 `fit: "cover"` 重新裁一次。

**首页大图在手机上显示的是中间一块**

移动端竖屏会按中心裁切成竖版（400×450），所以大图的主体内容要放在中间偏上，别把重要元素放边缘。

**图特别大，网站变慢**

单张图控制在 300 KB 以内。超过这个数，多半是没压过或者分辨率过剩，用上面的 sharp 命令重新导一次。

---

换图这件事没有风险——文件都在 `public/` 里，改坏了从 git 恢复就行：

```powershell
git checkout -- public/img/
```
