/**
 * 推广申请页
 * 扫描管理员生成的二维码后打开，一键登录+自动申请
 */
import api from '../../utils/api'

Page({
  data: {
    token: '',
    loggedIn: false,
    initializing: true,
    applying: false,
    submitted: false,
    alreadyPromoter: false,
    rejected: false,
    rejectReason: '',
    errorMsg: '',
  },

  onLoad(options: any) {
    // options.scene 来自微信小程序码（wxacode.getUnlimited）
    // options.token 来自开发工具或直接跳转
    const token = options.scene || options.token || ''
    this.setData({ token })

    const app = getApp()
    if (app.globalData.token) {
      this.setData({ loggedIn: true, initializing: false })
      this.updateUserProfile().then(() => this.handleApply())
    } else {
      // 未登录，全局 Page 拦截会跳转登录页，此处先显示加载
      this.setData({ initializing: false })
    }
  },

  /** 尝试获取微信昵称并更新用户资料 */
  async updateUserProfile() {
    try {
      const res_: any = await wx.getUserInfo({ lang: 'zh_CN' })
      const userInfo = res_.userInfo || res_
      if (userInfo.nickName && userInfo.nickName !== '微信用户') {
        await api.put('/users/me', {
          nickname: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
        })
        const app = getApp()
        if (app.globalData.userInfo) {
          app.globalData.userInfo.nickname = userInfo.nickName
        }
      }
    } catch {
      // 静默失败，不影响主流程
    }
  },

  /** 微信一键登录（含手机号），失败则降级为普通登录 */
  async handlePhoneLogin(e: any) {
    // 用户拒绝或无法弹出授权 → 降级到普通 code 登录
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      await this.handleCodeLogin()
      return
    }

    wx.showLoading({ title: '登录中...' })
    try {
      const { code } = await wx.login()
      const { encryptedData, iv } = e.detail

      const res: any = await api.post('/wechat/login', { code, encryptedData, iv })

      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ loggedIn: true })
      await this.updateUserProfile()
      this.handleApply()
    } catch (err: any) {
      wx.hideLoading()
      // 手机号登录失败，降级到普通登录
      await this.handleCodeLogin()
    }
  },

  /** 普通微信 code 登录（无手机号） */
  async handleCodeLogin() {
    wx.showLoading({ title: '登录中...' })
    try {
      const { code } = await wx.login()
      const res: any = await api.post('/wechat/login', { code })

      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ loggedIn: true })
      await this.updateUserProfile()
      this.handleApply()
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    }
  },

  /** 自动提交推广申请 */
  async handleApply() {
    if (!this.data.token) {
      this.setData({ errorMsg: '二维码无效' })
      return
    }

    this.setData({ applying: true })
    try {
      await api.post('/promotion/apply-by-token', { token: this.data.token })
      this.setData({ submitted: true })
    } catch (err: any) {
      const msg = err.message || ''
      if (msg.includes('已是推广员')) {
        this.setData({ alreadyPromoter: true })
      } else if (msg.includes('等待审核') || msg.includes('已提交')) {
        this.setData({ submitted: true })
      } else {
        this.setData({ errorMsg: msg || '申请失败' })
        wx.showToast({ title: msg || '申请失败', icon: 'none' })
      }
    } finally {
      this.setData({ applying: false })
    }
  },

  /** 去首页 */
  goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },
})
