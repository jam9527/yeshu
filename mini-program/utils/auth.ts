/**
 * 微信登录认证工具
 * 封装 wx.login -> code -> 后端换取 JWT 的完整流程
 */
import api from './api'

const app = getApp()

/**
 * 执行微信登录
 * 1. 调用 wx.login() 获取临时 code
 * 2. 调用后端 /api/wechat/login 换取 JWT
 * 3. 保存 token 到全局和本地存储
 */
export async function wechatLogin(): Promise<void> {
  const { code } = await wx.login()
  if (!code) {
    wx.showToast({ title: '登录失败', icon: 'none' })
    return
  }

  const res: any = await api.post('/wechat/login', { code })

  if (res.token) {
    app.setToken(res.token)
    app.globalData.userInfo = res.user
  }
}

/**
 * 检查登录态，未登录则跳转登录页
 */
export function checkLogin(): boolean {
  if (!app.globalData.token) {
    wx.reLaunch({ url: '/pages/login/index' })
    return false
  }
  return true
}
