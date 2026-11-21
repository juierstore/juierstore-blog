---
title: 静态博客的运维实录：预览、构建、发布与下线
link: site-ops-guide
catalog: true
date: 2026-11-21 15:30:00
description: 从本地预览到服务器上线，这套 Astro 静态博客的完整运维流程：两条命令完成发布、三种粒度下线、以及踩过的五个坑。
tags:
  - 教程
  - 运维
  - nginx
  - Astro
categories:
  - 教程
keywords:
  - 静态博客
  - 部署
  - nginx
  - 运维
cover: /img/cover/site-ops.webp
---

这个站上线之后,我把它真正的运维流程整理了一遍。不是"如何搭建"——那种教程很多——而是**每天怎么用、出问题怎么查、不想要了怎么下线**。

## 一、先搞清楚它是什么

一句话:**构建时生成的静态文件 + 一个 nginx**。

```plain
本机构建            上传             服务器
─────────         ──────          ───────────────────
Markdown  ──┐                     ┌─ nginx ─→ /www/wwwroot/站点目录
src/       ─┼→ pnpm build → dist/ ─┤
config/    ─┘         ↓            └─ 静态文件,只读不写
                   tar.gz
```

关键点:**服务器不参与构建**。

- 没有 Node 运行时
- 没有数据库
- 没有后台管理进程

只有 nginx 在发文件。所以这台 2 核 2G 的小机器扛得住——压力全在本机。

:::info
为什么不在服务器上构建?这个主题依赖里有 three.js、sharp、mermaid,
构建峰值内存超过 2G。1.7G 内存的机器会在 `pnpm build` 中途被 OOM kill。
把编译放本地,服务器只做一件事:发文件。
:::

## 二、本地:预览有两种模式

很多人第一反应是 `pnpm dev`,但它不是最好的选择。

| 命令 | 用途 | 首次打开 |
|---|---|---|
| `pnpm preview` | 看**已经构建好**的成品 | 秒开 |
| `pnpm dev` | **边改边看**,热更新 | 要现场编译,10–30 秒白屏 |

只是想看看长什么样,用 `preview`;要改东西,用 `dev`。

```powershell
pnpm preview
# astro  v7.1.3 ready in 12 ms
# ┃ Local    http://localhost:4321/
```

:::warning
`pnpm dev` 的首次白屏是正常的。Astro 按需编译页面,不是卡死。
等 30 秒还不出来才是真有问题。
:::

## 三、本地:构建

```powershell
pnpm build
```

| 指标 | 正常值 |
|---|---|
| 首次耗时 | 约 60 秒 |
| 有缓存 | 15–30 秒 |
| 页数 | 71 页 |
| 产物 | `dist/`,约 1400 个文件 / 50 MB |

构建前会自动跑一次文章链接迁移检查,输出"需迁移 0 篇"就是正常。

### 什么时候必须重新构建

这个主题的配置是**构建时读取并缓存**的,所以:

- 改了 `config/site.yaml` → 必须重建(刷新浏览器没用)
- 改了 `src/` 里任何代码 → 必须重建
- 加了图片、字体 → 必须重建
- 增删文章 → 必须重建

### 打包

```bash
tar -czf site.tar.gz -C dist .
```

50 MB 压到 **32 MB**——图片已经是 webp/avif,压不动,压缩的只是 HTML/CSS/JS。

`-C dist .` 这个写法很重要,它保证 `index.html` 在包根目录,而不是嵌套在 `dist/` 里。

## 四、服务器:东西都在哪

用的是宝塔面板,所以 nginx 是它自带的定制版,路径和系统 nginx 不同:

| 内容 | 宝塔路径 | 系统 nginx 路径 |
|---|---|---|
| nginx 本体 | `/www/server/nginx/` | `/usr/sbin/nginx` |
| 站点配置 | `/www/server/panel/vhost/nginx/` | `/etc/nginx/sites-available/` |
| 网站目录 | `/www/wwwroot/` | `/var/www/` |
| 日志 | `/www/wwwlogs/` | `/var/log/nginx/` |

:::warning
两套 nginx **不能共存**,会抢 80 端口。
装了宝塔就只用宝塔的,别再去 `apt install nginx`。
:::

站点的 nginx 配置就一个文件,60 行左右:

```nginx
server {
    listen 80;
    server_name 你的域名或IP;
    root /www/wwwroot/你的站点;
    index index.html;

    location /_astro/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files $uri $uri/ $uri/index.html =404;
    }
}
```

`try_files` 那一行是静态站的核心:`/archives/` 这种目录地址要能找到 `/archives/index.html`。

## 五、发布:一条命令

```powershell
.\upload-baota.ps1 -Server 你的服务器地址
```

它做的事:

1. 构建
2. 打包 tar.gz
3. scp 上传到 `/tmp/`
4. 服务器解压到暂存目录
5. **清空旧文件**后拷入新文件
6. 修正属主和权限
7. 清理临时文件

