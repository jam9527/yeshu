import api from '../../utils/api'

interface ComponentDef {
  type: string
  label: string
  props: Record<string, any>
}

Page({
  data: {
    exhibitions: [] as any[],
    activities: [] as any[],
    diyComponents: [] as ComponentDef[],
    loading: true,
  },

  onLoad(options: any) {
    if (options.promoterId) {
      wx.setStorageSync('promoterId', options.promoterId)
    }
    this.fetchData()
  },

  async fetchData() {
    this.setData({ loading: true })
    try {
      const [exhibitions, activities, diyPage] = await Promise.all([
        api.get('/exhibitions').catch(() => []),
        api.get('/activities').catch(() => []),
        api.get('/diy-page/active', { pageKey: 'home' }).catch(() => null),
      ])
      const diyConfig = (diyPage as any)?.config
      this.setData({
        exhibitions: (exhibitions as any) || [],
        activities: ((activities as any) || []).slice(0, 5),
        diyComponents: diyConfig?.components || [],
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // === DIY 组件交互事件 ===

  onDiySwiperTap(e: any) {
    const { link } = e.currentTarget.dataset
    if (link) wx.navigateTo({ url: link })
  },

  onFuncGridTap(e: any) {
    const { url } = e.currentTarget.dataset
    if (!url) return
    if (url.startsWith('/')) {
      wx.navigateTo({ url })
    } else if (url.startsWith('http')) {
      wx.setClipboardData({ data: url })
    }
  },

  onDiyImageTap(e: any) {
    const { link } = e.currentTarget.dataset
    if (link) {
      if (link.startsWith('/')) wx.navigateTo({ url: link })
      else wx.setClipboardData({ data: link })
    }
  },

  onDiyButtonTap(e: any) {
    const { link } = e.currentTarget.dataset
    if (link) {
      if (link.startsWith('/')) wx.navigateTo({ url: link })
      else wx.setClipboardData({ data: link })
    }
  },

  goExhibitionDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/exhibition-detail/index?id=${id}` })
  },

  goActivityDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/activity-detail/index?id=${id}` })
  },

  goExhibitionList() {
    wx.navigateTo({ url: '/pages/exhibitions/index' })
  },

  goActivityList() {
    wx.navigateTo({ url: '/pages/activities/index' })
  },

  goMyReservations() {
    const app = getApp()
    if (!app.globalData.token) {
      wx.navigateTo({ url: '/pages/login/index' })
      return
    }
    wx.navigateTo({ url: '/pages/my-reservations/index' })
  },
})
