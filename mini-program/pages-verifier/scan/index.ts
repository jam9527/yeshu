/**
 * 扫一扫核销
 * 扫描二维码进行预约核销验证
 */
import api from '../../utils/api'

Page({
  data: {
    scanning: false,
    result: null as any,
    error: null as string | null,
    /** 开发模式：手动输入核销码 */
    devQrCode: '',
    showDevInput: false,
    /** 个人预约 - 实到人数 */
    actualCount: 0,
  },

  onLoad() {
    if (!this.checkVerifier()) return
    setTimeout(() => {
      this.startScan()
    }, 500)
  },

  checkVerifier(): boolean {
    const app = getApp()
    if (!app.globalData.userInfo?.isVerifier) {
      wx.showToast({ title: '仅核销员可执行此操作', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return false
    }
    return true
  },

  /** 启动扫码 */
  startScan() {
    this.setData({ scanning: true, result: null, error: null })
    wx.scanCode({
      onlyFromCamera: true,
      success: (res) => {
        this.handleScanResult(res.result)
      },
      fail: (err) => {
        this.setData({ scanning: false })
        if (err.errMsg.indexOf('cancel') > -1) {
          // 用户取消，静默处理
        } else {
          this.setData({ error: '扫码失败，请重试' })
        }
      },
    })
  },

  /** 处理扫码结果 */
  async handleScanResult(qrCode: string) {
    try {
      const res: any = await api.post('/verification/scan', { qrCode })
      // 格式化身份证显示
      const visitors = (res.visitors || []).map((v: any) => ({
        ...v,
        idCardDisplay: v.idCard ? v.idCard.replace(/^(.{4}).+(.{4})$/, '$1********$2') : '—',
      }))
      const display = {
        ...res,
        visitors,
        sessionLabel: res.sessionType === 'AM' ? '上午场' : res.sessionType === 'PM' ? '下午场' : res.sessionType === 'EV' ? '夜场' : res.sessionType,
        isVerified: res.status === 'VERIFIED',
      }
      this.setData({
        scanning: false,
        result: display,
        error: null,
        actualCount: res.visitorCount || 1,
      })
    } catch (err: any) {
      this.setData({
        scanning: false,
        result: null,
        error: err.message || '无效的核销码',
      })
    }
  },

  /** 实到人数变更 */
  onActualCountChange(e: any) {
    const value = parseInt(e.currentTarget.dataset.value, 10)
    const max = this.data.result?.visitorCount || 1
    if (isNaN(value) || value < 1) return
    if (value > max) return
    this.setData({ actualCount: value })
  },

  /** 确认核销 */
  async confirmVerify() {
    const { reservationId } = this.data.result || {}
    if (!reservationId) return

    wx.showLoading({ title: '核销中...' })
    try {
      await api.post('/verification/confirm', {
        reservationId,
        actualCount: this.data.actualCount,
      })
      wx.hideLoading()
      // 更新本地结果显示为已核销，不必重新扫码
      this.setData({
        'result.isVerified': true,
      })
      wx.showToast({ title: '核销成功', icon: 'success', duration: 1500 })
    } catch (err: any) {
      wx.hideLoading()
      wx.showToast({ title: err.message || '核销失败', icon: 'none' })
    }
  },

  /** 重置，重新扫码 */
  reset() {
    this.setData({ actualCount: 0 })
    this.startScan()
  },

  /** 开发模式：切换手动输入 */
  toggleDevInput() {
    this.setData({ showDevInput: !this.data.showDevInput, devQrCode: '' })
  },

  /** 开发模式：输入核销码 */
  onDevInput(e: any) {
    this.setData({ devQrCode: e.detail.value })
  },

  /** 开发模式：手动提交核销 */
  devSubmit() {
    const qrCode = this.data.devQrCode.trim()
    if (!qrCode) {
      wx.showToast({ title: '请输入核销码', icon: 'none' })
      return
    }
    this.handleScanResult(qrCode)
  },
})
