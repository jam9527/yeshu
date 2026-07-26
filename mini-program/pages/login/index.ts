/**
 * 登录页
 * 两步登录：code 登录 → 个人资料设置（头像/昵称/手机号）
 * 支持后台自定义背景、logo、按钮颜色
 */
import api from '../../utils/api'

interface LoginPageConfig {
  background?: string
  logo?: string
  titleColor?: string
  buttonColor?: string
  buttonTextColor?: string
}

Page({
  data: {
    phoneLoggedIn: false,
    codeLoggedIn: false,
    fetchingNickname: false,
    needNicknameAuth: false,
    nicknameInput: '',
    saving: false,
    chosenAvatarUrl: '',
    phoneInput: '',
    agreedToPrivacy: false,
    // 动态配置
    pageConfig: {
      background: '',
      logo: '',
      titleColor: '#ffffff',
      buttonColor: '#d92b2b',
      buttonTextColor: '#ffffff',
    } as LoginPageConfig,
  },

  onLoad() {
    this.fetchPageConfig()
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
        // switchTab 不支持携带参数，有参数时用 reLaunch 代替
        if (options && Object.keys(options).length > 0) {
          wx.reLaunch({ url })
        } else {
          wx.switchTab({ url: redirect })
        }
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

  /** 协议区域统一点击处理：链接打开弹窗，其他区域切换勾选 */
  handleAgreementTap(e: any) {
    const action = e.target.dataset.action
    if (action === 'openTerms') {
      this.openTerms()
    } else if (action === 'openPrivacyPolicy') {
      this.openPrivacyPolicy()
    } else {
      this.setData({ agreedToPrivacy: !this.data.agreedToPrivacy })
    }
  },

  /** 查看隐私政策 */
  openPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '椰树集团参观预约小程序尊重并保护您的个人隐私。\n\n1. 我们仅在您授权后收集您的微信昵称、头像和手机号码，用于预约身份识别。\n2. 您的位置信息仅用于参观导航功能。\n3. 您的个人信息不会被分享或出售给第三方。\n4. 您可以随时在小程序中编辑或删除您的个人信息。\n\n如您对本隐私政策有任何疑问，请联系我们。',
      showCancel: false,
      confirmText: '我知道了',
    })
  },

  /** 查看用户协议 */
  openTerms() {
    wx.showModal({
      title: '用户服务协议',
      content: '欢迎使用椰树集团参观预约小程序。\n\n1. 本小程序提供展厅参观预约、活动报名等服务。\n2. 用户须提供真实有效的个人信息进行预约。\n3. 预约成功后请按时到馆参观，如需取消请提前操作。\n4. 团队预约需上传相关证明材料。\n5. 本集团保留对预约规则的最终解释权。\n\n使用本小程序即表示您同意以上条款。',
      showCancel: false,
      confirmText: '我知道了',
    })
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
      const res: any = await api.post('/wechat/login', { code, encryptedData: sendEncryptedData, iv: sendIv, promoterId, phoneCode })

      app.setToken(res.token)
      app.globalData.userInfo = res.user
      app.globalData.promoterId = null // 登录成功后清除

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
      const res: any = await api.post('/wechat/login', { code, promoterId })

      app.setToken(res.token)
      app.globalData.userInfo = res.user
      app.globalData.promoterId = null // 登录成功后清除

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

  /** 获取登录页自定义配置（公开接口，无需登录） */
  fetchPageConfig() {
    const app = getApp()
    wx.request({
      url: `${app.globalData.baseUrl}/config/login-page`,
      method: 'GET',
      success: (res: any) => {
        const data = res.data?.data || res.data
        if (data && Object.keys(data).length > 0) {
          // 将相对路径转为绝对路径
          const baseUrl = app.globalData.baseUrl.replace(/\/api$/, '')
          const config: LoginPageConfig = {}
          if (data.background) config.background = `${baseUrl}${data.background}`
          if (data.logo) config.logo = `${baseUrl}${data.logo}`
          if (data.titleColor) config.titleColor = data.titleColor
          if (data.buttonColor) config.buttonColor = data.buttonColor
          if (data.buttonTextColor) config.buttonTextColor = data.buttonTextColor
          this.setData({ pageConfig: config })
        }
      },
      fail: () => {
        // 使用默认配置
      },
    })
  },

})
