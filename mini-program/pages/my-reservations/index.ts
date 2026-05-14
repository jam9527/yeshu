/**
 * 我的预约 - 预约记录列表
 * 支持状态筛选、分页加载、取消预约
 */
import api from '../../utils/api'

interface StatusTab {
  label: string
  value: string
}

interface ReservationItem {
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
  contactName?: string
}

Page({
  data: {
    /** 预约记录列表 */
    records: [] as ReservationItem[],
    /** 总数 */
    total: 0,
    /** 当前页 */
    page: 1,
    /** 每页条数 */
    pageSize: 10,
    /** 状态筛选 */
    statusFilter: '',
    /** 类型筛选 */
    typeFilter: '',
    /** 类型标签页 */
    typeTabs: [
      { label: '全部', value: '' },
      { label: '个人', value: 'PERSONAL' },
      { label: '团队', value: 'TEAM' },
    ] as StatusTab[],
    /** 加载中 */
    loading: false,
    /** 加载更多中 */
    loadingMore: false,
    /** 是否还有更多 */
    hasMore: true,
    /** 状态标签页（PENDING = 个人预约待核销，APPROVED = 团队预约待核销） */
    statusTabs: [
      { label: '全部', value: '' },
      { label: '待核销', value: 'PENDING,APPROVED' },
      { label: '待审核', value: 'APPROVING' },
      { label: '已完成', value: 'VERIFIED' },
      { label: '已取消', value: 'CANCELLED' },
    ] as StatusTab[],
  },

  onLoad() {
    this.fetchData()
  },

  onShow() {
    // 从详情页返回时刷新
    if (this.data.records.length > 0) {
      this.refreshData()
    }
    // 清除未读通知标记
    api.put('/notifications/read-all').catch(() => {})
  },

  /** 刷新数据 */
  async refreshData() {
    this.setData({ page: 1, records: [], hasMore: true })
    await this.fetchData()
  },

  /** 获取预约列表 */
  async fetchData() {
    const { page, pageSize, statusFilter, typeFilter } = this.data
    const isFirstPage = page === 1

    this.setData({ loading: isFirstPage, loadingMore: !isFirstPage })
    try {
      const params: any = { page, pageSize }
      if (statusFilter) {
        params.status = statusFilter
      }
      if (typeFilter) {
        params.type = typeFilter
      }
      const res: any = await api.get('/reservations/my', params)

      const records: ReservationItem[] = (res?.records || res?.list || []).map(
        (r: any) => ({
          id: r.id,
          reservationNo: r.reservationNo,
          date: r.date || r.visitDate,
          sessionType: r.sessionType,
          sessionLabel: r.sessionType === 'AM' ? '上午场' : '下午场',
          type: r.type || r.reservationType,
          typeLabel: this.getTypeLabel(r.type || r.reservationType),
          status: r.status,
          statusLabel: this.getStatusLabel(r.status),
          visitorCount: r.visitorCount,
          contactName: r.contactName,
        })
      )

      const total = res?.total || res?.totalCount || records.length

      this.setData({
        records: isFirstPage ? records : [...this.data.records, ...records],
        total,
        hasMore: this.data.records.length + records.length < total,
        page: isFirstPage ? 2 : page + 1,
      })
    } catch (err) {
      console.error('获取预约列表失败', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false, loadingMore: false })
    }
  },

  /** 切换状态筛选 */
  onStatusTab(e: any) {
    const { value } = e.currentTarget.dataset
    if (value === this.data.statusFilter) return
    this.setData(
      { statusFilter: value, page: 1, records: [], hasMore: true },
      () => {
        this.fetchData()
      }
    )
  },

  /** 切换类型筛选 */
  onTypeTab(e: any) {
    const { value } = e.currentTarget.dataset
    if (value === this.data.typeFilter) return
    this.setData(
      { typeFilter: value, page: 1, records: [], hasMore: true },
      () => {
        this.fetchData()
      }
    )
  },

  /** 加载更多 */
  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return
    this.fetchData()
  },

  /** 跳转详情 */
  goDetail(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/reservation-detail/index?id=${id}` })
  },

  /** 取消预约 */
  cancelReservation(e: any) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认取消',
      content: '确定要取消该预约吗？取消后不可恢复。',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '取消中...' })
            await api.put(`/reservations/${id}/cancel`)
            wx.hideLoading()
            wx.showToast({ title: '已取消', icon: 'success' })
            this.refreshData()
          } catch (err) {
            wx.hideLoading()
            console.error('取消预约失败', err)
          }
        }
      },
    })
  },

  /** 是否可取消 */
  canCancel(status: string): boolean {
    return ['APPROVING', 'APPROVED', 'PENDING'].includes(status)
  },

  /** 是否显示核销码 */
  canShowQrCode(status: string): boolean {
    return ['PENDING', 'APPROVED', 'VERIFIED'].includes(status)
  },

  /** 查看核销码（跳转详情页） */
  viewQrCode(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/reservation-detail/index?id=${id}` })
  },

  /** 获取状态文本 */
  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      APPROVING: '审批中',
      APPROVED: '待核销',
      VERIFIED: '已使用',
      CANCELLED: '已取消',
      REJECTED: '已拒绝',
      PENDING: '待核销',
      EXPIRED: '已过期',
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

  /** 跳转首页 */
  goHome() {
    wx.switchTab({ url: '/pages/home/index' })
  },
})
