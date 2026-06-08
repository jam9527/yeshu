import api from '../../utils/api'

interface Visitor {
  name: string
  idCard: string
  province: string
  city: string
}

interface DateItem {
  id: string
  date: string
  isAvailable: boolean
  remainingQuota: number
  amRemaining: number
  pmRemaining: number
}

interface SessionItem {
  type: string
  label: string
  remaining: number
  startTime: string
  endTime: string
}

interface RealNameItem {
  id: string
  name: string
  idCard: string
  idVerified?: boolean
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
    visitorCount: 1,
    visitors: [{ name: '', idCard: '', province: '', city: '' }] as Visitor[],
    /** 省份列表 */
    provinces: [] as string[],
    /** 各参观人对应的城市列表（二维，index 对应参观人顺序） */
    pickerCities: [] as string[][],
    realNames: [] as RealNameItem[],
    loading: false,
    submitting: false,
    currentStep: 1,
    showRealNamePicker: false,
    editingVisitorIndex: -1,
    /** 日历 */
    calendarDays: [] as CalendarDay[],
    /** 当前显示的年份和月份 */
    currentYear: 0,
    currentMonth: 0,
    currentMonthLabel: '',
    /** 预约须知弹窗 */
    showNotice: false,
    noticeContent: '',
    countdown: 5,
    agreed: false,
    countdownTimer: null as any,
    /** 实名核验未通过，阻止提交 */
    realNameBlocked: false,
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
    })
    this.fetchNotice()
    this.fetchDates()
    this.fetchRealNames()
    this.fetchProvinces()
  },

  onUnload() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer)
    }
  },

  async fetchNotice() {
    try {
      const res: any = await api.get('/notices/personal')
      if (res?.content) {
        this.setData({ noticeContent: res.content.replace(/\n/g, '<br/>'), showNotice: true, agreed: false, countdown: 5 })
        this.startCountdown()
      } else {
        // 没有配置须知内容，直接跳过
        this.setData({ agreed: true })
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

  async fetchDates() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/reservations/available-dates')
      const list: any[] = res?.records || res || []
      const dates: DateItem[] = list.map((d: any) => ({
        id: d.id,
        date: d.date,
        isAvailable: d.isAvailable,
        remainingQuota: (d.morning?.remainingPersonal || 0) + (d.afternoon?.remainingPersonal || 0),
        amRemaining: d.morning?.remainingPersonal || 0,
        pmRemaining: d.afternoon?.remainingPersonal || 0,
      }))
      this.setData({ dates })

      // 如果当前月份无可预约日期，自动跳转到第一个有可用日期的未来月份
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
          // 只向前跳转，不向后跳转到已过去的月份
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
    const startPad = firstDay.getDay() // 0=Sun
    const totalDays = lastDay.getDate()

    const dateMap: Record<string, DateItem> = {}
    dates.forEach(d => { dateMap[d.date] = d })

    const days: CalendarDay[] = []

    // Empty cells before first day
    for (let i = 0; i < startPad; i++) {
      days.push({ dateStr: '', day: 0, status: 'empty' })
    }

    // Calendar days — availability controlled by admin panel, no hardcoded closure
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const found = dateMap[dateStr]

      let status: CalendarDay['status'] = 'unavailable'
      if (found && found.isAvailable && found.remainingQuota > 0) {
        status = 'available'
      } else if (found && found.isAvailable && found.remainingQuota <= 0) {
        status = 'full'
      }

      // 过去日期不可预约（防止 API 返回过期数据导致历史日期显示为可预约）
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

  async fetchRealNames() {
    try {
      const res: any = await api.get('/real-names')
      const allList: RealNameItem[] = res?.records || res || []
      // 只保留身份核验通过的实名记录
      const verifiedList = allList.filter(
        (item) => item.idVerified === true,
      )
      this.setData({ realNames: verifiedList })

      if (verifiedList.length === 0) {
        this.setData({ realNameBlocked: true })
      }
    } catch {
      // ignore
    }
  },

  async fetchProvinces() {
    try {
      const res: any = await api.get('/regions/provinces')
      const provinces: string[] = res || []
      this.setData({ provinces })
    } catch {
      // ignore
    }
  },

  /** 省份选择 */
  async onProvinceChange(e: any) {
    const { index } = e.currentTarget.dataset
    const provinceIdx = e.detail.value as number
    const province = this.data.provinces[provinceIdx]
    if (!province) return

    // 获取该省份的城市列表
    try {
      const res: any = await api.get('/regions/cities', { province })
      const cities: string[] = res || []
      const pickerCities = [...this.data.pickerCities]
      pickerCities[index] = cities
      const key = `visitors[${index}]`
      this.setData({
        [key]: { ...this.data.visitors[index], province, city: cities[0] || '' },
        pickerCities,
      })
    } catch {
      // ignore
    }
  },

  /** 城市选择 */
  onCityChange(e: any) {
    const { index } = e.currentTarget.dataset
    const cityIdx = e.detail.value as number
    const cities = this.data.pickerCities[index] || []
    const city = cities[cityIdx]
    if (!city) return
    const key = `visitors[${index}]`
    this.setData({ [key]: { ...this.data.visitors[index], city } })
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
    // 上午场
    sessions.push({
      type: 'AM',
      label: '上午场',
      remaining: date.amRemaining,
      startTime: '09:00',
      endTime: '12:00',
    })
    // 下午场
    sessions.push({
      type: 'PM',
      label: '下午场',
      remaining: date.pmRemaining,
      startTime: '14:00',
      endTime: '17:00',
    })
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

    const visitors = [...this.data.visitors]
    const pickerCities = [...this.data.pickerCities]
    while (visitors.length < count) {
      visitors.push({ name: '', idCard: '', province: '', city: '' })
      pickerCities.push([])
    }
    while (visitors.length > count) {
      visitors.pop()
      pickerCities.pop()
    }

    this.setData({ visitorCount: count, visitors, pickerCities })
  },

  goToRealName() {
    wx.navigateTo({ url: '/pages/real-name-list/index' })
  },

  onVisitorInput(e: any) {
    const { index, field } = e.currentTarget.dataset
    const { value } = e.detail
    const key = `visitors[${index}].${field}`
    this.setData({ [key]: value })
  },

  openRealNamePicker(e: any) {
    const { index } = e.currentTarget.dataset
    this.setData({
      showRealNamePicker: true,
      editingVisitorIndex: index,
    })
  },

  closeRealNamePicker() {
    this.setData({
      showRealNamePicker: false,
      editingVisitorIndex: -1,
    })
  },

  selectRealName(e: any) {
    const { index } = e.currentTarget.dataset
    const realName = this.data.realNames[index]
    if (!realName || this.data.editingVisitorIndex < 0) return

    const visitorIndex = this.data.editingVisitorIndex
    const key = `visitors[${visitorIndex}]`
    this.setData({
      [key]: {
        name: realName.name,
        idCard: realName.idCard,
        province: this.data.visitors[visitorIndex]?.province || '',
        city: this.data.visitors[visitorIndex]?.city || '',
      },
      showRealNamePicker: false,
      editingVisitorIndex: -1,
    })
  },

  validateVisitors(): string | null {
    const { visitors } = this.data
    for (let i = 0; i < visitors.length; i++) {
      const v = visitors[i]
      if (!v.name.trim()) return `请输入第 ${i + 1} 位参观人的姓名`
      if (!v.idCard.trim()) return `请输入第 ${i + 1} 位参观人的身份证号`
      if (v.idCard.trim().length !== 18 && v.idCard.trim().length !== 15) {
        return `第 ${i + 1} 位参观人的身份证号格式不正确`
      }
      if (!v.province.trim()) return `请输入第 ${i + 1} 位参观人的省份`
      if (!v.city.trim()) return `请输入第 ${i + 1} 位参观人的城市`
    }
    return null
  },

  async submit() {
    if (this.data.submitting) return

    // 未实名核验通过的不允许提交
    if (this.data.realNameBlocked) {
      wx.showModal({
        title: '实名认证提示',
        content: '请先完成实名认证（身份核验通过）后再进行个人预约',
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

    const { selectedDate, selectedSession, visitors } = this.data
    if (!selectedDate || !selectedSession) {
      wx.showToast({ title: '请选择日期和场次', icon: 'none' })
      return
    }

    const error = this.validateVisitors()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const res: any = await api.post('/reservations/personal', {
        dateConfigId: selectedDate.id,
        sessionType: selectedSession.type,
        visitors: visitors.map((v) => ({
          name: v.name.trim(),
          idCard: v.idCard.trim(),
          province: v.province.trim(),
          city: v.city.trim(),
        })),
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
