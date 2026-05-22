/**
 * 登录页
 * 两步登录：code 登录 → 个人资料设置（头像/昵称/手机号）
 * 测试环境：通过用户名区分不同测试用户
 */
import api from '../../utils/api'

Page({
  data: {
    phoneLoggedIn: false,
    codeLoggedIn: false,
    fetchingNickname: false,
    needNicknameAuth: false,
    nicknameInput: '',
    saving: false,
    testUsername: '',
    chosenAvatarUrl: '',
    phoneInput: '',
  },

  onLoad() {
    const app = getApp()
    if (app.globalData.token) {
      this.goToPendingPage()
    }
  },

  goToPendingPage() {
    const app = getApp()
    const redirect = app.globalData.pendingRedirect
    const options = app.globalData.pendingRedirectOptions
    app.globalData.pendingRedirect = ''
    app.globalData.pendingRedirectOptions = null

    if (redirect) {
      let url = redirect
      if (options && Object.keys(options).length > 0) {
        const query = Object.entries(options)
          .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
          .join('&')
        url += '?' + query
      }
      const tabPages = ['/pages/home/index', '/pages/quick-check/index', '/pages/profile/index']
      if (tabPages.includes(redirect)) {
        wx.switchTab({ url: redirect })
      } else {
        wx.redirectTo({ url })
      }
    } else {
      wx.switchTab({ url: '/pages/home/index' })
    }
  },

  /** 隐私协议同意回调（耦合按钮必需） */
  handleAgreePrivacy() {
    // WeChat 自动处理隐私弹窗，无需额外逻辑
  },

  /** 微信一键登录（含手机号授权），失败降级为普通 code 登录 */
  async handlePhoneLogin(e: any) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      this.handleCodeLogin()
      return
    }

    wx.showLoading({ title: '登录中...' })
    try {
      const { code } = await wx.login()
      if (!code) throw new Error('获取登录凭证失败')

      const { encryptedData, iv } = e.detail

      // 新版API: phoneCode 优先 (base library ≥2.21.2)
      const phoneCode = e.detail.code || undefined
      // 旧版兼容: 如果没有 phoneCode, 则使用 encryptedData+iv
      const sendEncryptedData = phoneCode ? undefined : encryptedData
      const sendIv = phoneCode ? undefined : iv

      const app = getApp()
      const promoterId = app.globalData.promoterId
      if (promoterId) app.globalData.promoterId = null // 用一次即清除
      const res: any = await api.post('/wechat/login', { code, encryptedData: sendEncryptedData, iv: sendIv, promoterId, phoneCode })

      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ phoneLoggedIn: true })

      // 已有完整资料 → 直接跳转首页
      if (res.user?.nickname) {
        this.goToPendingPage()
        return
      }

      await this.tryGetNickname()
    } catch (err: any) {
      wx.hideLoading()
      await this.handleCodeLogin()
    }
  },

  /** 普通微信 code 登录（无手机号） */
  async handleCodeLogin() {
    wx.showLoading({ title: '登录中...' })
    try {
      const { code } = await wx.login()
      if (!code) throw new Error('获取登录凭证失败')

      const app = getApp()
      const promoterId = app.globalData.promoterId
      if (promoterId) app.globalData.promoterId = null
      const res: any = await api.post('/wechat/login', { code, promoterId })

      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ codeLoggedIn: true })

      // 已有完整资料 → 直接跳转首页
      if (res.user?.nickname) {
        this.goToPendingPage()
        return
      }

      await this.tryGetNickname()
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    }
  },

  /** 检查是否需要设置昵称（wx.getUserInfo 在新版微信已废弃，直接跳过） */
  async tryGetNickname() {
    this.setData({ needNicknameAuth: true, fetchingNickname: false })
  },

  /** 测试用户名输入 */
  onTestUsernameInput(e: any) {
    this.setData({ testUsername: e.detail.value })
  },

  /** 选择头像回调 */
  handleChooseAvatar(e: any) {
    this.setData({ chosenAvatarUrl: e.detail.avatarUrl })
  },

  /** 手机号输入 */
  onPhoneInput(e: any) {
    this.setData({ phoneInput: e.detail.value })
  },

  /** 手动输入昵称 */
  onNicknameInput(e: any) {
    this.setData({ nicknameInput: e.detail.value })
  },

  /** 保存手动输入的昵称 */
  async handleSaveNickname() {
    const nickname = this.data.nicknameInput.trim()
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }
    this.setData({ saving: true })
    await this.saveNickname(nickname, this.data.chosenAvatarUrl)
    this.goToPendingPage()
  },

  /** 跳过昵称设置 */
  handleSkipNickname() {
    this.goToPendingPage()
  },

  /** 保存昵称/头像到后端（手机号已在登录时从微信获取并保存） */
  async saveNickname(nickname: string, avatarTempPath?: string) {
    try {
      let serverAvatarUrl = ''
      if (avatarTempPath) {
        try {
          const uploadRes: any = await api.upload('/files/upload', avatarTempPath)
          serverAvatarUrl = uploadRes?.url || uploadRes?.data?.url || ''
        } catch {
          // 上传失败不影响昵称保存
        }
      }
      const body: any = { nickname }
      if (serverAvatarUrl) body.avatarUrl = serverAvatarUrl
      await api.put('/users/me', body)
      const app = getApp()
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickname = nickname
        if (serverAvatarUrl) app.globalData.userInfo.avatarUrl = serverAvatarUrl
      }
    } catch {}
  },

  /** 测试登录（开发环境用，支持多用户） */
  async handleTestLogin() {
    wx.showLoading({ title: '测试登录中...' })
    try {
      const username = this.data.testUsername.trim() || undefined
      const res: any = await api.post('/wechat/test-login', { username })
      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user
      wx.hideLoading()
      if (res.user.nickname && res.user.nickname !== '测试用户') {
        this.goToPendingPage()
      } else {
        this.setData({ codeLoggedIn: true, needNicknameAuth: true, fetchingNickname: false })
      }
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '测试登录失败', icon: 'none' })
    }
  },
})
