/**
 * 精彩活动 - 活动列表页
 * TabBar 页面，展示全部活动，支持点击进入详情
 */
import api, { resolveImageUrls } from '../../utils/api'
import { formatDate } from '../../utils/formatDate'

Page({
  data: {
    /** 活动列表 */
    activities: [] as any[],
    /** 加载状态 */
    loading: true,
  },

  onLoad() {
    this.fetchActivities()
  },

  onShow() {
    // Tab 切换时刷新数据
    this.fetchActivities()
  },

  async fetchActivities() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/activities')
      const list = resolveImageUrls(res || []) as any[]
      list.forEach(item => { item._startTime = formatDate(item.startTime); item._endTime = formatDate(item.endTime) })
      this.setData({ activities: list })
    } catch {
      wx.showToast({ title: '获取活动列表失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 跳转活动详情 */
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/activity-detail/index?id=${id}` })
  },
})
