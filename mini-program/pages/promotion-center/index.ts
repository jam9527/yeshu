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
    // 海报相关
    poster: null as any,
    posterImageUrl: '',
    posterGenerating: false,
    savingPoster: false,
  },

  onShow() {
    this.checkPromoterStatus()
  },

  async checkPromoterStatus() {
    this.setData({ loading: true })
    try {
      const app = getApp()
      // 始终从服务器获取最新用户信息，避免使用过期缓存
      const userInfo = await api.get('/users/me')
      app.globalData.userInfo = userInfo

      const isPromoter = userInfo?.isPromoter || false
      console.log('[推广中心] 用户推广状态:', isPromoter ? '是推广员' : '非推广员')
      this.setData({ isPromoter })

      if (isPromoter) {
        await Promise.all([
          this.fetchStats(),
          this.fetchRecords(1, true),
          this.fetchPoster(),
        ])
      }
    } catch (err: any) {
      console.error('[推广中心] 获取用户信息失败:', err.message || err)
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
    this.setData({ startDate: e.detail.value })
  },

  onEndDateChange(e: any) {
    this.setData({ endDate: e.detail.value })
  },

  /** 点击查询按钮 */
  queryDateFilter() {
    if (!this.data.startDate && !this.data.endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' })
      return
    }
    this.fetchStats()
    this.fetchRecords(1, true)
  },

  resetDateFilter() {
    this.setData({ startDate: '', endDate: '' }, () => {
      this.fetchStats()
      this.fetchRecords(1, true)
    })
  },

  // ========== 海报 ==========

  /** 获取当前激活的海报配置 */
  async fetchPoster() {
    try {
      const poster: any = await api.get('/promotion/poster')
      if (poster) {
        this.setData({ poster })
      }
    } catch {
      // ignore
    }
  },

  /** 生成个人专属海报图片 */
  async generatePosterImage() {
    this.setData({ posterGenerating: true })
    try {
      const res: any = await api.get('/promotion/poster-image')
      this.setData({ posterImageUrl: res.url })
    } catch (err: any) {
      wx.showToast({ title: err.message || '海报生成失败', icon: 'none' })
    } finally {
      this.setData({ posterGenerating: false })
    }
  },

  /** 预览海报大图 */
  previewPoster() {
    if (!this.data.posterImageUrl) return
    wx.previewImage({
      urls: [this.data.posterImageUrl],
      current: this.data.posterImageUrl,
    })
  },

  /** 保存海报到相册 */
  async savePoster() {
    if (!this.data.posterImageUrl) {
      wx.showToast({ title: '请先生成海报', icon: 'none' })
      return
    }

    // 检查相册权限
    const setting: any = await new Promise((resolve) => {
      wx.getSetting({ success: resolve, fail: () => resolve({ authSetting: {} }) })
    })

    if (!setting.authSetting['scope.writePhotosAlbum']) {
      try {
        await new Promise<void>((resolve, reject) => {
          wx.authorize({ scope: 'scope.writePhotosAlbum', success: () => resolve(), fail: reject })
        })
      } catch {
        wx.showModal({
          title: '提示',
          content: '需要相册权限才能保存海报，请在设置中开启',
          confirmText: '去设置',
          success: (modalRes: any) => {
            if (modalRes.confirm) {
              wx.openSetting({})
            }
          },
        })
        return
      }
    }

    this.setData({ savingPoster: true })
    wx.showLoading({ title: '保存中...' })
    try {
      const downloadRes = await new Promise<WechatMiniprogram.DownloadFileSuccessCallbackResult>((resolve, reject) => {
        wx.downloadFile({ url: this.data.posterImageUrl, success: resolve, fail: reject })
      })
      await new Promise<void>((resolve, reject) => {
        wx.saveImageToPhotosAlbum({ filePath: downloadRes.tempFilePath, success: () => resolve(), fail: reject })
      })
      wx.showToast({ title: '已保存到相册', icon: 'success' })
    } catch (err: any) {
      wx.showToast({ title: err.errMsg || '保存失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ savingPoster: false })
    }
  },

  /** 分享小程序（优先使用海报图） */
  onShareAppMessage(): any {
    const app = getApp()
    const userId = app.globalData.userInfo?.id
    return {
      title: '椰树集团参观预约',
      path: `/pages/home/index?promoterId=${userId || ''}`,
      imageUrl: this.data.posterImageUrl || `https://yuyue.yeshu.com/uploads/1779073747940-221652702.png`,
    }
  },
})
