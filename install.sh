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

# ARM64 手机环境：修复 Prisma 引擎二进制
if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ] || [ "$ARCH" = "armv8l" ]; then
  chmod +x node_modules/@prisma/engines/* 2>/dev/null || true

  # Proot Ubuntu 里 Prisma 可能检测 OS 为 "android"，
  # 生成错误的 debian-openssl-1.1.x 文件名。手动修正。
  ENGINE_DIR="node_modules/@prisma/engines"
  CORRECT_ENGINE="$ENGINE_DIR/schema-engine-linux-arm64-openssl-3.0.x"

  if [ ! -f "$CORRECT_ENGINE" ]; then
    echo "  ⚠️  引擎文件不匹配，自动修复..."
    # 如果存在其他 schema-engine 文件，复制为正确的文件名
    WRONG_ENGINE=$(ls $ENGINE_DIR/schema-engine-* 2>/dev/null | head -1)
    if [ -n "$WRONG_ENGINE" ] && [ "$WRONG_ENGINE" != "$CORRECT_ENGINE" ]; then
      cp "$WRONG_ENGINE" "$CORRECT_ENGINE"
      chmod +x "$CORRECT_ENGINE"
      echo "  ✅ 已复制 $WRONG_ENGINE → $CORRECT_ENGINE"
    fi
  fi

  # 确保 libquery_engine 也有正确版本
  CORRECT_LIB="$ENGINE_DIR/libquery_engine-linux-arm64-openssl-3.0.x.so.node"
  if [ ! -f "$CORRECT_LIB" ]; then
    WRONG_LIB=$(ls $ENGINE_DIR/libquery_engine-*.so.node 2>/dev/null | head -1)
    if [ -n "$WRONG_LIB" ] && [ "$WRONG_LIB" != "$CORRECT_LIB" ]; then
      cp "$WRONG_LIB" "$CORRECT_LIB"
      chmod +x "$CORRECT_LIB"
      echo "  ✅ 已复制 $WRONG_LIB → $CORRECT_LIB"
    fi
  fi
fi
npx prisma db push
npx prisma db seed

# ---------- 启动服务 ----------
echo ""
echo "▶ 初始化完成，启动服务..."
cd "$PROJECT_DIR"
bash "$PROJECT_DIR/start.sh"