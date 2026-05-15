const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Admin 用户
  const existing = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!existing) {
    const hashed = await bcrypt.hash('admin123', 10);
    await prisma.user.create({ data: { username: 'admin', password: hashed } });
    console.log('✅ Admin user created: admin / admin123');
  } else {
    console.log('⚠️  Admin user already exists, skipping.');
  }

  // 默认站点设置
  const defaults = {
    siteTitle: '水镜雪的博客',
    siteDesc: '记录技术与生活，思考与创造。',
  };
  for (const [key, value] of Object.entries(defaults)) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
  console.log('✅ Default settings written');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());