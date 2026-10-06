#!/usr/bin/env node
/**
 * 数据库备份异地上传（COS）
 * 用法: node cos-backup-upload.js <本地文件路径> <对象Key>
 *
 * 凭据/桶/地域从 backend/.env 读取（TENCENT_SECRET_ID/KEY、COS_BUCKET、TENCENT_REGION）。
 *
 * ⚠️ 备份对象一律 ACL=private —— 库里有身份证号、手机号等个人信息，
 *    绝不能沿用 file/cos.service.ts 里海报上传用的 public-read。
 *
 * 上传后做一次远端保留期清理（默认 45 天）。无列举/删除权限时只告警，不影响本地备份。
 */
const fs = require('fs');
const path = require('path');
const COS = require('cos-nodejs-sdk-v5');

const RETENTION_DAYS = 45;

const ENV_PATH = path.join(__dirname, '..', '.env');
const env = {};
for (const line of fs.readFileSync(ENV_PATH, 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim().replace(/^"(.*)"$/, '$1');
}

const [, , filePath, key] = process.argv;
if (!filePath || !key) {
  console.error('用法: node cos-backup-upload.js <本地文件路径> <对象Key>');
  process.exit(1);
}
if (!env.COS_BUCKET || !env.TENCENT_SECRET_ID || !env.TENCENT_SECRET_KEY) {
  console.error('❌ .env 缺少 COS_BUCKET / TENCENT_SECRET_ID / TENCENT_SECRET_KEY');
  process.exit(1);
}

const Bucket = env.COS_BUCKET;
const Region = env.TENCENT_REGION || 'ap-guangzhou';
const prefix = key.split('/').slice(0, -1).join('/') + '/';
const cos = new COS({ SecretId: env.TENCENT_SECRET_ID, SecretKey: env.TENCENT_SECRET_KEY });

cos.putObject(
  { Bucket, Region, Key: key, Body: fs.readFileSync(filePath), ACL: 'private' },
  (err) => {
    if (err) {
      console.error(`❌ COS 上传失败: ${err.message}`);
      process.exit(1);
    }
    const mb = (fs.statSync(filePath).size / 1048576).toFixed(1);
    console.log(`  已上传 COS: ${Bucket}/${key} (${mb}MB, private)`);

    const cutoff = Date.now() - RETENTION_DAYS * 86400000;
    cos.getBucket({ Bucket, Region, Prefix: prefix, MaxKeys: 1000 }, (e1, data) => {
      if (e1) {
        console.log(`  ⚠️ 跳过 COS 保留期清理（无列举权限或网络问题）: ${e1.message}`);
        return;
      }
      const stale = (data.Contents || []).filter((o) => new Date(o.LastModified).getTime() < cutoff);
      if (!stale.length) return;
      cos.deleteMultipleObject(
        { Bucket, Region, Objects: stale.map((o) => ({ Key: o.Key })) },
        (e2) => {
          if (e2) console.log(`  ⚠️ COS 保留期清理失败: ${e2.message}`);
          else console.log(`  已清理 COS 上 ${stale.length} 个超过 ${RETENTION_DAYS} 天的旧备份`);
        },
      );
    });
  },
);
