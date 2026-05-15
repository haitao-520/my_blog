#!/bin/bash
# ============================================
# 。。。 —— 数据库初始化/重置
# 用法: bash db-init.sh [--seed]
#
# 不带参数: 仅生成 Prisma Client + 建表
# --seed : 额外写入种子数据（测试用）
# ============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR/server"

echo "=========================================="
echo "  数据库初始化"
echo "=========================================="

echo ""
echo "▶ 生成 Prisma Client..."
npx prisma generate

echo ""
echo "▶ 同步数据库表结构..."
npx prisma db push

if [ "$1" = "--seed" ]; then
  echo ""
  echo "▶ 写入种子数据..."
  npx prisma db seed
  echo ""
  echo "  初始账号: admin / admin123"
fi

echo ""
echo "=========================================="
echo "  ✅ 数据库初始化完成"
echo "=========================================="