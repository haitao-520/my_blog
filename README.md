# haitao的博客

Astro + React + Express + SQLite 简单的全栈博客，手机/服务器都能跑。

## 技术栈

| 层 | 技术 | 端口 |
|---|---|---|
| 前台 | Astro + Vue 3 + Tailwind | 4321 |
| 后台 | React 18 + Vite + Tiptap | 5173 |
| API | Express + Prisma + SQLite | 3000 |

## 核心数据模型

| 模型 | 说明 |
|------|------|
| User | 用户（登录认证） |
| Post | 文章（title/slug/content/likes/status/visibility） |
| Like | 点赞记录（anonId+postId 唯一，支持 toggle） |
| Category | 分类（支持层级 parentId） |
| Tag | 标签（多对多关联文章） |
| Comment | 评论（匿名昵称+邮箱，支持回复层级） |
| Setting | 键值设置（siteTitle/siteDesc/authorName） |
| Media | 上传文件记录 |



## 部署

```bash
# 1) 克隆或解压
git clone https://github.com/haitao-520/my_blog && cd blog
# 或: tar -xzf blog-deploy.tar.gz && cd blog

# 2) 一键安装 + 启动
bash install.sh
```

默认账号 admin / admin123。

## 放行端口

```bash
# 腾讯云/阿里云在控制台安全组放行 3000/4321/5173
# 本地防火墙:
ufw allow 3000/tcp
ufw allow 4321/tcp
ufw allow 5173/tcp
```
## 修改作者页

blog/frontend-astro/src/layouts/Layout.astro

## 修改头像

blog/frontend-astro/public/avatar.jpg
（图片改成相同名字替换即可）

## 修改密码

后台 → 设置 → 页面底部「修改密码」

## 数据导入导出

后台 → 设置 → 导出/导入。支持 JSON/ZIP，含图片打包。旧服务器导出 → 新服务器导入即可迁移。
