import api, { resolveImageUrls } from '../../utils/api'
import { formatDate } from '../../utils/formatDate'

function normalizeSwiperImages(components: any[]): any[] {
  return components.map((comp: any) => {
    if (comp.type === 'swiper' && Array.isArray(comp.props?.images)) {
      comp.props.images = comp.props.images.map((img: any) =>
        typeof img === 'string' ? { src: img, link: '' } : img,
      )
    }
    return comp
  })
}

interface ComponentDef {
  type: string
  label: string
  props: Record<string, any>
}

Page({
  data: {
    exhibitions: [] as any[],
    activities: [] as any[],
    _homeExhibitions: [] as any[],
    _homeActivities: [] as any[],
    diyComponents: [] as ComponentDef[],
    diyBackgroundStyle: '',
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
      const bg = diyConfig?.background || {} as any
      let bgStyle = ''
      if (bg.color) bgStyle += bg.color
      if (bg.image) {
        const absBgImg = typeof bg.image === 'string' && bg.image.startsWith('/uploads/')
          ? resolveImageUrls(bg.image)
          : bg.image
        const size = bg.size || 'cover'
        const position = bg.position || 'center center'
        const repeat = size === 'repeat' ? 'repeat' : 'no-repeat'
        bgStyle = `background:url(${absBgImg}) ${repeat} ${position}/${size}, ${bg.color || 'transparent'}`
      } else if (bg.color) {
        bgStyle = `background:${bg.color}`
      }

      const exhList = resolveImageUrls((exhibitions as any) || []) as any[]
      const actList = resolveImageUrls((activities as any) || []) as any[]
      const homeActs = actList.slice(0, 4)
      homeActs.forEach(act => { act._startTime = formatDate(act.startTime); act._endTime = formatDate(act.endTime) })
      this.setData({
        exhibitions: exhList,
        activities: actList,
        _homeExhibitions: exhList.slice(0, 4),
        _homeActivities: homeActs,
        diyComponents: normalizeSwiperImages(resolveImageUrls(diyConfig?.components) || []),
        diyBackgroundStyle: bgStyle,
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

  onMediaGridTap(e: any) {
    const { link } = e.currentTarget.dataset
    if (link) {
      if (link.startsWith('/')) wx.navigateTo({ url: link })
      else wx.setClipboardData({ data: link })
    }
  },

  onColumnsTap(e: any) {
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
