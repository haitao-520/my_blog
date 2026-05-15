const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/settings — 返回所有设置（key-value 对象）
exports.getAll = async (req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/settings/rename — 一键替换项目中所有"水镜雪"为新名称
exports.rename = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: '名称不能为空' });
    }
    const newName = name.trim();

    // 读取当前作者名（不再硬编码）
    const authorRow = await prisma.setting.findUnique({ where: { key: 'authorName' } });
    const oldAuthorName = authorRow?.value || '水镜雪';

    const { execSync } = require('child_process');
    const path = require('path');
    const ROOT = path.resolve(__dirname, '../../..');
    const files = [
      'start.sh',
      'install.sh',
      'db-init.sh',
      'deploy.sh',
      'README.md',
      'frontend-astro/src/layouts/Layout.astro',
      'frontend-astro/src/pages/about.astro',
      'frontend-astro/src/pages/posts/[slug].astro',
    ];

    // safe shell quoting
    const sq = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'";

    let replaced = 0;
    for (const f of files) {
      const full = path.join(ROOT, f);
      try {
        const cnt = execSync(`grep -c ${sq(oldAuthorName)} ${sq(full)} 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim();
        if (parseInt(cnt) > 0) {
          execSync(`sed -i 's/${oldAuthorName.replace(/\//g, '\\/')}/${newName.replace(/\//g, '\\/')}/g' ${sq(full)}`);
          replaced += parseInt(cnt);
        }
      } catch (_) { /* skip missing files */ }
    }

    // 更新 authorName 到数据库
    await prisma.setting.upsert({
      where: { key: 'authorName' },
      update: { value: newName },
      create: { key: 'authorName', value: newName },
    });

    res.json({ ok: true, replaced, oldName: oldAuthorName, newName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.update = async (req, res) => {
  try {
    const data = req.body;
    for (const [key, value] of Object.entries(data)) {
      await prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }
    // 返回更新后的所有设置
    const rows = await prisma.setting.findMany();
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};