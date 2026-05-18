#!/bin/bash
# 守护进程：每5分钟检查一次，挂了就自动拉起来
# 启动: nohup bash /home/blog/keepalive.sh daemon &

if [ "$1" = "daemon" ]; then
  while true; do
    sleep 300
    ALL_OK=true
    curl -s -o /dev/null --connect-timeout 3 http://localhost:3000/api/health || ALL_OK=false
    curl -s -o /dev/null --connect-timeout 3 http://localhost:4321 || ALL_OK=false
    curl -s -o /dev/null --connect-timeout 3 http://localhost:5173 || ALL_OK=false
    if ! $ALL_OK; then
      echo "[$(date '+%m-%d %H:%M')] 服务中断，自动重启..."
      bash /home/blog/start.sh
    fi
  done
else
  # 单次检查模式
  NEED_RESTART=false
  curl -s -o /dev/null --connect-timeout 3 http://localhost:3000/api/health || NEED_RESTART=true
  curl -s -o /dev/null --connect-timeout 3 http://localhost:4321 || NEED_RESTART=true
  curl -s -o /dev/null --connect-timeout 3 http://localhost:5173 || NEED_RESTART=true
  if $NEED_RESTART; then
    echo "[$(date '+%H:%M:%S')] 检测到服务中断，自动重启..."
    bash /home/blog/start.sh
  fi
fi