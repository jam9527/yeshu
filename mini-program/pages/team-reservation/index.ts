/**
 * 团队预约 - 椰树集团参观预约
 * 10人以上团队，需管理员审核
 */
import api from '../../utils/api'

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

interface CalendarDay {
  dateStr: string
  day: number
  status: 'available' | 'unavailable' | 'full' | 'empty'
  data?: DateItem
}

interface TeamType {
  value: string
  label: string
}

Page({
  data: {
    /** 可选日期列表 */
    dates: [] as DateItem[],
    /** 当前选中日期 */
    selectedDate: null as DateItem | null,
    /** 当前日期的场次 */
    sessions: [] as SessionItem[],
    /** 当前选中场次 */
    selectedSession: null as SessionItem | null,
    /** 日历 */
    calendarDays: [] as CalendarDay[],
    /** 当前显示的年份和月份 */
    currentYear: 0,
    currentMonth: 0,
    currentMonthLabel: '',
    /** 参观人数 */
    visitorCount: 10,
    /** 最大可预约人数（由剩余名额决定） */
    maxVisitorCount: 999,
    /** 联系人姓名 */
    contactName: '',
    /** 联系人手机号 */
    contactPhone: '',
    /** 证件类型 */
    idCardType: 'ID_CARD',
    idCardTypeLabel: '身份证',
    idCardTypeIndex: 0,
    /** 证件号 */
    contactIdCard: '',
    /** 团队类型 */
    teamType: 'ENTERPRISE',
    /** 团队类型显示文本 */
    teamTypeLabel: '企业',
    /** 团队类型在 picker 中的索引 */
    teamTypeIndex: 0,
    /** 团队/单位名称 */
    orgName: '',
    /** 统一社会信用代码 */
    orgCode: '',
    /** 附件文件列表 */
    files: [] as { name: string; url: string }[],
    /** 当前有效的申请表模板 */
    templateInfo: null as { name: string; fileUrl: string } | null,
    /** 团队类型选项 */
    teamTypes: [
      { value: 'ENTERPRISE', label: '企业' },
      { value: 'GOVERNMENT', label: '政府/事业单位' },
      { value: 'SCHOOL', label: '学校' },
      { value: 'OTHER', label: '其他' },
    ] as Array<{ value: string; label: string }>,
    /** 证件类型选项 */
    idCardTypes: [
      { value: 'ID_CARD', label: '身份证' },
      { value: 'PASSPORT', label: '护照' },
      { value: 'HK_MO_TW', label: '港澳台通行证' },
    ] as Array<{ value: string; label: string }>,
    /** 页面加载中 */
    loading: false,
    /** 提交中 */
    submitting: false,
    /** 当前步骤 */
    currentStep: 1,
    /** 预约须知弹窗 */
    showNotice: false,
    noticeContent: '',
    agreed: false,
  },

  onLoad() {
    const now = new Date()
    this.setData({
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth(),
    })
    this.fetchNotice()
    this.fetchDates()
    this.fetchTemplate()
    this.updateTeamTypeDisplay()
  },

  async fetchNotice() {
    try {
      const res: any = await api.get('/notices/team')
      if (res?.content) {
        this.setData({ noticeContent: res.content.replace(/\n/g, '<br/>'), showNotice: true, agreed: false })
      } else {
        this.setData({ agreed: true })
      }
    } catch {
      this.setData({ agreed: true })
    }
  },

  agreeNotice() {
    this.setData({ showNotice: false, agreed: true })
  },

  /** 获取有效的申请表模板 */
  async fetchTemplate() {
    try {
      const res: any = await api.get('/config/templates/active')
      if (res?.fileUrl) {
        this.setData({
          templateInfo: { name: res.name, fileUrl: res.fileUrl },
        })
      }
    } catch (err) {
      // 没有模板或获取失败，静默处理
    }
  },

  /** 下载申请表模板 */
  downloadTemplate() {
    const { templateInfo } = this.data
    if (!templateInfo?.fileUrl) {
      wx.showToast({ title: '暂无可用模板', icon: 'none' })
      return
    }
    wx.downloadFile({
      url: templateInfo.fileUrl,
      success(res) {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
          })
        }
      },
      fail() {
        wx.showToast({ title: '下载模板失败', icon: 'none' })
      },
    })
  },

  /** 初始化团队类型显示文本 */
  updateTeamTypeDisplay() {
    const idx = this.data.teamTypes.findIndex((t) => t.value === this.data.teamType)
    if (idx >= 0) {
      this.setData({
        teamTypeIndex: idx,
        teamTypeLabel: this.data.teamTypes[idx].label,
      })
    }
  },

  /** 获取可预约日期 */
  async fetchDates() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/reservations/available-dates')
      const list: any[] = res?.records || res || []
      const dates: DateItem[] = list.map((d: any) => ({
        id: d.id,
        date: d.date,
        isAvailable: d.isAvailable,
        remainingQuota: (d.morning?.remainingTeam || 0) + (d.afternoon?.remainingTeam || 0),
        amRemaining: d.morning?.remainingTeam || 0,
        pmRemaining: d.afternoon?.remainingTeam || 0,
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

      // 过去日期不可预约（防止 API 返回过期数据导致历史日期显示为可预约）
      const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`
      if (dateStr < todayStr) {
        status = 'unavailable'
      }

      days.push({ dateStr, day: d, status, data: found })
    }

    this.setData({ calendarDays: days })
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

  /** 选择日期 */
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

  /** 根据日期构建场次 */
  buildSessions(date: DateItem): SessionItem[] {
    const sessions: SessionItem[] = []
    if (date.amRemaining > 0) {
      sessions.push({
        type: 'AM',
        label: '上午场',
        remaining: date.amRemaining,
        startTime: '09:00',
        endTime: '12:00',
      })
    }
    if (date.pmRemaining > 0) {
      sessions.push({
        type: 'PM',
        label: '下午场',
        remaining: date.pmRemaining,
        startTime: '14:00',
        endTime: '17:00',
      })
    }
    return sessions
  },

  /** 选择场次 */
  selectSession(e: any) {
    const { index } = e.currentTarget.dataset
    const session = this.data.sessions[index]
    if (!session) return

    this.setData({
      selectedSession: session,
      currentStep: 3,
      maxVisitorCount: session.remaining,
    })
  },

  onVisitorCountInput(e: any) {
    const val = parseInt(e.detail.value, 10)
    this.setData({ visitorCount: isNaN(val) ? 0 : val })
  },

  /** 返回上一步 */
  prevStep() {
    if (this.data.currentStep > 1) {
      this.setData({ currentStep: this.data.currentStep - 1 })
    }
  },

  /** 跳转指定步骤 */
  goToStep(step: number) {
    if (step < 1 || step > 3) return
    if (step === 2 && !this.data.selectedDate) return
    if (step === 3 && !this.data.selectedSession) return
    this.setData({ currentStep: step })
  },

  /** 输入联系人 */
  onContactInput(e: any) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({ [field]: value })
  },

  /** 输入团队信息 */
  onOrgInput(e: any) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    this.setData({ [field]: value })
  },

  /** 选择团队类型 */
  onTeamTypeChange(e: any) {
    const index = e.detail?.value
    const types = this.data.teamTypes
    if (index !== undefined && types[index]) {
      this.setData({
        teamType: types[index].value,
        teamTypeLabel: types[index].label,
        teamTypeIndex: index,
      })
    }
  },

  /** 选择证件类型 */
  onIdCardTypeChange(e: any) {
    const index = e.detail?.value
    const types = this.data.idCardTypes
    if (index !== undefined && types[index]) {
      this.setData({
        idCardType: types[index].value,
        idCardTypeLabel: types[index].label,
        idCardTypeIndex: index,
      })
    }
  },

  /** 从微信聊天选择文件上传 */
  async chooseFile() {
    try {
      const res = await wx.chooseMessageFile({
        count: 5,
        type: 'all',
      })
      const newFiles = [...this.data.files]
      for (const f of res.tempFiles) {
        try {
          wx.showLoading({ title: '上传中...' })
          const uploadRes: any = await api.upload('/files/upload', f.path)
          wx.hideLoading()
          newFiles.push({ name: f.name, url: uploadRes.url || uploadRes })
        } catch {
          wx.hideLoading()
          wx.showToast({ title: `${f.name} 上传失败`, icon: 'none' })
        }
      }
      this.setData({ files: newFiles })
    } catch {
      // 用户取消选择
    }
  },

  /** 删除已选文件 */
  removeFile(e: any) {
    const { index } = e.currentTarget.dataset
    const files = [...this.data.files]
    files.splice(index, 1)
    this.setData({ files })
  },

  /** 校验表单 */
  validate(): string | null {
    const { contactName, contactPhone, contactIdCard, visitorCount, orgName } = this.data

    if (!contactName.trim()) return '请输入联系人姓名'
    if (!contactPhone.trim()) return '请输入联系电话'
    if (!/^1\d{10}$/.test(contactPhone.trim())) return '联系电话格式不正确'
    if (!contactIdCard.trim()) return '请输入联系人证件号'
    if (!visitorCount || visitorCount < 10) return '团队预约人数不能少于10人'
    if (visitorCount > this.data.maxVisitorCount) return `当前场次最多可预约${this.data.maxVisitorCount}人`
    if (!orgName.trim()) return '请输入单位名称'

    return null
  },

  /** 提交预约 */
  async submit() {
    if (this.data.submitting) return

    const { selectedDate, selectedSession, visitorCount, contactName, contactPhone, idCardType, contactIdCard, teamType, orgName, orgCode, files } = this.data

    if (!selectedDate || !selectedSession) {
      wx.showToast({ title: '请选择日期和场次', icon: 'none' })
      return
    }

    const error = this.validate()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    try {
      const res: any = await api.post('/reservations/team', {
        dateConfigId: selectedDate.id,
        sessionType: selectedSession.type,
        visitorCount,
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        idCardType,
        contactIdCard: contactIdCard.trim(),
        teamType,
        orgName: orgName.trim(),
        orgCode: orgCode.trim(),
        attachmentFiles: files.length > 0 ? JSON.stringify(files.map(f => f.url)) : undefined,
      })

      const reservationId = res?.id || res?.reservationId
      wx.showToast({ title: '预约提交成功，等待审核', icon: 'success' })

      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/reservation-detail/index?id=${reservationId}`,
        })
      }, 1500)
    } catch (err) {
      console.error('提交团队预约失败', err)
    } finally {
      this.setData({ submitting: false })
    }
  },
})
