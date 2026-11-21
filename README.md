# juierstore blog

个人博客的完整源码。基于开源主题 [astro-koharu](https://github.com/cosZone/astro-koharu) 构建，按 [AGPL-3.0](./LICENSE) 许可发布。

## 来源与改动说明

本项目 fork 自 **cosZone/astro-koharu v7.7.5**（AGPL-3.0）。

原作者：cosine（<https://blog.cosine.ren/>）。主题设计灵感来自 Hexo 的 Shoka 主题。
上游仓库：<https://github.com/cosZone/astro-koharu>

### 相对上游的改动

| 文件 | 改动内容 |
|---|---|
| `src/pages/tools.astro` | 新增「工具」页面，用卡片列表展示站内小工具 |
| `src/pages/[lang]/tools.astro` | 上述页面的多语言镜像 |
| `src/pages/friends.astro`、`src/pages/[lang]/friends.astro` | 删除友链页面 |
| `src/pages/music.md` | 换成自己的网易云歌单 |
| `src/layouts/HeadMeta.astro` | 修正 favicon 的 MIME 类型（原为 `image/svg+xml`，实际是 `image/x-icon`） |
| `src/i18n/translations/zh.ts` | 增加工具页文案，增加 `nav.tools` |
| `scripts/convert-image.mjs` | 新增：把任意图片转成主题需要的 webp 规格 |
| `scripts/make-favicon.mjs` | 新增：生成多尺寸 favicon.ico |
| `config/site.yaml` | 站点信息、社交链接、导航、分类体系 |
| `src/content/blog/` | 全部替换为自己的文章 |

### 上游主题特性

Astro 7 静态输出、Pagefind 无后端搜索、LQIP 图片占位、深浅主题、多语言路由、Shoka 兼容的 Markdown 扩展语法、Waline/Giscus/Twikoo 评论接入、Mermaid 图表、KaTeX 公式等。详见上游仓库文档。

## 构建与运行

需要 **Node.js ≥ 22.20.0** 和 **pnpm 10.28.2**。

```bash
pnpm install
pnpm dev        # 开发预览 http://localhost:4321
pnpm build      # 构建静态产物到 dist/
pnpm preview    # 预览构建结果
```

国内网络下如果 `pnpm install` 卡住：

```bash
pnpm install --filter astro-koharu --registry=https://registry.npmmirror.com
```

### 常用命令

```bash
pnpm koharu new post          # 新建文章
pnpm koharu generate lqips    # 生成图片占位色（加图后需要）
pnpm koharu backup            # 备份内容与配置
pnpm koharu update            # 从上游更新主题
```

> `pnpm koharu generate` 在某些环境下会异常退出，可直接用
> `npx tsx src/scripts/generateLqips.ts` 绕过。

## 关于素材

**本仓库不包含任何图片素材和字体文件**，原因见下。

### 位置占位图

`public/img/` 下的图片是从零生成的纯色渐变占位图（26 张，共 94 KB），不是任何人的作品。替换方式：

```bash
node scripts/convert-image.mjs 你的图.jpg hero      # 首页大图，生成四档
node scripts/convert-image.mjs 你的头像.png avatar   # 头像
node scripts/convert-image.mjs 你的图.png cover my-1 # 文章封面
pnpm koharu generate lqips
```

`src/assets/svg/logo.svg` 同样是占位 SVG（`showLogo: true` 时显示）。

### 为什么不含插画和字体

- `public/img/` 原本的 21 张插画是主题作者提供的示例素材，版权独立于代码，不适合随代码再分发
- `public/fonts/` 里的字体（寒蝉全圆体、源柔ゴシック等）有各自的授权协议，公开转载存在风险
- 因此仓库只保留代码与占位图。缺失字体时页面会回退到系统字体，不影响功能

如需完整外观，请从[上游仓库](https://github.com/cosZone/astro-koharu)获取对应素材，并自行确认授权。

## 部署

这是个纯静态站点，`pnpm build` 出来的 `dist/` 可以交给任何静态文件服务器（nginx、Caddy、Vercel、Netlify 等）。

```bash
pnpm build
tar -czf site.tar.gz -C dist .
scp site.tar.gz user@your-server:/tmp/
ssh user@your-server "tar -xzf /tmp/site.tar.gz -C /var/www/your-site/"
```

仓库里的 `docker/` 目录保留了上游的 Docker 部署方案，供参考。

## 环境变量

复制 `.env.example` 为 `.env`：

```env
BLOG_PORT=4321
# 仅在开启「碎碎念」功能时需要
# KOHARU_SUITE_URL=https://suite.example.com
```

## 许可证

[GNU Affero General Public License v3.0](./LICENSE)

本仓库是基于 AGPL-3.0 项目的修改版本，同样以 AGPL-3.0 发布。如果你要部署修改后的版本并提供网络访问，需一并提供源代码。

原始版权归 astro-koharu 的作者 cosine 及各位贡献者所有。
