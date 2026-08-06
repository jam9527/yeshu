import api from '../../utils/api'

interface DateItem {
  id: string
  date: string
  isAvailable: boolean
  remainingQuota: number
  amRemaining: number
  pmRemaining: number
  evRemaining: number
  amEnabled: boolean
  pmEnabled: boolean
  evEnabled: boolean
  amStartTime: string
  amEndTime: string
  pmStartTime: string
  pmEndTime: string
  evStartTime: string
  evEndTime: string
}

interface SessionItem {
  type: string
  label: string
  remaining: number
  startTime: string
  endTime: string
}

interface CalendarDay {
  dateStr: string
  day: number
  status: 'available' | 'unavailable' | 'full' | 'empty'
  data?: DateItem
}

Page({
  data: {
    dates: [] as DateItem[],
    selectedDate: null as DateItem | null,
    sessions: [] as SessionItem[],
    selectedSession: null as SessionItem | null,
    /** 参观总人数（含本人，1-5人） */
    visitorCount: 1,
    loading: false,
    submitting: false,
    currentStep: 1,
    /** 日历 */
    calendarDays: [] as CalendarDay[],
    currentYear: 0,
    currentMonth: 0,
    currentMonthLabel: '',
    /** 预约须知弹窗 */
    showNotice: false,
    noticeContent: '',
    countdown: 5,
    agreed: false,
    countdownTimer: null as any,
    /** 本人实名核验未通过，阻止提交 */
    realNameBlocked: false,
    /** 购票须知（后台可配置，显示在日历下方） */
    ticketingNotice: '',
    /** 行政分区 ['省', '市', '区'] */
    district: [] as string[],
    /** 岛内/岛外 */
    visitorType: '' as string,
    /** 12岁以下儿童人数 */
    childrenCount: 0,
    /** 推广人邀请码 */
    promoterCode: '',
    /** 邀请码联系弹窗 */
    showInvitePopup: false,
    invitePopupTitle: '',
    invitePopupSegments: [] as Array<{ key: string; type: 'text' | 'phone'; value: string }>,
  },

  onLoad() {
    const app = getApp()
    if (!app.globalData.token) {
      app.globalData.pendingRedirect = '/' + (this.route || 'pages/personal-reservation/index')
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
    })
    this.fetchNotice()
    this.fetchDates()
    this.checkRealNameStatus()
    this.fetchInviteContact()
  },

  onShow() {
    // 从实名认证页面返回时，重新检查实名状态
    this.checkRealNameStatus()
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
  },

  async fetchNotice() {
    try {
      const [noticeRes, ticketingRes] = await Promise.all([
        api.get('/notices/personal'),
        api.get('/notices/TICKETING'),
      ])
      if ((noticeRes as any)?.content) {
        this.setData({ noticeContent: (noticeRes as any).content.replace(/\n/g, '<br/>'), showNotice: true, agreed: false, countdown: 5 })
        this.startCountdown()
      } else {
        this.setData({ agreed: true })
      }
      if ((ticketingRes as any)?.content) {
        this.setData({ ticketingNotice: (ticketingRes as any).content })
      }
    } catch {
      this.setData({ agreed: true })
    }
  },

  startCountdown() {
    const timer = setInterval(() => {
      const { countdown } = this.data
      if (countdown <= 1) {
        clearInterval(timer)
        this.setData({ countdown: 0, countdownTimer: null })
      } else {
        this.setData({ countdown: countdown - 1 })
      }
    }, 1000)
    this.setData({ countdownTimer: timer })
  },

  agreeNotice() {
    if (this.data.countdown > 0) return
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
    this.setData({ showNotice: false, agreed: true, countdownTimer: null })
  },

  /** 加载邀请码联系弹窗内容 */
  async fetchInviteContact() {
    try {
      const res: any = await api.get('/notices/INVITE_CODE_CONTACT')
      if (res?.content) {
        const data = JSON.parse(res.content)
        this.setData({
          invitePopupTitle: data.title || '联系我们',
          invitePopupSegments: this.parseInviteContact(data.content || ''),
        })
      }
    } catch { /* 静默处理 */ }
  },

  /** 解析联系内容，将手机号/座机号拆分为可拨号片段 */
  parseInviteContact(content: string) {
    const segments: Array<{ key: string; type: 'text' | 'phone'; value: string }> = []
    const phoneRe = /(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})/g
    let lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = phoneRe.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ key: `seg-${segments.length}`, type: 'text', value: content.slice(lastIndex, match.index) })
      }
      segments.push({ key: `seg-${segments.length}`, type: 'phone', value: match[0] })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < content.length) {
      segments.push({ key: `seg-${segments.length}`, type: 'text', value: content.slice(lastIndex) })
    }
    if (segments.length === 0) {
      segments.push({ key: 'seg-0', type: 'text', value: content })
    }
    return segments
  },

  /** 拨打邀请码联系弹窗中的电话号码 */
  callInvitePhone(e: any) {
    const phone = e.currentTarget.dataset.phone
    if (!phone) return
    wx.makePhoneCall({
      phoneNumber: String(phone).replace(/\D/g, ''),
      fail: () => {
        wx.showToast({ title: '拨号失败', icon: 'none' })
      },
    })
  },

  /** 显示邀请码联系弹窗 */
  showInviteContact() {
    this.setData({ showInvitePopup: true })
  },

  /** 关闭邀请码联系弹窗 */
  closeInvitePopup() {
    this.setData({ showInvitePopup: false })
  },

  /** 仅检查本人是否已有核验通过的实名记录 */
  async checkRealNameStatus() {
    try {
      const res: any = await api.get('/real-names')
      const allList: any[] = res?.records || res || []
      const hasVerified = allList.some((item) => item.idVerified === true)
      this.setData({ realNameBlocked: !hasVerified })
    } catch {
      // ignore
    }
  },

  async fetchDates() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/reservations/available-dates')
      const list: any[] = res?.records || res || []
      const dates: DateItem[] = list.map((d: any) => ({
        id: d.id,
        date: d.date,
        isAvailable: d.isAvailable,
        remainingQuota: (d.morning?.remainingPersonal || 0) + (d.afternoon?.remainingPersonal || 0) + (d.evening?.remainingPersonal || 0),
        amRemaining: d.morning?.remainingPersonal || 0,
        pmRemaining: d.afternoon?.remainingPersonal || 0,
        evRemaining: d.evening?.remainingPersonal || 0,
        amEnabled: d.morning?.enabled !== false,
        amStartTime: d.morning?.startTime || '09:00',
        amEndTime: d.morning?.endTime || '12:00',
        pmEnabled: d.afternoon?.enabled !== false,
        pmStartTime: d.afternoon?.startTime || '14:00',
        pmEndTime: d.afternoon?.endTime || '17:00',
        evEnabled: d.evening?.enabled !== false,
        evStartTime: d.evening?.startTime || '19:00',
        evEndTime: d.evening?.endTime || '21:00',
      }))
      this.setData({ dates })

      if (dates.length > 0) {
        const today = new Date()
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
        const firstFutureDate = dates.find((d: DateItem) => d.date >= todayStr)
        if (firstFutureDate) {
          const firstDate = new Date(firstFutureDate.date)
          const firstYear = firstDate.getFullYear()
          const firstMonth = firstDate.getMonth()
          const curYear = this.data.currentYear
          const curMonth = this.data.currentMonth
          if (firstYear > curYear || (firstYear === curYear && firstMonth > curMonth)) {
            this.setData({
              currentYear: firstYear,
              currentMonth: firstMonth,
            })
          }
        }
      }
      this.buildCalendar(dates)
    } catch (err) {
      console.error('获取可预约日期失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  buildCalendar(dates: DateItem[]) {
    const year = this.data.currentYear
    const month = this.data.currentMonth
    if (!year || !month) return

    this.setData({ currentMonthLabel: `${year}年${String(month + 1).padStart(2, '0')}月` })

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const totalDays = lastDay.getDate()

    const dateMap: Record<string, DateItem> = {}
    dates.forEach(d => { dateMap[d.date] = d })

    const days: CalendarDay[] = []

    for (let i = 0; i < startPad; i++) {
      days.push({ dateStr: '', day: 0, status: 'empty' })
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const found = dateMap[dateStr]

      let status: CalendarDay['status'] = 'unavailable'
      if (found && found.isAvailable && found.remainingQuota > 0) {
        status = 'available'
      } else if (found && found.isAvailable && found.remainingQuota <= 0) {
        status = 'full'
      }

      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      if (dateStr < todayStr) {
        status = 'unavailable'
      }

      days.push({
        dateStr,
        day: d,
        status,
        data: found,
      })
    }

    this.setData({ calendarDays: days })
  },

  selectDate(e: any) {
    const { index } = e.currentTarget.dataset
    const day = this.data.calendarDays[index]
    if (!day || day.status !== 'available' || !day.data) return

    this.setData({
      selectedDate: day.data,
      selectedSession: null,
      sessions: this.buildSessions(day.data),
      currentStep: 2,
      district: [],
      visitorType: '',
      childrenCount: 0,
      promoterCode: '',
    })
  },

  prevMonth() {
    const { currentYear, currentMonth, dates } = this.data
    let newMonth = currentMonth - 1
    let newYear = currentYear
    if (newMonth < 0) { newMonth = 11; newYear-- }
    this.setData({ currentYear: newYear, currentMonth: newMonth })
    this.buildCalendar(dates)
  },

  nextMonth() {
    const { currentYear, currentMonth, dates } = this.data
    let newMonth = currentMonth + 1
    let newYear = currentYear
    if (newMonth > 11) { newMonth = 0; newYear++ }
    this.setData({ currentYear: newYear, currentMonth: newMonth })
    this.buildCalendar(dates)
  },

  buildSessions(date: DateItem): SessionItem[] {
    const sessions: SessionItem[] = []
    if (date.amEnabled) {
      sessions.push({
        type: 'AM',
        label: '上午场',
        remaining: date.amRemaining,
        startTime: date.amStartTime,
        endTime: date.amEndTime,
      })
    }
    if (date.pmEnabled) {
      sessions.push({
        type: 'PM',
        label: '下午场',
        remaining: date.pmRemaining,
        startTime: date.pmStartTime,
        endTime: date.pmEndTime,
      })
    }
    if (date.evEnabled) {
      sessions.push({
        type: 'EV',
        label: '夜场',
        remaining: date.evRemaining,
        startTime: date.evStartTime,
        endTime: date.evEndTime,
      })
    }
    return sessions
  },

  selectSession(e: any) {
    const { index } = e.currentTarget.dataset
    const session = this.data.sessions[index]
    if (!session) return

    this.setData({
      selectedSession: session,
      currentStep: 3,
    })
  },

  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    }
  },

  onVisitorCountChange(e: any) {
    let count = parseInt(e.currentTarget.dataset.value, 10)
    if (isNaN(count) || count < 1) count = 1
    if (count > 5) count = 5
    // 如果新总人数 <= 儿童人数，clamp 儿童人数
    let childrenCount = this.data.childrenCount
    if (childrenCount >= count) childrenCount = count - 1
    this.setData({ visitorCount: count, childrenCount })
  },

  onDistrictChange(e: any) {
    this.setData({ district: e.detail.value })
  },

  onVisitorTypeChange(e: any) {
    const value = e.currentTarget.dataset.value
    this.setData({ visitorType: this.data.visitorType === value ? '' : value })
  },

  onChildrenCountChange(e: any) {
    let count = parseInt(e.currentTarget.dataset.value, 10)
    if (isNaN(count) || count < 0) count = 0
    const max = this.data.visitorCount - 1
    if (count > max) count = max
    this.setData({ childrenCount: count })
  },

  onPromoterCodeInput(e: any) {
    this.setData({ promoterCode: e.detail.value })
  },

  goToRealName() {
    wx.navigateTo({ url: '/pages/real-name-list/index' })
  },

  async submit() {
    if (this.data.submitting) return

    // 本人未实名核验通过的不允许提交
    if (this.data.realNameBlocked) {
      wx.showModal({
        title: '实名认证提示',
        content: '请先完成实名认证（身份核验通过）后再进行预约',
        confirmText: '去认证',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/real-name-list/index' })
          }
        },
      })
      return
    }

    const { selectedDate, selectedSession, visitorCount } = this.data
    if (!selectedDate || !selectedSession) {
      wx.showToast({ title: '请选择日期和场次', icon: 'none' })
      return
    }

    if (visitorCount < 1 || visitorCount > 5) {
      wx.showToast({ title: '参观人数应在1-5人之间', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      if (!this.data.promoterCode.trim()) {
        wx.showToast({ title: '请输入推广邀请码', icon: 'none' })
        this.setData({ submitting: false })
        return
      }

      const res: any = await api.post('/reservations/personal', {
        dateConfigId: selectedDate.id,
        sessionType: selectedSession.type,
        visitorCount: this.data.visitorCount,
        district: this.data.district.length > 0 ? this.data.district.join('-') : undefined,
        visitorType: this.data.visitorType || undefined,
        childrenCount: this.data.childrenCount,
        promoterCode: this.data.promoterCode.trim(),
      })

      const reservationId = res?.id || res?.reservationId
      wx.showToast({ title: '预约成功', icon: 'success' })

      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/reservation-detail/index?id=${reservationId}`,
        })
      }, 1500)
    } catch (err) {
      console.error('提交预约失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },
})
