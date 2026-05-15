#!/bin/bash
# ============================================
# 。。。 —— 生产环境一键部署
# 用法: 上传 blog-deploy.tar.gz 后执行
#   cd /root
#   tar -xzf blog-deploy.tar.gz
#   cd blog && bash deploy.sh
# ============================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  。。。 — 生产部署"
echo "=========================================="
echo ""
echo "项目路径: $PROJECT_DIR"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ---------- 安装 + 启动（install.sh 已包含自动启动）----------
bash "$PROJECT_DIR/install.sh"

echo ""
echo "=========================================="
echo "  🎉 部署完成！"
echo "=========================================="
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
[ -z "$SERVER_IP" ] && SERVER_IP=$(ip addr show 2>/dev/null | grep 'inet ' | grep -v '127.0.0.1' | head -1 | awk '{print $2}' | cut -d/ -f1)
echo "  前端: http://${SERVER_IP:-你的服务器IP}:4321"
echo "  后台: http://${SERVER_IP:-你的服务器IP}:5173"
echo "  账号: admin / admin123"
echo "=========================================="