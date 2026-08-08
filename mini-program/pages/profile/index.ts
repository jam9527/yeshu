/**
 * 个人中心 - 个人信息与功能入口
 * 支持编辑头像/昵称、管理订单、实名信息、推广等
 */
import api from '../../utils/api'

interface MenuItem {
  icon: string
  iconColor: string
  title: string
  desc: string
  url: string
  needLogin?: boolean
  role?: string
}

Page({
  data: {
    userInfo: null as any,
    /** 未读通知数 */
    unreadCount: 0,
    /** 头像编辑中 */
    uploadingAvatar: false,
    menuList: [
      { icon: '证', iconColor: '#005bac', title: '实名信息管理', desc: '管理参观人证件信息', url: '/pages/real-name-list/index', needLogin: true },
      { icon: '推', iconColor: '#f5a623', title: '推广中心', desc: '分享得奖励', url: '/pages/promotion-center/index', needLogin: true, role: 'isPromoter' },
      { icon: '核', iconColor: '#4caf50', title: '核销人员入口', desc: '扫码核销', url: '/pages-verifier/verifier-home/index', needLogin: true, role: 'isVerifier' },
      { icon: '常', iconColor: '#9c27b0', title: '常见问题', desc: '参观指南与帮助', url: '/pages/faq/index' },
      { icon: '反', iconColor: '#e91e63', title: '意见反馈', desc: '告诉我们您的想法', url: '/pages/feedback/index', needLogin: true },
    ] as MenuItem[],
  },

  onShow() {
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }
    const app = getApp()

    if (app.globalData.token) {
      // 先用缓存数据展示，避免闪白
      if (app.globalData.userInfo) {
        this.setData({ userInfo: app.globalData.userInfo })
        this.updateMenuVisibility()
      }
      this.refreshUserInfo()
      this.fetchUnreadCount()
    } else {
      this.setData({ userInfo: null })
      this.updateMenuVisibility()
    }
  },

  updateMenuVisibility() {
    const app = getApp()
    const userInfo = app.globalData.userInfo || {}
    const menuList = this.data.menuList.map((item: MenuItem) => ({
      ...item,
      show: !item.role || userInfo[item.role],
    }))
    this.setData({ menuList })
  },

  async refreshUserInfo() {
    try {
      const res: any = await api.get('/users/me')
      const app = getApp()
      app.globalData.userInfo = res
      this.setData({ userInfo: res })
      this.updateMenuVisibility()
    } catch (err) {
      console.error('获取用户信息失败', err)
    }
  },

  async fetchUnreadCount() {
    try {
      const res: any = await api.get('/notifications/unread-count')
      this.setData({ unreadCount: res.count || 0 })
    } catch {
      // 静默失败
    }
  },

  /** 编辑头像 - 由 open-type="chooseAvatar" 触发，先上传再保存 */
  async handleEditAvatar(e: any) {
    const app = getApp()
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    const tempPath = e?.detail?.avatarUrl
    if (!tempPath) return
    try {
      this.setData({ uploadingAvatar: true })
      // 上传临时文件到服务器，获取永久 URL
      const uploadRes: any = await api.upload('/files/upload', tempPath)
      const serverUrl = uploadRes?.url || uploadRes?.data?.url
      if (!serverUrl) {
        wx.showToast({ title: '上传失败', icon: 'none' })
        return
      }
      await api.put('/users/me', { avatarUrl: serverUrl })
      app.globalData.userInfo = { ...app.globalData.userInfo, avatarUrl: serverUrl }
      this.setData({ userInfo: app.globalData.userInfo })
      wx.showToast({ title: '头像已更新', icon: 'success' })
    } catch (err) {
      console.error('更新头像失败', err)
      wx.showToast({ title: '更新失败', icon: 'none' })
    } finally {
      this.setData({ uploadingAvatar: false })
    }
  },

  /** 编辑昵称 */
  handleEditNickname() {
    const app = getApp()
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: '',
      success: async (res) => {
        if (res.confirm && res.content?.trim()) {
          try {
            const nickname = res.content.trim()
            await api.put('/users/me', { nickname })
            app.globalData.userInfo = { ...app.globalData.userInfo, nickname }
            this.setData({ userInfo: app.globalData.userInfo })
            wx.showToast({ title: '昵称已更新', icon: 'success' })
          } catch {
            wx.showToast({ title: '修改失败', icon: 'none' })
          }
        }
      },
    })
  },

  /** 编辑手机号 */
  handleEditPhone() {
    const app = getApp()
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    wx.showModal({
      title: '修改手机号',
      editable: true,
      placeholderText: '请输入手机号',
      content: this.data.userInfo?.phone || '',
      success: async (res) => {
        if (res.confirm) {
          const phone = (res.content || '').trim()
          if (!phone) {
            wx.showToast({ title: '手机号不能为空', icon: 'none' })
            return
          }
          try {
            await api.put('/users/me', { phone })
            app.globalData.userInfo = { ...app.globalData.userInfo, phone }
            this.setData({ userInfo: app.globalData.userInfo })
            wx.showToast({ title: '手机号已更新', icon: 'success' })
          } catch {
            wx.showToast({ title: '修改失败', icon: 'none' })
          }
        }
      },
    })
  },

  goTo(e: any) {
    const { url, needLogin } = e.currentTarget.dataset
    const app = getApp()

    if (!url) {
      wx.showToast({ title: '功能开发中', icon: 'none' })
      return
    }

    if (needLogin && !app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    if (url) wx.navigateTo({ url })
  },

  /** 复制推广码到剪贴板 */
  copyShortCode() {
    const code = this.data.userInfo?.shortCode
    if (!code) return
    wx.setClipboardData({
      data: code,
      success: () => wx.showToast({ title: '推广码已复制', icon: 'success' }),
    })
  },

  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          const app = getApp()
          app.logout()
        }
      },
    })
  },
})