全程约 40 秒,大头是传输。

### 两个容易忽略的点

**权限要修**。宝塔的 nginx 以 `www` 用户运行,文件必须是 `www:www`、目录 755、文件 644,否则读不到:

```bash
chown -R www:www /www/wwwroot/你的站点
find /www/wwwroot/你的站点 -type d -exec chmod 755 {} \;
find /www/wwwroot/你的站点 -type f -exec chmod 644 {} \;
```

**换静态文件不需要重载 nginx**。文件替换立刻生效,只有改 `.conf` 才需要 `nginx -s reload`。

### 手工兜底

脚本挂了就这样做:

```bash
STAGE=$(mktemp -d)
tar -xzf /tmp/site.tar.gz -C $STAGE
find /www/wwwroot/你的站点 -mindepth 1 -delete
cp -a $STAGE/. /www/wwwroot/你的站点/
rm -rf $STAGE
```

注意是"先清空再拷入",不是叠加上去——否则删掉的文章会一直留在服务器上。

## 六、下线:三种粒度

### 只停博客(推荐)

```bash
cd /www/server/panel/vhost/nginx
mv juierstore.conf juierstore.conf.off
nginx -t && nginx -s reload
```

nginx 只加载 `*.conf`,改名即下线。文件全保留,随时能恢复。

**恢复:**

```bash
mv juierstore.conf.off juierstore.conf
nginx -t && nginx -s reload
```

### 停整个 nginx

```bash
systemctl stop nginx
```

:::warning
如果这台服务器上还跑了别的站(比如反代到某个端口的应用),stop nginx 会把它们一起停掉。
这台机器上就跑着两个站,共用同一个 nginx 进程——所以**永远用 reload,不用 stop**。
:::

### 彻底移除

```bash
rm -f /www/server/panel/vhost/nginx/站点.conf
nginx -t && nginx -s reload
rm -rf /www/wwwroot/你的站点
```

## 七、排查:万能三连

出问题先跑这三条:

```bash
tail -20 /www/wwwlogs/站点.error.log
nginx -t
curl -s -o /dev/null -w "%{http_code}\n" -H "Host: 你的域名" http://127.0.0.1/
```

| 现象 | 先查什么 |
|---|---|
| 网站打不开 | 云厂商安全组 80 是否放行 → nginx 是否在跑 → 端口是否监听 |
| 502 / 504 | nginx 正常但后端挂了,查反代目标服务 |
| 改了配置不生效 | 忘了 reload;或改的是 `site.yaml` 但没重新构建 |
| 部分资源 404 | 文件没传全,数一下服务器上的文件数 |
| 页面样式错乱 | 浏览器缓存,强刷 `Ctrl+Shift+R` |
| 发布后看不到新内容 | HTML 缓存了一小时,强刷;或确认 dist 里真有新文件 |

## 八、踩过的五个坑

**1. `pnpm koharu generate lqips` 会异常退出**

CLI 封装有问题,exit 1 且无报错。绕过去:

```bash
npx tsx src/scripts/generateLqips.ts
```

**2. 提示块语法必须单独一行**

```markdown
:::info
内容
:::
```

写成 `:::info 标题` 会把整段渲染成一行字。

**3. favicon 的 MIME 类型是错的**

主题里写的是 `type="image/svg+xml"`,但文件是 ICO。浏览器按 SVG 解析会失败,图标就不显示。

```html
<!-- 错的 -->
<link rel="icon" type="image/svg+xml" href="/favicon.ico" />
<!-- 对的 -->
<link rel="icon" type="image/x-icon" href="/favicon.ico" />
```

**4. 中心裁切会切掉构图重点**

首页大图是 16:9,如果原图头顶贴着上沿,居中裁切会把头部切掉。要指定顶部对齐:

```bash
node scripts/convert-image.mjs 原图.jpg hero --position=north
```

**5. 图片别放进 public 再编辑**

`public/` 下的文件会被原样发布出去。原图放进去,它就会出现在网站上,还会被一起打包上传。原图应该放在项目外的归档目录。

## 九、一句话总结

> 本地构建,上传静态文件,nginx 只管发文件。

理解这一句,后面所有操作都是它的推论:

- 为什么服务器不用装 Node —— 因为不构建
- 为什么改配置要重新构建 —— 因为配置在构建时读取
- 为什么发布要传 32 MB —— 因为是整个站点
- 为什么下线只需改个文件名 —— 因为 nginx 只是按文件名加载配置

---

这套站点的源码开放在 [GitHub](https://github.com/juierstore/juierstore-blog)，采用 AGPL-3.0 许可。
运维流程我另存了一份更详细的本机文档，包含具体的服务器地址、路径和密钥位置，那部分涉及基础设施信息，不适合公开。
