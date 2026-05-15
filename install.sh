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

# ---------- 后端 ----------
echo "▶ [1/3] 安装后端依赖 (server)..."
cd "$PROJECT_DIR/server"
npm install

# ---------- 管理后台 ----------
echo ""
echo "▶ [2/3] 安装管理后台依赖 (admin-react)..."
cd "$PROJECT_DIR/admin-react"
npm install

# ---------- 前端 ----------
echo ""
echo "▶ [3/3] 安装前端依赖 (frontend-astro)..."
cd "$PROJECT_DIR/frontend-astro"
npm install

# ---------- 初始化数据库 ----------
echo ""
echo "▶ 初始化数据库..."
cd "$PROJECT_DIR/server"

# 自动识别 CPU 架构，手机 ARM64 需要指定引擎
ARCH=$(uname -m)
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ] || [ "$ARCH" = "armv8l" ]; then
  export PRISMA_CLI_BINARY_TARGETS="linux-arm64-openssl-3.0.x"
  echo "  📱 检测到 ARM64 架构，已适配手机环境"
else
  echo "  💻 检测到 x86_64 架构"
fi

npx prisma generate
# ARM64 手机环境：修复 Prisma 引擎二进制无执行权限
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ] || [ "$ARCH" = "armv8l" ]; then
  chmod +x node_modules/@prisma/engines/* 2>/dev/null || true
fi
npx prisma db push
npx prisma db seed

# ---------- 启动服务 ----------
echo ""
echo "▶ 初始化完成，启动服务..."
cd "$PROJECT_DIR"
bash "$PROJECT_DIR/start.sh"