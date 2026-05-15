/**
 * 活动详情页
 * 展示活动完整信息，包括封面图、标题、时间地点、状态标签、富文本内容
 */
import api, { resolveImageUrls } from '../../utils/api'
import { formatDate } from '../../utils/formatDate'

/** 根据开始/结束时间实时计算活动状态（与后台 ActivityList 逻辑一致） */
function computeStatus(activity: any): { label: string; cssClass: string } {
  const now = Date.now()
  const start = activity.startTime ? new Date(activity.startTime).getTime() : Infinity
  const end = activity.endTime ? new Date(activity.endTime).getTime() : Infinity
  if (now >= start && now <= end) return { label: '进行中', cssClass: 'ongoing' }
  if (now > end) return { label: '已结束', cssClass: 'ended' }
  return { label: '即将开始', cssClass: 'upcoming' }
}

/** 将 computeStatus 结果写入 activity 的展示字段 */
function applyStatus(act: any) {
  const st = computeStatus(act)
  act._statusLabel = st.label
  act._statusClass = st.cssClass
}

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
        const act = resolveImageUrls(res)
        act._startTime = formatDate(act.startTime)
        act._endTime = formatDate(act.endTime)
        applyStatus(act)
        this.setData({ activity: act })
        return
      } catch {
        // 接口不支持按 ID 查询时，拉取全量列表后过滤
        const res: any = await api.get('/activities')
        const list = resolveImageUrls(res || [])
        const found = list.find((item: any) => String(item.id) === String(id))
        if (found) {
          found._startTime = formatDate(found.startTime)
          found._endTime = formatDate(found.endTime)
          applyStatus(found)
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
