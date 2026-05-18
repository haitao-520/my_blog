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
echo "请选择你的 CPU 架构："
echo ""
echo "  1) AMD64 / x86_64（云服务器、普通电脑）"
echo "  2) ARM64（树莓派、安卓手机 Termux / Proot Ubuntu）"
echo ""
read -p "请输入序号 [1-2]（默认1）: " ARCH_CHOICE
ARCH_CHOICE=${ARCH_CHOICE:-1}
echo ""

case "$ARCH_CHOICE" in
  1)
    echo "  💻 已选择：AMD64 / x86_64"
    ARCH="x86_64"
    ;;
  2)
    echo "  📱 已选择：ARM64"
    ARCH="arm64"
    ;;
  *)
    echo "  ⚠️  无效输入，默认 AMD64"
    ARCH="x86_64"
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

if [ "$ARCH" = "arm64" ]; then
  # ========= ARM64：手动下载正确引擎，不依赖 Prisma 自动检测 =========
  echo "  🔧 ARM64：下载正确的 Prisma 引擎..."

  # 如果上次失败残留了修改，先恢复
  if grep -q 'binaryTargets' prisma/schema.prisma 2>/dev/null; then
    echo "  ⚠️  检测到残留 binaryTargets，先恢复原始 schema..."
    sed -i '/binaryTargets/d' prisma/schema.prisma
  fi

  # 备份原始 schema
  cp prisma/schema.prisma prisma/schema.prisma.bak
  trap 'mv prisma/schema.prisma.bak prisma/schema.prisma 2>/dev/null; echo "  ✅ schema.prisma 已恢复"' EXIT

  # 临时注入 binaryTargets 给 Prisma Client 用
  sed -i '/^generator client {/a\  binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]' prisma/schema.prisma

  # 生成 Prisma Client
  npx prisma generate

  # 获取当前 Prisma 版本的 commit hash
  PRISMA_VERSION=$(npx prisma --version 2>/dev/null | grep -oP 'Commit:\s*\K\S+' | head -1)
  if [ -z "$PRISMA_VERSION" ]; then
    PRISMA_VERSION=$(cat node_modules/prisma/package.json 2>/dev/null | grep -oP '"prisma":\s*"\^?\K[^"]+' | head -1)
    PRISMA_VERSION=$(npm show prisma@$PRISMA_VERSION version 2>/dev/null | tail -1)
    PRISMA_COMMIT=$(npm show prisma@$PRISMA_VERSION gitHead 2>/dev/null | head -c 40)
  else
    PRISMA_COMMIT="$PRISMA_VERSION"
  fi

  echo "  📦 Prisma 版本: $(npx prisma --version 2>/dev/null | head -1)"
  echo "  📦 Commit: $PRISMA_COMMIT"

  ENGINE_URL="https://binaries.prisma.sh/all_commits/${PRISMA_COMMIT}/linux-arm64-openssl-3.0.x/schema-engine.gz"
  echo "  ⬇️  下载: $ENGINE_URL"

  mkdir -p node_modules/@prisma/engines
  curl -fsSL "$ENGINE_URL" -o node_modules/@prisma/engines/schema-engine.gz 2>&1 || {
    echo "  ❌ 下载失败，尝试备选方案..."
    # 备选：用 npm 重新安装 prisma 以触发引擎下载
    npm install @prisma/engines@${PRISMA_COMMIT} --save-dev 2>/dev/null || true
  }

  if [ -f node_modules/@prisma/engines/schema-engine.gz ]; then
    gunzip -f node_modules/@prisma/engines/schema-engine.gz
    chmod +x node_modules/@prisma/engines/schema-engine
    export PRISMA_SCHEMA_ENGINE_BINARY="$(pwd)/node_modules/@prisma/engines/schema-engine"
    echo "  ✅ 引擎已就绪"
  fi

  chmod +x node_modules/@prisma/engines/* 2>/dev/null || true

  npx prisma db push
  npx prisma db seed

else
  # ========= AMD64 / x86_64：标准流程 =========
  npx prisma generate
  npx prisma db push
  npx prisma db seed
fi

# ==================== 启动服务 ====================
echo ""
echo "▶ 初始化完成，启动服务..."
cd "$PROJECT_DIR"
bash "$PROJECT_DIR/start.sh"
