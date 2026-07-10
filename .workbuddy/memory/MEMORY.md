# 项目记忆

## 项目概况
- 类型：Hexo 博客（写给你的信 / 一个父亲写给女儿的信）
- 作者：Yumeng0628
- 主题：letter（自定义主题，位于 themes/letter）
- 部署：GitHub Actions 自动部署到 GitHub Pages（push 到 master 触发 .github/workflows/deploy.yml）
- 线上地址：https://mengziin.github.io

## 关键配置
- `_config.yml` 中 `post_asset_folder: true` 已开启：每篇文章有同名资源文件夹
- 文章位于 `source/_posts/`，配图放同名子目录，Markdown 用相对路径引用（如 `![](图片名.jpg)`）
- 不要用绝对路径引用图片，避免 Pages 子路径 404
- 建议图片文件名用英文/拼音，避免 Git/CI 编码问题

## 文章风格
- 内容是父亲写给女儿的信，偏生活化、口语化
- 现有文章：hello-my-dear.md、暑假.md

## 分享卡片功能（2026-07-09 新增）
- 文章页选中文字 → 纯前端 Canvas 生成信纸风卡片图（霞鹜文楷 + 羊皮纸横纹 + 署名 + 二维码）→ 预览下载，用于朋友圈/小红书分享
- 文件：`themes/letter/source/js/card.js`、`themes/letter/source/css/card.css`、`source/vendor/qrcode-generator.min.js`，在 `themes/letter/layout/post.ejs` 文末引入（仅文章页加载）
- Canvas 字体必须用 `'LXGW WenKai'`（与 `source/fonts/lxgwwenkai-regular.css` 的 @font-face 一致；style.css 里 TsangerJinKai 是失效声明，浏览器实际渲染 LXGW WenKai）
- 绘制前用 `document.fonts.load('48px "LXGW WenKai"', text)` 触发对应 unicode-range 子集加载
- 配色复刻 style.css 变量：paper #f5f4ed / paperCard #fbfaf4 / ink #1B365D / text #3a352e / muted #8b8275 / rule #d9d3c4
- 画布 1080×1350（4:5）@DPR=2，信纸横纹间距 = fontSize×1.85（复刻 1.85em）
- 文章元信息通过 `#card-meta` 的 data 属性注入（data-title/date/url/site），url = config.url + url_for(page.path)
