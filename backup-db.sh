#!/bin/bash
# 椰树参观预约系统 - 数据库每日备份
# 由服务器 crontab 每日调用（23 3 * * *）
# 本地产物: /home/ubuntu/db-backups/<库名>-<时间戳>.sql.gz（保留 14 天）
# 异地产物: COS db-backups/<库名>/<同名>（private，保留 45 天）
#           上传失败会让本脚本以非 0 退出，便于从日志里发现异地链路断了

set -e

BACKEND_DIR="/home/ubuntu/yeshu/backend"
BACKUP_DIR="/home/ubuntu/db-backups"
KEEP_DAYS=14

# 从 .env 取连接信息（不 source，避免值里含特殊字符时炸掉）
get() { grep -E "^$1=" "$BACKEND_DIR/.env" | head -1 | cut -d'=' -f2- | tr -d '"'; }
DB_HOST=$(get DB_HOST); DB_PORT=$(get DB_PORT)
DB_USERNAME=$(get DB_USERNAME); DB_PASSWORD=$(get DB_PASSWORD)
DB_DATABASE=$(get DB_DATABASE)

[ -n "$DB_DATABASE" ] || { echo "❌ .env 缺少 DB_DATABASE"; exit 1; }

mkdir -p "$BACKUP_DIR"
OUT="$BACKUP_DIR/${DB_DATABASE}-$(date +%Y%m%d-%H%M%S).sql.gz"

# MYSQL_PWD 传密码：不出现在进程列表里，也不触发命令行密码告警
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USERNAME" \
  --single-transaction --routines --triggers --events \
  --default-character-set=utf8mb4 \
  "$DB_DATABASE" | gzip > "$OUT"

if [ ! -s "$OUT" ]; then
  echo "❌ 备份文件为空，已删除: $OUT"
  rm -f "$OUT"
  exit 1
fi

# 清理超期备份
find "$BACKUP_DIR" -name '*.sql.gz' -type f -mtime +$KEEP_DAYS -delete

echo "$(date '+%F %T') 本地备份完成: $(basename "$OUT") ($(du -h "$OUT" | cut -f1))"

# 异地上传（COS）：本机磁盘故障/误删时的兜底
COS_KEY="db-backups/${DB_DATABASE}/$(basename "$OUT")"
if node "$BACKEND_DIR/scripts/cos-backup-upload.js" "$OUT" "$COS_KEY"; then
  echo "$(date '+%F %T') 异地备份完成"
else
  echo "$(date '+%F %T') ❌ 异地备份失败（本地备份完好，见上一行）"
  exit 1
fi
