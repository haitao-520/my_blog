const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'blog-mizukiyuki-default-change-me';
const JWT_EXPIRES_IN = '7d';

// 验证码存储（内存，重启清空）
const captchaStore = new Map();
const CAPTCHA_TTL = 30 * 1000; // 30 秒

// 定时清理过期验证码
setInterval(() => {
  const now = Date.now();
  for (const [token, { expires }] of captchaStore) {
    if (now > expires) captchaStore.delete(token);
  }
}, 60 * 1000);

const svgCaptcha = require('svg-captcha');

// GET /api/auth/captcha
function getCaptcha(req, res) {
  const captcha = svgCaptcha.create({
    size: 4,
    noise: 3,
    color: true,
    background: '#f4f4f4',
  });
  const token = crypto.randomUUID();
  captchaStore.set(token, { answer: captcha.text.toLowerCase(), expires: Date.now() + CAPTCHA_TTL });
  res.json({ token, svg: captcha.data });
}

// POST /api/auth/login
async function login(req, res) {
  try {
    const { username, password, captchaToken, captchaAnswer } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 验证码校验
    if (!captchaToken || !captchaAnswer) {
      return res.status(400).json({ error: '请输入验证码' });
    }
    const captcha = captchaStore.get(captchaToken);
    if (!captcha || Date.now() > captcha.expires) {
      captchaStore.delete(captchaToken);
      return res.status(400).json({ error: '验证码已过期，请刷新' });
    }
    if (captcha.answer !== String(captchaAnswer).trim().toLowerCase()) {
      return res.status(400).json({ error: '验证码错误' });
    }
    captchaStore.delete(captchaToken); // 一次使用

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, tv: user.tokenVersion },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    console.error('[auth:login]', err);
    res.status(500).json({ error: '登录失败，请稍后重试' });
  }
}



module.exports = { login, changePassword, getCaptcha };

// PUT /api/auth/password
async function changePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码至少6位' });
    }

    const user = await prisma.user.findFirst({ where: { OR: [{ id: req.user.id }, { username: req.user.username }] } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ error: '旧密码不正确' });

    const samePassword = await bcrypt.compare(newPassword, user.password);
    const hashed = samePassword ? user.password : await bcrypt.hash(newPassword, 10);
    const updateData = { password: hashed };
    if (!samePassword) updateData.tokenVersion = user.tokenVersion + 1;

    await prisma.user.update({ where: { id: user.id }, data: updateData });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth:changePassword]', err);
    res.status(500).json({ error: '修改密码失败' });
  }
}