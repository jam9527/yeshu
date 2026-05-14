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

/** API_BASE_URL 决定前端连接哪个后端 */
// 开发者工具用 localhost，手机预览/扫码测试用 LAN_IP 或 TUNNEL_URL
export const API_BASE_URL = `http://${DEV.LAN_IP}:${DEV.PORT}/api`
