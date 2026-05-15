/**
 * 展厅详情页
 * 展示展厅完整信息，包括封面图、名称、富文本内容
 */
import api, { resolveImageUrls } from '../../utils/api'

Page({
  data: {
    /** 展厅详情 */
    exhibition: null as any,
    /** 加载状态 */
    loading: true,
  },

  onLoad(options: any) {
    const { id } = options
    if (id) this.fetchExhibition(id)
  },

  async fetchExhibition(id: string) {
    this.setData({ loading: true })
    try {
      // 优先尝试直接获取单个展厅
      try {
        const res: any = await api.get('/exhibitions/' + id)
        this.setData({ exhibition: resolveImageUrls(res) })
        return
      } catch {
        // 接口不支持按 ID 查询时，拉取全量列表后过滤
        const res: any = await api.get('/exhibitions')
        const list = resolveImageUrls(res || [])
        const found = list.find((item: any) => String(item.id) === String(id))
        if (found) {
          this.setData({ exhibition: found })
        } else {
          wx.showToast({ title: '展厅未找到', icon: 'none' })
        }
      }
    } catch {
      wx.showToast({ title: '获取展厅详情失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 返回上一页 */
  goBack() {
    wx.navigateBack()
  },
})
