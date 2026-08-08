import api, { resolveImageUrls } from '../../utils/api'
import { formatDate } from '../../utils/formatDate'

/** 百度 BD-09 坐标 → 火星 GCJ-02（微信地图使用） */
function bd09ToGcj02(lng: number, lat: number): { lng: number; lat: number } {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * Math.PI * 3000) / 180)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos((x * Math.PI * 3000) / 180)
  return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) }
}

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

  onShow() {
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onLoad(options: any) {
    // 推广追踪：分享卡片用 promoterId，小程序码扫码用 scene（getUnlimited）
    const pid = options.promoterId || options.scene;
    if (pid) {
      api.post('/promotion/click', { promoterId: Number(pid) }).catch(() => {})
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
      if (bg.image) {
        const absBgImg = typeof bg.image === 'string' && bg.image.startsWith('/uploads/')
          ? resolveImageUrls(bg.image)
          : bg.image
        const size = bg.size || 'cover'
        const position = bg.position || 'center center'
        const repeat = size === 'repeat' ? 'repeat' : 'no-repeat'
        bgStyle = `background:url(${absBgImg}) ${repeat} ${position}/${size}, ${bg.color || 'transparent'};`
      } else if (bg.color) {
        bgStyle = `background:${bg.color};`
      }

      const exhList = resolveImageUrls((exhibitions as any) || []) as any[]
      const actList = resolveImageUrls((activities as any) || []) as any[]
      const homeActs = actList.slice(0, 4)

      const statusMap: Record<string, { label: string; color: string }> = {
        UPCOMING: { label: '即将开始', color: '#005bac' },
        ONGOING: { label: '进行中', color: '#07c160' },
        ENDED: { label: '已结束', color: '#888888' },
      }

      homeActs.forEach(act => {
        act._startTime = formatDate(act.startTime).split(' ')[0]
        act._endTime = formatDate(act.endTime).split(' ')[0]
        const sc = statusMap[act.status] || { label: '', color: '#999' }
        act._statusLabel = sc.label
        act._statusColor = sc.color
        act._address = act.location || ''
      })
      const rawComponents = normalizeSwiperImages(resolveImageUrls(diyConfig?.components) || [])

      this.setData({
        exhibitions: exhList,
        activities: actList,
        _homeExhibitions: exhList.slice(0, 6),
        _homeActivities: homeActs,
        diyComponents: rawComponents,
        diyBackgroundStyle: bgStyle,
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // === 通用链接处理 ===
  // 支持格式:
  //   - 小程序内部路径 /pages/xxx/index  → wx.navigateTo
  //   - 其他（http链接等） → 复制到剪贴板
  handleLink(link: string) {
    if (!link) return
    if (link.startsWith('/')) {
      wx.navigateTo({ url: link })
    } else {
      wx.setClipboardData({ data: link })
    }
  },

  // === DIY 组件交互事件 ===

  onDiySwiperTap(e: any) {
    this.handleLink(e.currentTarget.dataset.link)
  },

  onFuncGridTap(e: any) {
    this.handleLink(e.currentTarget.dataset.url)
  },

  onDiyImageTap(e: any) {
    this.handleLink(e.currentTarget.dataset.link)
  },

  onMediaGridTap(e: any) {
    this.handleLink(e.currentTarget.dataset.link)
  },

  onColumnsTap(e: any) {
    this.handleLink(e.currentTarget.dataset.link)
  },

  onDiyButtonTap(e: any) {
    this.handleLink(e.currentTarget.dataset.link)
  },

  onDiyNavigationTap(e: any) {
    const { latitude, longitude, name, address } = e.currentTarget.dataset
    console.log('[导航] dataset:', { latitude, longitude, name, address })
    let lat = parseFloat(latitude)
    let lng = parseFloat(longitude)
    if (isNaN(lat) || isNaN(lng)) {
      wx.showModal({
        title: '导航调试',
        content: `坐标无效\nlat=${latitude} (${typeof latitude})\nlng=${longitude} (${typeof longitude})\nname=${name}\naddr=${address}`,
      })
      return
    }
    // 百度地图 BD-09 → 微信 GCJ-02 坐标转换
    const gcj = bd09ToGcj02(lng, lat)
    wx.showToast({ title: '正在打开地图...', icon: 'loading', duration: 1000 })
    wx.openLocation({
      latitude: gcj.lat,
      longitude: gcj.lng,
      name: name || '',
      address: address || '',
      scale: 16,
      fail: (err) => {
        console.error('[导航] openLocation 失败:', err)
        wx.showModal({ title: '打开地图失败', content: JSON.stringify(err) })
      },
    })
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
