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
const DEV_URL = `http://${DEV.LAN_IP}:${DEV.PORT}/api`

/** 生产环境 API 地址（微信小程序正式版/体验版使用） */
const PROD_URL = 'https://yuyue.yeshu.com/api'

/**
 * 自动选择 API 地址
 * - 微信开发者工具: 使用本地地址
 * - 体验版/正式版: 使用生产域名
 *
 * 如需手动切换，可在此处直接导出 DEV_URL 或 PROD_URL
 */
export const API_BASE_URL = (() => {
  try {
    const env = wx.getAccountInfoSync().miniProgram.envVersion
    if (env === 'release' || env === 'trial') return PROD_URL
    // develop → use dev URL
    return DEV_URL
  } catch {}
  // wx.getAccountInfoSync 失败时（极少发生），真机上用生产域名兜底
  try {
    const sys = wx.getSystemInfoSync()
    if (sys.platform === 'devtools') return DEV_URL
  } catch {}
  return PROD_URL
})()
