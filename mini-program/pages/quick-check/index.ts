/**
 * 快捷检票 - 展示最新待核销预约的二维码
 * 方便用户快速出示核销码
 */
import api from '../../utils/api'

interface ActiveReservation {
  id: string
  reservationNo: string
  date: string
  sessionType: string
  sessionLabel: string
  type: string
  typeLabel: string
  status: string
  visitorCount: number
  qrCode?: string
  qrCodeUrl?: string
}

Page({
  data: {
    /** 当前有效的预约 */
    reservation: null as ActiveReservation | null,
    /** 加载中 */
    loading: true,
    /** 倒计时刷新 */
    countdown: 0,
  },

  onShow() {
    // 同步自定义 tabBar 选中态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    const app = getApp()
    if (!app.globalData.token) {
      app.globalData.pendingRedirect = '/' + (this.route || 'pages/quick-check/index')
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    this.fetchActiveReservation()
  },

  onHide() {
    this.clearCountdown()
  },

  onUnload() {
    this.clearCountdown()
  },

  /** 获取最新的待核销预约 */
  async fetchActiveReservation() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/reservations/my', {
        page: 1,
        pageSize: 1,
        status: 'PENDING,APPROVED',
      })

      const records = res?.records || res?.list || []
      if (records.length > 0) {
        const raw = records[0]
        const reservation: ActiveReservation = {
          id: raw.id,
          reservationNo: raw.reservationNo,
          date: raw.date || raw.visitDate,
          sessionType: raw.sessionType,
          sessionLabel: raw.sessionType === 'AM' ? '上午场' : raw.sessionType === 'PM' ? '下午场' : '夜场',
          type: raw.type || raw.reservationType,
          typeLabel: this.getTypeLabel(raw.type || raw.reservationType),
          status: raw.status,
          visitorCount: raw.visitorCount,
          qrCode: raw.qrCode || raw.qrCodeUrl,
          qrCodeUrl: (getApp() as any).globalData.baseUrl + '/reservations/' + raw.id + '/qrcode',
        }

        this.setData({ reservation })
        this.startCountdown()
      } else {
        // 没有待核销预约，尝试获取待审核的
        const approvingRes: any = await api.get('/reservations/my', {
          page: 1,
          pageSize: 1,
          status: 'APPROVING',
        })
        const approvingRecords = approvingRes?.records || approvingRes?.list || []
        if (approvingRecords.length > 0) {
          const raw = approvingRecords[0]
          const reservation: ActiveReservation = {
            id: raw.id,
            reservationNo: raw.reservationNo,
            date: raw.date || raw.visitDate,
            sessionType: raw.sessionType,
            sessionLabel: raw.sessionType === 'AM' ? '上午场' : raw.sessionType === 'PM' ? '下午场' : '夜场',
            type: raw.type || raw.reservationType,
            typeLabel: this.getTypeLabel(raw.type || raw.reservationType),
            status: raw.status,
            visitorCount: raw.visitorCount,
          }
          this.setData({ reservation })
        } else {
          this.setData({ reservation: null })
        }
      }
    } catch (err) {
      console.error('获取最新预约失败', err)
      this.setData({ reservation: null })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 手动刷新 */
  refresh() {
    this.fetchActiveReservation()
  },

  /** 开始倒计时刷新（每30秒刷新一次） */
  startCountdown() {
    this.clearCountdown()
    this.setData({ countdown: 30 })

    this._timer = setInterval(() => {
      if (this.data.countdown <= 1) {
        this.fetchActiveReservation()
      } else {
        this.setData({ countdown: this.data.countdown - 1 })
      }
    }, 1000)
  },

  /** 清除倒计时 */
  clearCountdown() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  /** 跳转预约列表 */
  goMyReservations() {
    wx.switchTab({ url: '/pages/profile/index' })
  },

  /** 跳转个人预约 */
  goPersonalReservation() {
    wx.navigateTo({ url: '/pages/personal-reservation/index' })
  },

  /** 获取类型文本 */
  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      PERSONAL: '个人预约',
      TEAM: '团队预约',
    }
    return map[type] || type
  },
})
