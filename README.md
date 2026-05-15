# 水镜雪的博客

Astro + React + Express + SQLite 全栈博客，手机/服务器都能跑。

## 项目树结构

```
blog/
├── start.sh                  # 启动脚本：一键启动 API + Astro + React 三端
├── install.sh                # 部署安装脚本：npm install + prisma 迁移 + 启动
├── db-init.sh                # 数据库初始化：prisma generate + db push
├── deploy.sh                 # 部署辅助脚本
├── README.md                 # 本文档
├── .gitignore                # Git 忽略规则
│
├── server/                   # ========== 后端 API (Express + Prisma + SQLite) ==========
│   ├── .env                  # 环境变量：DATABASE_URL, JWT_SECRET, PORT=3000
│   ├── package.json          # Node 依赖
│   ├── prisma/
│   │   ├── schema.prisma     # 数据模型：User, Post, Category, Tag, Comment, Like, Setting, Media
│   │   └── seed.js           # 初始数据种子（默认 admin 账号等）
│   ├── src/
│   │   ├── index.js          # Express 入口：中间件注册、路由挂载、启动监听
│   │   ├── middleware/
│   │   │   └── auth.js       # JWT 认证中间件：requireAuth / optionalAuth
│   │   ├── routes/           # 路由层（RESTful，挂载到 /api/*）
│   │   │   ├── auth.js       # POST /api/auth/login — 登录获取 token
│   │   │   ├── posts.js      # CRUD /api/posts + POST /api/posts/:id/like（点赞 toggle）
│   │   │   ├── categories.js # CRUD /api/categories
│   │   │   ├── tags.js       # CRUD /api/tags
│   │   │   ├── comments.js   # CRUD /api/comments
│   │   │   ├── media.js      # CRUD /api/media（文件上传/管理）
│   │   │   ├── settings.js   # GET/PUT /api/settings + PUT /api/settings/rename（改名）
│   │   │   ├── stats.js      # GET /api/stats（仪表盘统计）
│   │   │   └── data.js       # 数据导入导出
│   │   └── controllers/      # 控制器层（业务逻辑）
│   │       ├── authController.js      # 登录验证、token 签发
│   │       ├── postController.js      # 文章 CRUD、点赞 toggle、可见性过滤
│   │       ├── categoryController.js  # 分类管理
│   │       ├── tagController.js       # 标签管理
│   │       ├── commentController.js   # 评论管理
│   │       ├── mediaController.js     # 文件上传
│   │       ├── settingsController.js  # 站点设置、作者名修改（grep/sed 批量替换文件）
│   │       ├── statsController.js     # 仪表盘统计
│   │       └── dataController.js      # 数据导入导出
│   └── uploads/              # 上传文件存储目录
│
├── frontend-astro/           # ========== 前台 (Astro + Vue 3 + Tailwind) ==========
│   ├── astro.config.mjs      # Astro 配置：Vue 集成、Tailwind 集成、API 代理 /api → :3000
│   ├── package.json
│   ├── tailwind.config.mjs   # Tailwind 主题配置
│   ├── public/
│   │   └── avatar.jpg        # 作者头像
│   ├── src/
│   │   ├── env.d.ts          # TypeScript 环境声明
│   │   ├── styles/
│   │   │   └── global.css    # Tailwind 基础 + 全局样式
│   │   ├── lib/              # 工具库
│   │   │   ├── api.js        # API 请求封装（带缓存，SSR/CSR 双端可用）
│   │   │   └── settings.js   # 站点设置读取（authorName/siteTitle/siteDesc，60s 内存缓存）
│   │   ├── layouts/
│   │   │   └── Layout.astro  # 全局布局：导航栏 + 页脚（authorName 动态显示）
│   │   ├── pages/            # 页面路由（Astro 文件路由）
│   │   │   ├── index.astro            # / 首页（文章列表 + 分页）
│   │   │   ├── about.astro            # /about 关于作者页（authorName 动态）
│   │   │   ├── archive.astro          # /archive 归档页（按年月分组）
│   │   │   ├── search.astro           # /search 搜索页（Vue 组件）
│   │   │   ├── categories/
│   │   │   │   ├── index.astro        # /categories 分类列表
│   │   │   │   └── [slug].astro       # /categories/:slug 分类下文章列表
│   │   │   ├── tags/
│   │   │   │   └── [slug].astro       # /tags/:slug 标签下文章列表
│   │   │   └── posts/
│   │   │       └── [slug].astro       # /posts/:slug 文章详情（authorName 显示作者）
│   │   └── components/       # Vue 组件（client:only 客户端渲染）
│   │       ├── CommentSection.vue     # 评论区（发表/展示/删除）
│   │       ├── LikeButton.vue         # 点赞按钮（❤️/🤍 toggle）
│   │       ├── SearchPage.vue         # 全站搜索（标题+内容）
│   │       └── TiptapRenderer.vue     # Tiptap JSON → HTML 渲染器
│   └── dist/                 # Astro 构建输出
│
└── admin-react/              # ========== 后台管理 (React 18 + Vite + Tiptap) ==========
    ├── vite.config.js        # Vite 配置：代理 /api → :3000
    ├── package.json
    ├── tailwind.config.js    # Tailwind 配置
    ├── index.html            # SPA 入口
    ├── src/
    │   ├── main.jsx          # React 入口
    │   ├── App.jsx           # 路由配置（react-router）
    │   ├── index.css         # 全局样式
    │   ├── contexts/
    │   │   └── AuthContext.jsx     # 认证上下文（登录态/token 管理）
    │   ├── lib/
    │   │   └── api.js        # API 请求封装（自动带 token）
    │   ├── components/
    │   │   ├── Layout.jsx         # 后台布局（侧边栏 + 顶栏）
    │   │   ├── PostEditor.jsx     # Tiptap 富文本编辑器封装
    │   │   └── ProtectedRoute.jsx # 路由守卫（未登录跳转）
    │   └── pages/
    │       ├── Login.jsx          # 登录页
    │       ├── Dashboard.jsx      # 仪表盘（统计数据）
    │       ├── Posts.jsx          # 文章列表
    │       ├── PostNew.jsx        # 新建文章
    │       ├── PostEdit.jsx       # 编辑文章
    │       ├── Categories.jsx     # 分类管理
    │       ├── Tags.jsx           # 标签管理
    │       ├── Comments.jsx       # 评论管理
    │       ├── Media.jsx          # 媒体库
    │       └── Settings.jsx       # 站点设置、作者名修改、密码修改、数据导入导出
    └── dist/                  # Vite 构建输出
```

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

## 关键功能说明

### 作者名系统
- 数据库 `Setting` 表存储 `authorName`（键值对）
- `settings.js` 提供统一读取接口（60s 内存缓存）
- 全站统一读取：关于页 / 文章详情 / 页脚 / 导航栏头像 alt
- 后台设置页 → 作者名 → 输入新名称 → 一键替换所有文件 + 更新数据库

### 点赞 toggle
- `Like` 表 `anonId` + `postId` 唯一约束
- 客户端 `localStorage` 存储匿名 ID
- 点一次 +1（❤️），再点 -1（🤍），重复 toggle

### 可见性过滤
- 未登录用户：列表只显示 `status=published` + `visibility=public`
- 未登录用户：访问私有文章返回 404
- 已登录（后台）：全部可见

## 部署

```bash
# 1) 克隆或解压
git clone <repo-url> blog && cd blog
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

## 修改密码

后台 → 设置 → 页面底部「修改密码」。改完后**所有设备自动踢出重新登录**。

## 数据导入导出

后台 → 设置 → 导出/导入。支持 JSON/ZIP，含图片打包。旧服务器导出 → 新服务器导入即可迁移。

## 许可

MIT