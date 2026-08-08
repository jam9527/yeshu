/**
 * 自定义 tabBar - 4 个 tab
 * 本小程序页面（首页 / 快捷检票 / 我的）+「椰树商城」点击跳转另一小程序。
 * 顺序：首页 / 快捷检票 / 椰树商城 / 我的。
 * 原因：微信原生 tabBar 无法跳转其他小程序，只能在点击事件里调 wx.navigateToMiniProgram。
 * 选中态由各 tab 页面在 onShow 里通过 this.getTabBar().setData({ selected }) 同步。
 */
interface TabItem {
  pagePath: string
  text: string
  iconPath: string
  selectedIconPath: string
  isMall?: boolean
}

Component({
  data: {
    /** 当前选中的 tab 下标（0 首页 / 1 快捷检票 / 3 我的） */
    selected: 0,
    list: [
      {
        pagePath: '/pages/home/index',
        text: '首页',
        iconPath: '/assets/icons/home.png',
        selectedIconPath: '/assets/icons/home-active.png',
      },
      {
        pagePath: '/pages/quick-check/index',
        text: '快捷检票',
        iconPath: '/assets/icons/quick-check.png',
        selectedIconPath: '/assets/icons/quick-check-active.png',
      },
      {
        pagePath: '',
        text: '椰树商城',
        iconPath: '/assets/icons/mall.png',
        selectedIconPath: '/assets/icons/mall-active.png',
        isMall: true,
      },
      {
        pagePath: '/pages/profile/index',
        text: '我的',
        iconPath: '/assets/icons/profile.png',
        selectedIconPath: '/assets/icons/profile-active.png',
      },
    ] as TabItem[],
  },

  methods: {
    switchTab(e: any) {
      const index = e.currentTarget.dataset.index as number
      const item = this.data.list[index]
      if (!item) return

      // 商城 tab：跳转椰树商城小程序
      if (item.isMall) {
        wx.navigateToMiniProgram({
          appId: 'wx65be4a4d436b7d2c',
          path: 'pages/home/index',
          fail: () => {
            console.error('[商城跳转失败]', e)
            wx.showToast({ title: '打开商城失败，请稍后重试', icon: 'none' })
          },
        })
        return
      }

      wx.switchTab({ url: item.pagePath })
    },
  },
})
