---
title: 网页使用与维护教程
link: site-usage-guide
catalog: true
date: 2026-11-21 03:00:00
description: 从写一篇文章到发布上线，这套博客系统的完整维护手册：目录结构、写作流程、构建发布、配置修改、主题升级与备份还原。
tags:
  - 教程
  - 维护
  - Astro
categories:
  - 教程
keywords:
  - 博客维护
  - Astro
  - 静态站点
  - 部署
cover: /img/cover/1.webp
---

这篇文档写给未来的自己：隔了几个月再回来，照这里做就能把站维护下去。

## 一、先理解它是怎么运转的

这个博客**没有后台、没有数据库、没有管理界面**。它是用 [Astro](https://astro.build) 构建的纯静态站点，文章的 HTML 在**构建时**一次性生成好，服务器上只有一个 nginx 在发文件。

:::info
**一句话原理**：Markdown 文件 → 本地构建 → 一堆 HTML/CSS/JS → 上传到服务器 → nginx 直接发出去。
:::

这意味着：

| 环节 | 在哪做 | 说明 |
|---|---|---|
| 写文章 | 本地 | 写 `.md` 文件 |
| 预览 | 本地 | `pnpm dev`，改完立刻可见 |
| 构建 | 本地 | `pnpm build`，把 Markdown 变成 HTML |
| 发布 | 本地触发 | `upload.ps1` 打包上传 |
| 提供访问 | 服务器 | nginx，只读不写 |

服务器**不参与构建**。这台 2 核 2G 的阿里云 ECS 只负责发静态文件，所以它永远不会有内存压力。

## 二、目录速查

```plain
astro-koharu/
├── config/
│   └── site.yaml          ← 站点配置，改这里（站名、导航、社交链接、歌单…）
├── src/
│   ├── content/blog/      ← 所有文章（.md）
│   ├── assets/lqips.json  ← 图片占位符缓存，自动生成
│   ├── pages/             ← 页面路由
│   └── components/        ← 组件
├── public/
│   ├── img/               ← 图片资源（头像、封面、首页大图）
│   └── favicon.ico
├── deploy/                ← 部署脚本（本仓库之外那层）
└── dist/                  ← 构建产物，不要手动改
```

`dist/` 是构建结果，**每次构建都会被覆盖**，不要在里面改东西。

## 三、写一篇文章

### 方式一：命令行（推荐）

```powershell
cd astro-koharu
pnpm koharu new post
```

交互式依次询问：标题 → Slug → 描述 → 分类 → 标签 → 落款 → 是否草稿 → 确认。它会自动生成文件并写好 frontmatter。

### 方式二：手写文件

在 `src/content/blog/` 下任意位置新建 `.md`：

```markdown
---
title: 文章标题
date: 2026-11-21 10:30:00
link: my-new-post
description: 一句话摘要
categories:
  - 教程
tags: [随笔, 记录]
cover: /img/cover/1.webp
---

正文从这里开始。
```

### 方式三：浏览器写作室

打开 <http://localhost:4321/editor/>，左边写 Markdown 右边实时预览。

:::warning
**写作室不会保存到文件**：草稿存在浏览器 localStorage 里，清缓存就没了。要存成 `.md` 文件，得另开终端运行 `pnpm cms`（<http://localhost:4322>），那是本地 CMS，能写入磁盘。
:::

### frontmatter 字段表

| 字段 | 必填 | 说明 |
|---|---|---|
| `title` | 是 | 文章标题 |
| `date` | 是 | 发布时间，按 Asia/Shanghai 解析 |
| `link` | 否 | URL 路径。**发布后不要改**，改了老链接会 404 |
| `description` | 否 | 摘要，列表页和分享卡片用 |
| `cover` | 否 | 封面图路径 |
| `categories` | 否 | 分类，见下节 |
| `tags` | 否 | 标签，自由填 |
| `sticky` | 否 | `true` 置顶 |
| `draft` | 否 | `true` 不进构建，只在 `pnpm dev` 可见 |
| `catalog` | 否 | `false` 关闭目录 |
| `tocNumbering` | 否 | `false` 目录不编号 |
| `math` | 否 | `true` 启用数学公式 |
| `password` | 否 | 整篇加密 |
| `keywords` | 否 | SEO 关键词 |

## 四、本地预览

```powershell
pnpm dev
```

打开 <http://localhost:4321>。有热更新，改文件立刻生效，**不需要构建也不需要上传**。

写草稿、调样式、试排版，全都在这一步完成。

## 五、发布上线

构建出静态产物，然后把它放到服务器的网站根目录：

```bash
# 1. 本地构建，产物在 dist/
pnpm build

# 2. 打包
tar -czf site.tar.gz -C dist .

# 3. 上传到服务器（换成你自己的地址）
scp site.tar.gz user@your-server:/tmp/

# 4. 服务器上解压到网站根目录
ssh user@your-server "tar -xzf /tmp/site.tar.gz -C /var/www/your-site/"
```

整个流程约一分钟，主要耗时在传输。如果使用宝塔面板，也可以直接在「文件」里上传压缩包再解压。

## 六、改站点信息

全部集中在 `config/site.yaml`，改完**必须重新构建**才生效。

```yaml
site:
  title: juierstore        # 站名
  subtitle: 记录，整理，然后继续
  name: juierstore         # 作者名
  description: juierstore 的个人博客
  url: http://你的IP:8080  # 站点地址，影响 RSS 和 sitemap
  avatar: /img/avatar.webp
  startYear: 2026
```

:::warning
**url 一定要对**：`site.url` 决定了 RSS、sitemap、分享卡片里的绝对链接。填错了这些全是坏链。
:::

## 七、分类与导航

### 加一个新分类

分类名要在 `categoryMap` 里登记中文名到英文路径的映射，**否则构建会失败**：

```yaml
categoryMap:
  教程: tutorial
  随笔: life        # 想加就照这个格式继续写
```

然后在文章里写 `categories: [随笔]`，页面会自动生成在 `/categories/life`。

### 改导航栏

```yaml
navigation:
  - name: 首页
    path: /
    icon: ri:home-heart-fill
  - name: 文章
    icon: ri:quill-pen-ai-fill
    children:
      - name: 分类
        path: /categories
        icon: ri:grid-fill
```

删一项就少一个菜单，加一项就多一个。`icon` 只能用 `ri:`、`fa6-solid:`、`fa6-regular:`、`gg:` 这四套图标集。

## 八、升级主题

```powershell
pnpm koharu update           # 备份 + 拉取上游 + 合并 + 装依赖
pnpm koharu update --check   # 只看有没有更新
```

跨大版本时还要迁移文章链接格式：

```powershell
pnpm koharu migrate --dry-run    # 先预览要改什么
pnpm koharu migrate              # 真正执行
```

你的文章和 `config/site.yaml` 属于「用户内容」，合并时会自动保留本地版本。

## 九、备份与还原

```powershell
pnpm koharu backup           # 备份文章和配置
pnpm koharu backup --full    # 连主题文件一起
pnpm koharu list             # 查看所有备份
pnpm koharu restore --latest # 还原最新备份
```

更彻底的办法：这个目录本身是个 git 仓库，定期 `git add -A && git commit` 就有一份完整历史。

## 十、常见问题

**打包上传时提示连接失败**

检查三件事：服务器 IP 对不对、阿里云安全组放行了 22 端口没有、密钥或密码是否正确。

**网站打不开但上传成功了**

按顺序排查：

1. 阿里云安全组是否放行 80 / 8080
2. 服务器上 `systemctl status nginx` 是否在跑
3. 本机 `Test-NetConnection 你的IP -Port 8080`

**构建报 `Ignored build scripts`**

pnpm 10 的默认行为，不用管。项目用到的原生模块都是预编译包，已经在 `node_modules/.pnpm` 里了。

**`pnpm install` 卡住不动**

npm 官方源在国内经常挂死，换镜像：

```powershell
pnpm install --filter astro-koharu --registry=https://registry.npmmirror.com
```

**改了配置但网站没变**

配置在构建时读取。改完 `site.yaml` 要重新 `pnpm build` 并上传，光刷新浏览器没用。

## 附录：命令速查

| 命令 | 作用 |
|---|---|
| `pnpm dev` | 本地预览，热更新 |
| `pnpm build` | 构建生产版本到 `dist/` |
| `pnpm preview` | 预览构建产物 |
| `pnpm koharu new post` | 新建文章 |
| `pnpm koharu generate lqips` | 生成图片占位符 |
| `pnpm koharu backup` | 备份 |
| `pnpm koharu update` | 升级主题 |
| `pnpm cms` | 本地 CMS（能存文件） |
| `.\upload.ps1 -Server IP` | 发布到服务器 |

---

日常最短路径就三条命令：

```powershell
pnpm koharu new post    # 写
pnpm dev                # 看
cd ..\deploy; .\upload.ps1 -Server 你的IP   # 发
```
