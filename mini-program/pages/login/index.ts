/**
 * 登录页
 * 两步登录：手机号授权 → 昵称设置
 * 昵称优先通过 getUserInfo 按钮加密数据由后端解密获取，用户可手动输入作为备选
 * 登录成功后跳转到之前要访问的页面
 */
import api from '../../utils/api'

Page({
  data: {
    phoneLoggedIn: false,
    codeLoggedIn: false,
    fetchingNickname: false,
    needNicknameAuth: false,
    /** 手动输入昵称 */
    nicknameInput: '',
    /** 是否正在保存昵称 */
    saving: false,
  },

  onLoad() {
    const app = getApp()
    if (app.globalData.token) {
      this.goToPendingPage()
    }
  },

  /** 跳转到之前要访问的页面 */
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

      const res: any = await api.post('/wechat/login', { code, encryptedData, iv })

      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ phoneLoggedIn: true })
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

      const res: any = await api.post('/wechat/login', { code })

      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user

      wx.hideLoading()
      this.setData({ codeLoggedIn: true })
      await this.tryGetNickname()
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '登录失败', icon: 'none' })
    }
  },

  /** 尝试获取微信昵称（静默） */
  async tryGetNickname() {
    this.setData({ fetchingNickname: true })
    try {
      const userInfo = await wx.getUserInfo({ lang: 'zh_CN' })
      if (userInfo.nickName && userInfo.nickName !== '微信用户') {
        await this.saveNickname(userInfo.nickName, userInfo.avatarUrl)
        this.goToPendingPage()
        return
      }
    } catch {}
    // 静默获取失败，显示昵称设置步骤（授权按钮 + 手动输入）
    this.setData({ needNicknameAuth: true, fetchingNickname: false })
  },

  /** 微信昵称授权按钮回调（后端解密获取真实昵称） */
  async handleGetUserInfo(e: any) {
    if (e.detail.errMsg !== 'getUserInfo:ok') return

    // 优先通过后端解密 encryptedData 获取真实昵称
    if (e.detail.encryptedData && e.detail.iv) {
      this.setData({ saving: true })
      try {
        const res: any = await api.post('/wechat/decode-userinfo', {
          encryptedData: e.detail.encryptedData,
          iv: e.detail.iv,
        })
        if (res.nickname) {
          const app = getApp()
          if (app.globalData.userInfo) {
            app.globalData.userInfo.nickname = res.nickname
          }
          this.goToPendingPage()
          return
        }
      } catch {}
    }

    // 降级：使用前端返回的 userInfo
    const { nickName, avatarUrl } = e.detail.userInfo
    if (nickName && nickName !== '微信用户') {
      await this.saveNickname(nickName, avatarUrl)
    }
    this.goToPendingPage()
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
    await this.saveNickname(nickname)
    this.goToPendingPage()
  },

  /** 跳过昵称设置 */
  handleSkipNickname() {
    this.goToPendingPage()
  },

  /** 保存昵称到后端 */
  async saveNickname(nickname: string, avatarUrl?: string) {
    try {
      await api.put('/users/me', { nickname, avatarUrl })
      const app = getApp()
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickname = nickname
      }
    } catch {}
  },

  /** 测试登录（开发环境用） */
  async handleTestLogin() {
    wx.showLoading({ title: '测试登录中...' })
    try {
      const res: any = await api.post('/wechat/test-login')
      const app = getApp()
      app.setToken(res.token)
      app.globalData.userInfo = res.user
      wx.hideLoading()
      this.goToPendingPage()
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '测试登录失败', icon: 'none' })
    }
  },
})
