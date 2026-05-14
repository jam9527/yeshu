/**
 * 常见问题 - 手风琴式 FAQ 列表
 * 点击问题展开/收起答案
 */
import api from '../../utils/api'

Page({
  data: {
    /** FAQ 列表 */
    faqs: [] as any[],
    /** 加载状态 */
    loading: true,
    /** 当前展开项的 ID（手风琴模式：同时只能展开一项） */
    expandedId: null as number | null,
  },

  onLoad() {
    this.fetchFaqs()
  },

  async fetchFaqs() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/faqs')
      this.setData({ faqs: res || [] })
    } catch {
      wx.showToast({ title: '获取常见问题失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 切换展开/收起 */
  toggleExpand(e: any) {
    const { id } = e.currentTarget.dataset
    this.setData({
      expandedId: this.data.expandedId === id ? null : id,
    })
  },
})
