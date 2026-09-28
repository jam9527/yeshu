/**
 * 极简 ZIP 打包器（仅支持 deflate、无目录项、无注释、无加密）
 *
 * 手写而没引第三方库的原因：npm 侧装不上（package-lock.json 里的 tarball 指向
 * 腾讯云内网镜像 mirrors.tencentyun.com，非腾讯云机器解析不了），而绕过锁文件安装
 * 会让 package.json 与锁文件不一致，服务器上 npm ci 会失败。
 * 这里只覆盖「若干个文件 → 一个 zip」这一种用法，ZIP 的这部分格式是稳定的。
 */
import { deflateRawSync } from 'zlib';

export interface ZipEntry {
  /** 包内文件名。必须为 ASCII：非 ASCII 条目名需要置 UTF-8 标志位，缺失时 Windows 解压会乱码 */
  name: string;
  buffer: Buffer;
}

/** CRC32 查表（多项式 0xEDB88320） */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

/** Date → MS-DOS 日期/时间格式（ZIP 只支持 1980-2107 年） */
function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export function createZipBuffer(entries: ZipEntry[]): Buffer {
  const { time, date } = dosDateTime(new Date());

  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'ascii');
    const compressed = deflateRawSync(entry.buffer);
    const crc = crc32(entry.buffer);

    // 本地文件头（30 字节 + 文件名）
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // 签名
    local.writeUInt16LE(20, 4); // 解压所需版本 2.0
    local.writeUInt16LE(0, 6); // 标志位：文件名为 ASCII，不需要 UTF-8 标志
    local.writeUInt16LE(8, 8); // 压缩方式 deflate
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(entry.buffer.length, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // 扩展字段长度
    localParts.push(local, nameBuf, compressed);

    // 中央目录项（46 字节 + 文件名）
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // 签名
    central.writeUInt16LE(20, 4); // 产生者版本（高字节 0 = MS-DOS）
    central.writeUInt16LE(20, 6); // 解压所需版本
    central.writeUInt16LE(0, 8); // 标志位
    central.writeUInt16LE(8, 10); // 压缩方式
    central.writeUInt16LE(time, 12);
    central.writeUInt16LE(date, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(entry.buffer.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // 扩展字段长度
    central.writeUInt16LE(0, 32); // 注释长度
    central.writeUInt16LE(0, 34); // 起始磁盘号
    central.writeUInt16LE(0, 36); // 内部属性
    central.writeUInt32LE(0, 38); // 外部属性
    central.writeUInt32LE(offset, 42); // 本地文件头偏移
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + compressed.length;
  }

  const centralBuf = Buffer.concat(centralParts);

  // 中央目录结束记录（22 字节）
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // 签名
  eocd.writeUInt16LE(0, 4); // 当前磁盘号
  eocd.writeUInt16LE(0, 6); // 中央目录起始磁盘号
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16); // 中央目录偏移
  eocd.writeUInt16LE(0, 20); // 注释长度

  return Buffer.concat([...localParts, centralBuf, eocd]);
}
