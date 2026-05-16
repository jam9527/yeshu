/**
 * 核销记录
 * 展示核销历史记录列表，支持分页加载和日期筛选
 */
import api from '../../utils/api'

Page({
  data: {
    records: [] as any[],
    total: 0,
    page: 1,
    pageSize: 20,
    loading: false,
    dateFilter: '',
  },

  onLoad() {
    if (!this.checkVerifier()) return
    this.fetchData()
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

  /** 获取核销记录 */
  async fetchData() {
    const { page, pageSize, dateFilter } = this.data
    this.setData({ loading: true })

    try {
      const params: any = { page, pageSize }
      if (dateFilter) {
        params.date = dateFilter
      }
      const res: any = await api.get('/verification/records', params)
      this.setData({
        records: res?.records || [],
        total: res?.total || 0,
      })
    } catch {
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 加载更多（滚动分页） */
  async loadMore() {
    const { loading, records, total, page, pageSize, dateFilter } = this.data
    if (loading || records.length >= total) return

    const nextPage = page + 1
    this.setData({ loading: true })

    try {
      const params: any = { page: nextPage, pageSize }
      if (dateFilter) {
        params.date = dateFilter
      }
      const res: any = await api.get('/verification/records', params)
      this.setData({
        records: [...records, ...(res?.records || [])],
        total: res?.total || 0,
        page: nextPage,
      })
    } catch {
      wx.showToast({ title: '加载更多失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 日期筛选变更 */
  onDateChange(e: any) {
    const val = e.detail.value
    this.setData({ dateFilter: val, page: 1, records: [] }, () => {
      this.fetchData()
    })
  },

  /** 清除日期筛选 */
  clearFilter() {
    this.setData({ dateFilter: '', page: 1, records: [] }, () => {
      this.fetchData()
    })
  },

  /** 格式化时间 */
  formatTime(t: string): string {
    if (!t) return ''
    const d = new Date(t)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  },
})
