#!/bin/bash
# ============================================
# 。。。 —— 一键启动三端服务
# 用法: bash start.sh
# ============================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================="
echo "  。。。 — 启动服务"
echo "=========================================="

# 清理旧进程
fuser -k 3000/tcp 2>/dev/null
fuser -k 4321/tcp 2>/dev/null
fuser -k 5173/tcp 2>/dev/null
sleep 1

# 后端
echo "▶ 启动后端 API (端口 3000)..."
cd "$PROJECT_DIR/server"
nohup node src/index.js > /tmp/blog-server.log 2>&1 &

# Astro 前端（--host 允许外网访问）
echo "▶ 启动 Astro 前端 (端口 4321)..."
cd "$PROJECT_DIR/frontend-astro"
nohup npx astro dev --port 4321 --host > /tmp/blog-astro.log 2>&1 &

# React 后台（--host 允许外网访问）
echo "▶ 启动 React 后台 (端口 5173)..."
cd "$PROJECT_DIR/admin-react"
nohup npx vite --port 5173 --host > /tmp/blog-admin.log 2>&1 &

sleep 2

# 验证（带重试）
echo ""
echo "▶ 验证服务状态..."
echo ""

check() {
  local url="$1"
  local name="$2"
  local code=""
  for i in $(seq 1 8); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null)
    [ "$code" = "200" ] && break
    sleep 1
  done
  if [ "$code" = "200" ]; then
    echo "  ✅ $name ($url) — $code"
  else
    echo "  ❌ $name ($url) — $code"
  fi
}

check "http://localhost:3000/api/health" "后端 API"
check "http://localhost:4321"           "Astro 前端"
check "http://localhost:5173"           "React 后台"

echo ""
echo "=========================================="
echo "  启动完成！"
echo "=========================================="
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP=$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
echo ""
echo "  前台: http://${SERVER_IP:-你的服务器IP}:4321"
echo "  后台: http://${SERVER_IP:-你的服务器IP}:5173"
echo ""
echo "  后台账号: admin / admin123"
echo "=========================================="