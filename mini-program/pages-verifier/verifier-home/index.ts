/**
 * 核销工作台
 * 核销人员的工作面板，展示核销统计数据、最近核销记录
 */
import api from '../../utils/api'

Page({
  data: {
    stats: {
      todayVerified: 0,
      totalVerified: 0,
    },
    recentRecords: [] as any[],
    loading: true,
  },

  onShow() {
    if (!this.checkVerifier()) return
    this.fetchStats()
    this.fetchRecentRecords()
  },

  checkVerifier(): boolean {
    const app = getApp()
    if (!app.globalData.userInfo?.isVerifier) {
      wx.showToast({ title: '仅核销员可执行此操作', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return false
    }
    return true
  },

  /** 获取核销统计数据 */
  async fetchStats() {
    try {
      const res: any = await api.get('/verification/stats')
      if (res) {
        this.setData({
          'stats.todayVerified': res.todayVerified ?? 0,
          'stats.totalVerified': res.totalVerified ?? 0,
        })
      }
    } catch {
      // 统计接口不可用时，从记录中计算
      try {
        const records: any = await api.get('/verification/records', { page: 1, pageSize: 1000 })
        if (records?.records) {
          const today = new Date()
          const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
          const todayVerified = records.records.filter((r: any) => {
            const t = r.verifiedAt || r.createdAt || ''
            return t.startsWith(todayStr)
          }).length
          this.setData({
            'stats.todayVerified': todayVerified,
            'stats.totalVerified': records.total ?? records.records.length,
          })
        }
      } catch {
        // 静默失败
      }
    }
  },

  /** 获取最近核销记录 */
  async fetchRecentRecords() {
    try {
      const res: any = await api.get('/verification/records', { page: 1, pageSize: 5 })
      this.setData({
        recentRecords: res?.records || [],
      })
    } catch {
      // 静默失败
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 跳转扫一扫核销 */
  goScan() {
    wx.navigateTo({ url: '/pages-verifier/scan/index' })
  },

  /** 跳转核销记录 */
  goRecords() {
    wx.navigateTo({ url: '/pages-verifier/verification-record/index' })
  },

  /** 格式化时间 */
  formatTime(t: string): string {
    if (!t) return ''
    const d = new Date(t)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
})
