/**
 * 活动详情页
 * 展示活动完整信息，包括封面图、标题、时间地点、状态标签、富文本内容
 */
import api from '../../utils/api'

Page({
  data: {
    /** 活动详情 */
    activity: null as any,
    /** 加载状态 */
    loading: true,
  },

  onLoad(options: any) {
    const { id } = options
    if (id) this.fetchActivity(id)
  },

  async fetchActivity(id: string) {
    this.setData({ loading: true })
    try {
      // 优先尝试直接获取单个活动
      try {
        const res: any = await api.get('/activities/' + id)
        this.setData({ activity: res })
        return
      } catch {
        // 接口不支持按 ID 查询时，拉取全量列表后过滤
        const res: any = await api.get('/activities')
        const list = res || []
        const found = list.find((item: any) => String(item.id) === String(id))
        if (found) {
          this.setData({ activity: found })
        } else {
          wx.showToast({ title: '活动未找到', icon: 'none' })
        }
      }
    } catch {
      wx.showToast({ title: '获取活动详情失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack()
  },
})
