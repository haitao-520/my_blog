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

# ==================== 系统选择 ====================
echo "请选择你的运行环境："
echo ""
echo "  1) x86_64 云服务器（腾讯云/阿里云等）"
echo "  2) ARM64 真 Linux（树莓派/ARM云服务器）"
echo "  3) ARM64 Termux + Proot Ubuntu（安卓手机）"
echo ""
read -p "请输入序号 [1-3]（默认1）: " SYS_CHOICE
SYS_CHOICE=${SYS_CHOICE:-1}
echo ""

case "$SYS_CHOICE" in
  1)
    echo "  💻 已选择：x86_64 云服务器"
    ARCH_TYPE="x86_64"
    ;;
  2)
    echo "  📱 已选择：ARM64 真 Linux"
    ARCH_TYPE="arm64"
    ;;
  3)
    echo "  📱 已选择：ARM64 Proot Ubuntu"
    ARCH_TYPE="arm64_proot"
    ;;
  *)
    echo "  ⚠️  无效输入，默认使用 x86_64"
    ARCH_TYPE="x86_64"
    ;;
esac
echo ""

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

if [ "$ARCH_TYPE" = "arm64_proot" ]; then
  # Proot Ubuntu: Prisma 检测 OS 为 "android"，引擎文件名会错乱。
  # 解决办法：临时注入 binaryTargets 到 schema.prisma，强制生成正确引擎。
  echo "  🔧 Proot Ubuntu 模式：注入 binaryTargets..."

  # 备份原始 schema
  cp prisma/schema.prisma prisma/schema.prisma.bak

  # 在 generator 块中注入 binaryTargets
  sed -i '/^generator client {/a\  binaryTargets = ["linux-arm64-openssl-3.0.x"]' prisma/schema.prisma

  npx prisma generate
  chmod +x node_modules/@prisma/engines/* 2>/dev/null || true
  npx prisma db push
  npx prisma db seed

  # 恢复原始 schema
  mv prisma/schema.prisma.bak prisma/schema.prisma

elif [ "$ARCH_TYPE" = "arm64" ]; then
  export PRISMA_CLI_BINARY_TARGETS="linux-arm64-openssl-3.0.x"

  npx prisma generate
  chmod +x node_modules/@prisma/engines/* 2>/dev/null || true
  npx prisma db push
  npx prisma db seed

else
  # x86_64 云服务器，直接走标准流程
  npx prisma generate
  npx prisma db push
  npx prisma db seed
fi

# ==================== 启动服务 ====================
echo ""
echo "▶ 初始化完成，启动服务..."
cd "$PROJECT_DIR"
bash "$PROJECT_DIR/start.sh"