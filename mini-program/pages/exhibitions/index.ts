/**
 * 展厅导览 - 展厅列表页
 * TabBar 页面，展示全部展厅，支持点击进入详情
 */
import api from '../../utils/api'

Page({
  data: {
    /** 展厅列表 */
    exhibitions: [] as any[],
    /** 加载状态 */
    loading: true,
  },

  onLoad() {
    this.fetchExhibitions()
  },

  onShow() {
    // Tab 切换时刷新数据
    this.fetchExhibitions()
  },

  async fetchExhibitions() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/exhibitions')
      this.setData({ exhibitions: res || [] })
    } catch {
      wx.showToast({ title: '获取展厅列表失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 跳转展厅详情 */
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/exhibition-detail/index?id=${id}` })
  },
})
