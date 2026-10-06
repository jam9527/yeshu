#!/bin/bash
# 椰树参观预约系统 - 一键部署脚本
# 用法: ssh ubuntu@1.12.49.190 'bash -s' < deploy.sh
# 或上传到服务器后直接执行 ./deploy.sh
#
# 前置条件:
#   1. git 已配置可拉取远程仓库
#   2. PM2 已配置（yeshu-api，cluster 模式）
#   3. Nginx 已配置

set -e

PROJECT_DIR="/home/ubuntu/yeshu"
BACKEND_DIR="$PROJECT_DIR/backend"
ADMIN_DIR="$PROJECT_DIR/admin-panel"

# 部署前快照：把当前正在运行的构建产物存档，供 rollback.sh 秒级回滚
BACKUP_DIR="$HOME/deploy-backups"
echo "=== 0. 部署前快照 ==="
cd "$PROJECT_DIR"
PREV_SHA=$(git rev-parse --short HEAD)
mkdir -p "$BACKUP_DIR"
SNAP_PATHS=""
if [ -d backend/dist ]; then SNAP_PATHS="backend/dist"; fi
if [ -d admin-panel/dist ]; then SNAP_PATHS="$SNAP_PATHS admin-panel/dist"; fi
if [ -n "$SNAP_PATHS" ]; then
  SNAP="$BACKUP_DIR/dist-${PREV_SHA}-$(date +%Y%m%d-%H%M%S).tar.gz"
  tar czf "$SNAP" $SNAP_PATHS
  echo "$SNAP" > "$BACKUP_DIR/rollback-target.txt"
  git tag -f "deploy-${PREV_SHA}-$(date +%Y%m%d)" >/dev/null 2>&1 || true
  ls -1t "$BACKUP_DIR"/dist-*.tar.gz 2>/dev/null | tail -n +11 | xargs -r rm -f  # 只留最近 10 份
  echo "  快照: $(basename "$SNAP")   (回滚: bash rollback.sh)"
else
  echo "  无可快照的构建产物（首次部署），跳过"
fi

echo "=== 1. 拉取最新代码 ==="
cd "$PROJECT_DIR"
git pull origin master

# 环境变量校验，防止配置缺失导致 PM2 重启风暴
echo "=== 1.5 环境变量校验 ==="
REQUIRED_VARS=(
  "DB_HOST" "DB_PORT" "DB_USERNAME" "DB_PASSWORD" "DB_DATABASE"
  "REDIS_HOST" "REDIS_PORT" "REDIS_PASSWORD"
  "JWT_SECRET"
  "WECHAT_APPID" "WECHAT_SECRET"
  "COS_BUCKET" "TENCENT_REGION"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  value=$(grep -E "^${var}=" "$BACKEND_DIR/.env" 2>/dev/null | cut -d'=' -f2-)
  if [ -z "$value" ] || [ "$value" = '""' ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "  ❌ 以下 .env 变量缺失或为空，请先配置:"
  for var in "${MISSING_VARS[@]}"; do
    echo "     - $var"
  done
  echo "  部署已中止"
  exit 1
fi
echo "  ✅ 所有必要环境变量已配置"

# 检测哪些模块有变更
BACKEND_CHANGED=false
ADMIN_CHANGED=false

if git diff HEAD@{1} --name-only | grep -q "^backend/"; then
  BACKEND_CHANGED=true
fi
if git diff HEAD@{1} --name-only | grep -q "^admin-panel/"; then
  ADMIN_CHANGED=true
fi

echo "=== 2. 更新后端 ==="
if [ "$BACKEND_CHANGED" = true ]; then
  echo "  检测到后端变更，重新构建..."
  cd "$BACKEND_DIR"
  npm install                    # 需要 devDependencies（@nestjs/cli）才能 build
  npm run build
  # 清除海报缓存（部署后强制重新生成，旧版 key 结构不兼容）
  rm -f /home/ubuntu/yeshu/backend/uploads/posters/*.png
  pm2 startOrReload ecosystem.config.js
  echo "  ✅ 后端更新完成（cluster 零停机重载）"
else
  echo "  后端无变更，跳过"
fi

echo "=== 3. 更新管理后台 ==="
if [ "$ADMIN_CHANGED" = true ]; then
  echo "  检测到管理后台变更，重新构建..."
  cd "$ADMIN_DIR"
  npm install --legacy-peer-deps
  npm run build
else
  echo "  管理后台无变更，跳过"
fi

echo "=== 4. 重启 Nginx ==="
sudo nginx -t && sudo systemctl reload nginx
echo "  ✅ Nginx 已重载"

# 给本次上线的 commit 打 tag，便于事后定位版本 / git reset 回退
cd "$PROJECT_DIR"
NEW_SHA=$(git rev-parse --short HEAD)
git tag -f "deploy-${NEW_SHA}-$(date +%Y%m%d)" >/dev/null 2>&1 || true
echo "  ✅ 已打 tag: deploy-${NEW_SHA}-$(date +%Y%m%d)"

echo ""
echo "=========== 部署完成 ==========="
echo "后端:  http://localhost:3000  (PM2: yeshu-api)"
echo "后台:  https://yuyue.yeshu.com"
echo "================================"
