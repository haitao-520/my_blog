#!/bin/bash
# ============================================
# 。。。 —— 一键安装依赖脚本
# 用法: bash install.sh
# ============================================
set -e

echo "=========================================="
echo "  。。。 — 依赖安装"
echo "=========================================="
echo ""

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

# ==================== 安装依赖 ====================
echo "▶ [1/3] 安装后端依赖 (server)..."
cd "$PROJECT_DIR/server"
npm install

echo ""
echo "▶ [2/3] 安装管理后台依赖 (admin-react)..."
cd "$PROJECT_DIR/admin-react"
npm install

echo ""
echo "▶ [3/3] 安装前端依赖 (frontend-astro)..."
cd "$PROJECT_DIR/frontend-astro"
npm install

# ==================== 初始化数据库 ====================
echo ""
echo "▶ 初始化数据库..."
cd "$PROJECT_DIR/server"

npx prisma generate
npx prisma db push
npx prisma db seed

# ==================== 启动服务 ====================
echo ""
echo "▶ 初始化完成，启动服务..."
cd "$PROJECT_DIR"
bash "$PROJECT_DIR/start.sh"