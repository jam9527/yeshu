/**
 * 开发环境配置
 *
 * - localhost: 微信开发者工具内使用
 * - LAN IP:   手机预览时使用（需在微信开发者工具勾选"不校验合法域名"）
 */
const DEV = {
  // 你的电脑局域网 IP，手机预览时使用
  LAN_IP: '192.168.1.33',
  PORT: '3000',
}

/** 使用 SSH 隧道公网地址（手机预览用，不走防火墙） */
const TUNNEL_URL = 'https://ee75006cdd3d48.lhr.life/api'

/**
 * 当前始终连接生产服务器，方便本地开发调试
 * 如需切回本地后端，改为 DEV_URL 即可
 */
export const API_BASE_URL = 'https://yuyue.yeshu.com/api'
