/**
 * 预约详情 - 展示预约详细信息
 * 包含参观人列表、团队信息、QR码核销
 */
import api from '../../utils/api'

interface Visitor {
  id?: string
  name: string
  idCard: string
  province: string
  city: string
}

interface TeamInfo {
  contactName: string
  contactPhone: string
  teamType: string
  teamTypeLabel: string
  orgName: string
  orgCode?: string
}

interface ReservationData {
  id: string
  reservationNo: string
  date: string
  sessionType: string
  sessionLabel: string
  type: string
  typeLabel: string
  status: string
  statusLabel: string
  visitorCount: number
  qrCode?: string
  qrCodeUrl?: string
  visitors: Visitor[]
  teamInfo?: TeamInfo
  createTime: string
  rejectReason?: string
}

Page({
  data: {
    /** 预约详情 */
    reservation: null as ReservationData | null,
    /** 加载中 */
    loading: true,
    /** 是否显示二维码 */
    showQrCode: false,
    /** 二维码图片base64 */
    qrCodeImage: '',
  },

  onLoad(options: any) {
    const id = options?.id
    if (id) {
      this.fetchDetail(id)
    } else {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
    }
  },

  /** 获取预约详情 */
  async fetchDetail(id: string) {
    this.setData({ loading: true })
    try {
      const res: any = await api.get(`/reservations/${id}`)
      const raw = res || {}

      const reservation: ReservationData = {
        id: raw.id,
        reservationNo: raw.reservationNo,
        date: raw.reservationDate || raw.date || raw.visitDate,
        sessionType: raw.sessionType,
        sessionLabel: raw.sessionType === 'AM' ? '上午场' : '下午场',
        type: raw.type || raw.reservationType,
        typeLabel: this.getTypeLabel(raw.type || raw.reservationType),
        status: raw.status,
        statusLabel: this.getStatusLabel(raw.status),
        visitorCount: raw.visitorCount,
        qrCode: raw.qrCode,
        qrCodeUrl: (getApp() as any).globalData.baseUrl + '/reservations/' + raw.id + '/qrcode',
        visitors: (raw.visitors || raw.visitorList || []).map((v: any) => ({
          id: v.id,
          name: v.name,
          idCard: v.idCard,
          province: v.province,
          city: v.city,
        })),
        createTime: raw.createTime || raw.createdAt,
        rejectReason: raw.rejectReason,
      }

      // 团队预约信息 — 从 teamInfo 嵌套对象读取
      if (reservation.type === 'TEAM' && raw.teamInfo) {
        reservation.teamInfo = {
          contactName: raw.teamInfo.contactName || '',
          contactPhone: raw.teamInfo.contactPhone || '',
          teamType: raw.teamInfo.teamType || '',
          teamTypeLabel: this.getTeamTypeLabel(raw.teamInfo.teamType),
          orgName: raw.teamInfo.orgName || '',
          orgCode: raw.teamInfo.orgCode || '',
        }
      }

      const shouldShowQr = ['APPROVED', 'PENDING', 'VERIFIED'].includes(raw.status)
      this.setData({
        reservation,
        showQrCode: shouldShowQr,
      })

      // 加载二维码图片（使用 arraybuffer base64 避免域名白名单问题）
      if (shouldShowQr) {
        this.loadQrCodeImage(raw.id)
      }
    } catch (err) {
      console.error('获取预约详情失败', err)
      wx.showToast({ title: '获取详情失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 加载二维码图片（arraybuffer → base64，规避域名白名单限制） */
  loadQrCodeImage(id: string) {
    const baseUrl = (getApp() as any).globalData.baseUrl
    const url = `${baseUrl}/reservations/${id}/qrcode`

    wx.request({
      url,
      responseType: 'arraybuffer',
      success: (res) => {
        const arrayBuffer = res.data as ArrayBuffer
        const base64 = wx.arrayBufferToBase64(arrayBuffer)
        this.setData({ qrCodeImage: `data:image/png;base64,${base64}` })
      },
      fail: () => {
        console.error('加载二维码图片失败')
      },
    })
  },

  /** 取消预约 */
  cancelReservation() {
    const { reservation } = this.data
    if (!reservation) return

    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？取消后不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })
            await api.put(`/reservations/${reservation.id}/cancel`)
            wx.hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            // 重新加载详情
            this.fetchDetail(reservation.id)
          } catch (err) {
            wx.hideLoading()
            console.error('取消预约失败', err)
          }
        }
      },
    })
  },

  /** 返回列表 */
  goBack() {
    wx.navigateBack()
  },

  /** 判断是否可取消 */
  canCancel(): boolean {
    const { reservation } = this.data
    if (!reservation) return false
    return ['APPROVING', 'APPROVED', 'PENDING'].includes(reservation.status)
  },

  /** 判断是否显示二维码（个人预约PENDING即待核销，团队预约APPROVED才待核销） */
  canShowQrCode(): boolean {
    const { reservation } = this.data
    if (!reservation) return false
    return reservation.status === 'APPROVED' || reservation.status === 'VERIFIED' || reservation.status === 'PENDING'
  },

  /** 获取状态文本 */
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      APPROVING: '待审核',
      APPROVED: '待核销',
      VERIFIED: '已完成',
      CANCELLED: '已取消',
      REJECTED: '已拒绝',
      PENDING: '待核销',
    }
    return map[status] || status
  },

  /** 获取预约类型文本 */
  getTypeLabel(type: string): string {
    const map: Record<string, string> = {
      PERSONAL: '个人预约',
      TEAM: '团队预约',
    }
    return map[type] || type
  },

  /** 获取团队类型文本 */
  getTeamTypeLabel(type: string): string {
    const map: Record<string, string> = {
      ENTERPRISE: '企业',
      GOVERNMENT: '政府/事业单位',
      SCHOOL: '学校',
      OTHER: '其他',
    }
    return map[type] || type
  },
})
