#!/bin/bash
# 椰树参观预约系统 - 构建产物回滚脚本
# 用法: bash rollback.sh [快照文件名]
#   不带参数 = 回滚到「上一次部署前」的那份构建产物（deploy.sh 每次部署前自动存档）
#   带参数   = 回滚到指定快照（bash rollback.sh ~/deploy-backups/dist-xxxx-20261006-170101.tar.gz）
#
# 注意：本脚本只还原 backend/dist + admin-panel/dist 构建产物，不移动 git 代码。
#       如需连代码一起退回，另跑: git reset --hard deploy-<sha>-<日期>

set -e

PROJECT_DIR="/home/ubuntu/yeshu"
BACKUP_DIR="$HOME/deploy-backups"

cd "$PROJECT_DIR"

if [ -n "$1" ]; then
  SNAP="$1"
else
  SNAP=$(cat "$BACKUP_DIR/rollback-target.txt" 2>/dev/null || true)
fi

if [ -z "$SNAP" ] || [ ! -f "$SNAP" ]; then
  echo "❌ 找不到可回滚的快照: '${SNAP:-<空>}'"
  echo "   可用快照:"
  ls -1t "$BACKUP_DIR"/dist-*.tar.gz 2>/dev/null | head -10 || echo "   （无）"
  exit 1
fi

echo "=== 回滚 ==="
echo "  目标快照: $(basename "$SNAP")"
echo "  当前代码: $(git rev-parse --short HEAD)"
tar xzf "$SNAP" -C "$PROJECT_DIR"
echo "  ✅ 构建产物已还原"

cd "$PROJECT_DIR/backend"
pm2 startOrReload ecosystem.config.js
sudo nginx -t && sudo systemctl reload nginx
echo "  ✅ PM2 / Nginx 已重载"
echo "=========== 回滚完成 ==========="
