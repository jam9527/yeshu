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
  // 不需要分享功能的页面路由
  const noShareRoutes = ['pages/login/index', 'pages/profile/index']

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

    // 在 onShow 中启用分享（每次页面显示时都会触发，包括 tab 页切换）
    const originalOnShow = config.onShow
    config.onShow = function (this: any) {
      const route = this.route || ''
      if (!noShareRoutes.includes(route)) {
        wx.showShareMenu({ menus: ['shareAppMessage'] })
      }
      if (originalOnShow) return originalOnShow.call(this)
    }

    config.onLoad = function (this: any, options: any) {
      const app = getApp()
      const route = this.route || ''

      // 捕获推广人 ID（分享链接 ?promoterId=xxx）
      // 已登录用户：后端从 JWT 中提取用户 ID 直接绑定
      // 未登录用户：promoterId 暂存 globalData，登录时传给后端
      if (options && options.promoterId) {
        app.globalData.promoterId = Number(options.promoterId)
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
    /** 锁定的推广邀请码（扫描海报后自动填入，不可修改） */
    lockedPromoterCode: null as string | null,
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
