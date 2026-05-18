# 水镜雪的博客

> Astro + React + Express + SQLite 全栈博客，部署在云服务器。

---

## 技术栈

| 层 | 技术 | 端口 |
|---|---|---|
| 前台 | Astro 5 + Vue 3 + Tailwind CSS | 4321 |
| 后台管理 | React 18 + Vite + Tiptap 富文本 | 5173 |
| API 服务 | Express + Prisma ORM + SQLite | 3000 |
| 认证 | JWT（bcrypt 密码哈希，7天过期） | — |
| 验证码 | svg-captcha（扭曲字符图片，30s 过期） | — |
| 部署 | Shell 脚本一键安装启动 | — |

---

## 特色功能

### 📝 文章系统
- Tiptap 富文本编辑器，JSON 格式存储
- 分类 + 标签多对多关联
- `status`（草稿/已发布）和 `visibility`（公开/私有）双重控制
- 封面图上传

### 🔍 浏览体验
- 首页分页（每页 6 篇），桌面端数字按钮、手机端 `1 / N`
- 排序切换：按日期倒序 / 按点赞数倒序，切换自动回到第 1 页
- 归档页按年月分组
- 全站搜索（标题 + 内容）
- 分类 / 标签聚合页

### ❤️ 互动
- 匿名点赞 toggle：点一下 +1（❤️），再点撤销（🤍），基于 localStorage 匿名 ID
- 匿名评论，支持回复嵌套

### 🛡️ 安全
- JWT 认证 + bcrypt 密码哈希
- 图片验证码防暴力破解：svg-captcha 生成 4 位扭曲字符 + 干扰线，30 秒过期，用后即焚
- 修改密码自动踢出所有设备（tokenVersion 递增）

### ⚙️ 站点管理
- 站点标题 / 描述 / 作者名在线修改
- 修改作者名一键替换全站文件（grep + sed 批量处理）
- 仪表盘统计数据
- 媒体库（图片上传 / 管理）
- 数据导入导出（JSON + ZIP，含图片打包，跨服务器迁移）

### 🖼️ 头像与个人主页

**替换头像**：直接替换静态文件，无需改代码。

```
文件位置：frontend-astro/public/avatar.jpg
引用位置：
  - frontend-astro/src/layouts/Layout.astro   → 导航栏小头像（w-8 h-8）
  - frontend-astro/src/pages/about.astro      → 关于页大头像（w-24 h-24）

换头像只需覆盖 avatar.jpg 即可，两处自动生效。
如需改文件名或格式（如 avatar.png），同步修改两处 src="/avatar.jpg"。
```

**修改个人主页**：关于页 `about.astro` 中以下内容需手动编辑：

```
文件位置：frontend-astro/src/pages/about.astro

可修改内容：
  - 第 1 行 作者简介短句 → "写代码，读闲书，听音乐。"
  - 第 2 行 正文介绍   → "你好，我是{authorName}..."
  - 联系方式            → 邮箱、GitHub 链接
  - 关于本站说明        → "基于 Astro + Vue3 构建..."

备注：作者名 {authorName} 由 settings 动态读取，无需手动改。
```

### 🚀 部署友好
- `install.sh` 一键安装依赖 + 初始化数据库 + 启动三端
- `start.sh` 带服务健康检查（8 次重试）
- 打包自动排除 `node_modules`、`.git`、`*.db`，保护生产数据

---

## 重点代码

### 点赞 Toggle

```
POST /api/posts/:id/like  { anonId }

Like 表 anonId + postId 联合唯一约束。
先查历史 → 有则 DELETE（取消点赞）→ 无则 CREATE（点赞）。
数据库事务更新 post.likes 计数，保证并发安全。
```

文件：`server/src/controllers/postController.js` → `likePost()`

### 分页 + 排序

```
GET /api/posts?page=1&limit=6&sort=likes

sort=date  → orderBy { publishedAt: 'desc' }
sort=likes → orderBy { likes: 'desc' }

返回 { data, pagination: { page, limit, total, totalPages } }
前端从 URL ?page= 读取当前页，排序切换自动 reset page=1。
```

文件：`server/src/controllers/postController.js`，`frontend-astro/src/pages/index.astro`

### 图片验证码

```
GET  /api/auth/captcha   → { token, svg: "<svg>...</svg>" }
POST /api/auth/login     → { username, password, captchaToken, captchaAnswer }

svg-captcha 生成 4 位扭曲字符 + 3 条干扰线，token 存内存 Map，
30 秒过期，用后即焚。校验忽略大小写。
```

文件：`server/src/controllers/authController.js`，`server/src/routes/auth.js`，`admin-react/src/pages/Login.jsx`

### JWT 认证 + 密码修改踢出

```
登录 → bcrypt 验证 → JWT 签发 { id, username, tv: tokenVersion }
修改密码 → tokenVersion +1 → 旧 token 全部失效
requireAuth 中间件校验 tv 匹配
```

文件：`server/src/controllers/authController.js`，`server/src/middleware/auth.js`

### 可见性双控

```
status:     published / draft
visibility: public / private

未登录用户：
  - 列表只返回 published + public
  - 访问私有文章 URL 返回 404
已登录管理端：全部可见
```

文件：`server/src/controllers/postController.js` → `listPosts()`

---

## 部署流程

### 本地开发

```bash
git clone https://github.com/haitao-520/my_blog blog && cd blog
bash install.sh
bash start.sh

# 前台: http://localhost:4321
# 后台: http://localhost:5173    默认 admin / admin123
# API:  http://localhost:3000/api/health
```

### 生产部署

```bash
# 1. 打包（排除 node_modules、数据库、构建产物）
tar -czf blog-github.tar.gz \
  --exclude='node_modules' --exclude='.git' \
  --exclude='*.db' --exclude='*.db-journal' \
  --exclude='dist' --exclude='.astro' --exclude='*.log' \
  -C blog .

# 2. 上传
scp blog-github.tar.gz root@服务器IP:/root/blog/

# 3. 安装启动
ssh root@服务器IP
cd /root/blog && tar -xzf blog-github.tar.gz && bash install.sh

# 4. 云服务器控制台安全组放行 3000/4321/5173
```

### 服务器更新

```bash
# 打包时排除数据库，保护生产数据：
tar --exclude='*.db' --exclude='*.db-journal' -czf blog-github.tar.gz .
# 上传后 install.sh 自动 npm install + prisma 同步 + 重启三端
```

---

## 许可

MIT