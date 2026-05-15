const express = require('express');
const cors = require('cors');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

// --------------- 中间件 ---------------
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 静态文件服务 (上传的图片等)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// --------------- 路由 ---------------
const postsRouter = require('./routes/posts');
const categoriesRouter = require('./routes/categories');
const tagsRouter = require('./routes/tags');
const mediaRouter = require('./routes/media');
const commentsRouter = require('./routes/comments');
const authRouter = require('./routes/auth');

const statsRouter = require('./routes/stats');

const dataRouter = require('./routes/data');

const settingsRouter = require('./routes/settings');

app.get('/api/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

app.use('/api/stats', statsRouter);
app.use('/api', dataRouter);
app.use('/api/auth', authRouter);
app.use('/api/posts', postsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/media', mediaRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/settings', settingsRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// --------------- 启动 ---------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
