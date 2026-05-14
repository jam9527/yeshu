/**
 * 实名信息列表
 * 展示用户已保存的身份证实名记录
 */
import api from '../../utils/api'

Page({
  data: {
    records: [] as any[],
    loading: true,
  },

  onShow() {
    this.fetchRecords()
  },

  async fetchRecords() {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/real-names')
      this.setData({ records: res?.records || res || [] })
    } catch {
      this.setData({ records: [] })
    } finally {
      this.setData({ loading: false })
    }
  },

  /** 前往新增实名信息 */
  goAdd() {
    wx.navigateTo({ url: '/pages/real-name-edit/index' })
  },

  /** 前往编辑实名信息 */
  goEdit(e: any) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/real-name-edit/index?id=${id}` })
  },

  /** 删除实名记录 */
  deleteRecord(e: any) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该实名信息吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            await api.delete('/real-names/' + id)
            wx.hideLoading()
            wx.showToast({ title: '删除成功', icon: 'success' })
            this.fetchRecords()
          } catch {
            wx.hideLoading()
            wx.showToast({ title: '删除失败', icon: 'none' })
          }
        }
      },
    })
  },

  /** 格式化证件号，隐藏中间部分 */
  formatIdCard(idCard: string, type?: string): string {
    if (!idCard) return ''
    if (type === 'ID_CARD' && idCard.length >= 10) {
      return idCard.substring(0, 4) + '********' + idCard.substring(idCard.length - 4)
    }
    if (idCard.length > 8) {
      return idCard.substring(0, 2) + '****' + idCard.substring(idCard.length - 2)
    }
    return idCard
  },

  /** 获取证件类型标签 */
  getIdCardTypeLabel(type?: string): string {
    const map: Record<string, string> = {
      ID_CARD: '身份证',
      PASSPORT: '护照',
      HK_MO_TW: '港澳台通行证',
    }
    return map[type || 'ID_CARD'] || type || '身份证'
  },
})
