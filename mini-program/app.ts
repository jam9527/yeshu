/**
 * 椰树集团参观预约小程序 - 全局入口
 *
 * 全局登录态检查：未登录自动跳转登录页
 * 登录后尝试获取微信昵称和手机号
 */
import { API_BASE_URL } from './config'

// 全局 Page 构造函数拦截，自动检查登录态 + 全局分享配置
;(() => {
  const _Page = Page
  ;((Page as any) as (config: any) => void) = function (config: any) {
    const originalOnLoad = config.onLoad

    // 全局默认分享：未自定义 onShareAppMessage 的页面自动带上推广参数
    if (!config.onShareAppMessage) {
      config.onShareAppMessage = function (this: any) {
        const app = getApp()
        const userId = app.globalData.userInfo?.id
        return {
          title: '椰树集团参观预约',
          path: userId ? `/pages/home/index?promoterId=${userId}` : '/pages/home/index',
        }
      }
    }

    config.onLoad = function (this: any, options: any) {
      const app = getApp()

      // 捕获推广人 ID（分享链接 ?promoterId=xxx）
      // 点击记录在后端登录接口中完成，避免此处的 wx.request 被 redirectTo 取消
      if (options && options.promoterId) {
        app.globalData.promoterId = Number(options.promoterId)
      }

      if (!app.globalData.token) {
        const pages = getCurrentPages()
        const route = pages[pages.length - 1]?.route || ''
        if (route !== 'pages/login/index') {
          app.globalData.pendingRedirect = '/' + route
          app.globalData.pendingRedirectOptions = options ? { ...options } : null
          wx.redirectTo({ url: '/pages/login/index' })
          return
        }
      }
      if (originalOnLoad) return originalOnLoad.call(this, options)
    }
    return _Page(config)
  }
})()

App({
  globalData: {
    /** 用户 JWT token */
    token: '',
    /** 当前用户信息 */
    userInfo: null as any,
    /** API 基础地址 */
    baseUrl: API_BASE_URL,
    /** 推广人 ID（从分享链接进入时捕获） */
    promoterId: null as number | null,
    /** 登录成功后待跳转页面路径 */
    pendingRedirect: '',
    /** 待跳转页面的参数 */
    pendingRedirectOptions: null as any,
  },

  onLaunch() {
    const token = wx.getStorageSync('token')
    if (token) {
      this.globalData.token = token
    }
  },

  /** 设置 token */
  setToken(token: string) {
    this.globalData.token = token
    wx.setStorageSync('token', token)
  },

  /** 退出登录 */
  logout() {
    this.globalData.token = ''
    this.globalData.userInfo = null
    wx.removeStorageSync('token')
    wx.reLaunch({ url: '/pages/login/index' })
  },
})
