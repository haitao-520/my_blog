const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'blog-mizukiyuki-default-change-me';

/**
 * 认证中间件
 * 验证 Authorization: Bearer <token>
 * 成功后挂载 req.user = { id, username }
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);

    // 校验 token 版本：改密码后旧 token 失效
    const dbUser = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!dbUser || dbUser.tokenVersion !== (payload.tv ?? 0)) {
      return res.status(401).json({ error: '密码已变更，请重新登录' });
    }

    req.user = { id: payload.id, username: payload.username, tokenVersion: payload.tv };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * 可选认证中间件
 * 如果提供了有效 token 则挂载 req.user，否则继续（不拒绝）
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(header.slice(7), JWT_SECRET);
      req.user = { id: payload.id, username: payload.username };
    } catch (_) { /* ignore */ }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };