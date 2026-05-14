/**
 * 推广中心
 * 推广员查看推广数据、推广记录
 */
import api from '../../utils/api'

Page({
  data: {
    stats: null as any,
    records: [] as any[],
    page: 1,
    pageSize: 20,
    hasMore: true,
    loading: false,
    isPromoter: false,
    // 时间筛选
    startDate: '',
    endDate: '',
    showDatePicker: false,
    datePickerMode: 'start' as 'start' | 'end',
    datePickerValue: '',
  },

  onShow() {
    this.checkPromoterStatus()
  },

  async checkPromoterStatus() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      let userInfo = app.globalData.userInfo

      if (!userInfo) {
        userInfo = await api.get('/users/me')
        app.globalData.userInfo = userInfo
      }

      const isPromoter = userInfo?.isPromoter || false
      this.setData({ isPromoter })

      if (isPromoter) {
        this.fetchStats()
        this.fetchRecords(1, true)
      }
    } catch {
      // ignore
    } finally {
      this.setData({ loading: false })
    }
  },

  async fetchStats() {
    try {
      const { startDate, endDate } = this.data
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res: any = await api.get('/promotion/stats', params)
      this.setData({ stats: res })
    } catch {
      // ignore
    }
  },

  async fetchRecords(page: number, reset: boolean = false) {
    try {
      const { startDate, endDate } = this.data
      const params: any = { page, pageSize: this.data.pageSize }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const res: any = await api.get('/promotion/records', params)
      const records = res?.records || res || []
      this.setData({
        records: reset ? records : this.data.records.concat(records),
        hasMore: records.length >= this.data.pageSize,
        page,
      })
    } catch {
      // ignore
    }
  },

  /** 申请成为推广员 */
  async applyPromoter() {
    wx.showLoading({ title: '申请中...' })
    try {
      await api.post('/promotion/apply')
      const app = getApp()
      app.globalData.userInfo = { ...app.globalData.userInfo, isPromoter: false }
      wx.hideLoading()
      wx.showToast({ title: '申请已提交，请等待审核', icon: 'success' })
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '申请失败', icon: 'none' })
    }
  },

  /** 加载更多 */
  loadMore() {
    if (!this.data.hasMore || this.data.loading) return
    this.fetchRecords(this.data.page + 1)
  },

  // ========== 时间筛选 ==========

  onStartDateChange(e: any) {
    this.setData({ startDate: e.detail.value }, () => {
      this.fetchStats()
      this.fetchRecords(1, true)
    })
  },

  onEndDateChange(e: any) {
    this.setData({ endDate: e.detail.value }, () => {
      this.fetchStats()
      this.fetchRecords(1, true)
    })
  },

  resetDateFilter() {
    this.setData({ startDate: '', endDate: '' }, () => {
      this.fetchStats()
      this.fetchRecords(1, true)
    })
  },

  /** 分享小程序 */
  onShareAppMessage(): any {
    const app = getApp()
    const userId = app.globalData.userInfo?.id
    return {
      title: '椰树集团参观预约',
      path: `/pages/home/index?promoterId=${userId || ''}`,
    }
  },
})
