/**
 * 实名信息编辑
 * 新建/编辑身份证实名信息
 */
import api from '../../utils/api'

Page({
  data: {
    id: '',
    name: '',
    idCardType: 'ID_CARD',
    idCardTypes: [
      { label: '身份证', value: 'ID_CARD' },
      { label: '护照', value: 'PASSPORT' },
      { label: '港澳台通行证', value: 'HK_MO_TW' },
    ] as { label: string; value: string }[],
    idCard: '',
    loading: false,
    submitting: false,
    verifying: false,
    verifyMsg: '',
    verifyPass: false,
    isEdit: false,
    idCardTypeIndex: 0,
  },

  onLoad(options: any) {
    if (options.id) {
      this.setData({ id: options.id, isEdit: true })
      this.fetchDetail(options.id)
    }
  },

  async fetchDetail(id: string) {
    this.setData({ loading: true })
    try {
      const res: any = await api.get('/real-names/' + id)
      const idCardType = res.idCardType || 'ID_CARD'
      this.setData({
        name: res.name || '',
        idCardType,
        idCardTypeIndex: this.data.idCardTypes.findIndex(t => t.value === idCardType),
        idCard: res.idCard || '',
      })
    } catch {
      wx.showToast({ title: '获取信息失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  onNameInput(e: any) {
    this.setData({ name: e.detail.value })
  },

  onIdCardInput(e: any) {
    this.setData({ idCard: e.detail.value })
  },

  onIdCardTypeChange(e: any) {
    const index = e.detail.value
    this.setData({ idCardType: this.data.idCardTypes[index].value, idCardTypeIndex: index })
  },

  /** 身份证 OCR 识别 — 拍照/相册选择后上传识别 */
  async idCardOCR() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: async (res) => {
        let sourceType: 'camera' | 'album'
        if (res.tapIndex === 0) {
          sourceType = 'camera'
        } else {
          sourceType = 'album'
        }

        try {
          const media = await wx.chooseMedia({
            count: 1,
            mediaType: ['image'],
            sourceType: [sourceType],
            sizeType: ['compressed'],
          })

          const tempFile = media.tempFiles[0]
          if (!tempFile) return

          this.setData({ loading: true })
          wx.showLoading({ title: '识别中...' })

          const result: any = await api.upload('/real-names/ocr', tempFile.tempFilePath, 'image')

          if (result.name) {
            this.setData({ name: result.name })
          }
          if (result.idCard) {
            this.setData({ idCard: result.idCard })
          }

          wx.hideLoading()

          if (result.isSimulated) {
            wx.showToast({
              title: '开发模式：数据为模拟结果，请核对',
              icon: 'none',
              duration: 3000,
            })
          } else {
            wx.showToast({ title: '识别成功', icon: 'success' })
          }
        } catch (err: any) {
          wx.hideLoading()
          // 用户取消选择不提示错误
          if (err?.errMsg?.includes('cancel')) return
          wx.showToast({ title: err?.message || '识别失败', icon: 'none' })
        } finally {
          this.setData({ loading: false })
        }
      },
    })
  },

  /** 姓名+身份证号二要素核验 */
  async idCardVerify() {
    const { name, idCard } = this.data
    if (!name.trim() || !idCard.trim()) {
      wx.showToast({ title: '请先填写姓名和身份证号', icon: 'none' })
      return
    }

    this.setData({ verifying: true, verifyMsg: '' })
    try {
      const res: any = await api.post('/real-names/verify', { name: name.trim(), idCard: idCard.trim() })
      if (res.verified) {
        this.setData({ verifyMsg: res.message || '核验通过', verifyPass: true })
        wx.showToast({ title: '核验通过', icon: 'success' })
      } else {
        this.setData({ verifyMsg: res.message || '核验不通过', verifyPass: false })
        wx.showToast({ title: res.message || '核验不通过', icon: 'none' })
      }
    } catch {
      this.setData({ verifyMsg: '核验服务异常', verifyPass: false })
      wx.showToast({ title: '核验失败', icon: 'none' })
    } finally {
      this.setData({ verifying: false })
    }
  },

  /** 提交实名信息 */
  async submit() {
    const { name, idCard, idCardType, isEdit, id } = this.data

    // 字段校验
    if (!name.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!idCard.trim()) {
      wx.showToast({ title: '请输入证件号码', icon: 'none' })
      return
    }
    if (idCardType === 'ID_CARD' && !/^\d{17}[\dXx]$/.test(idCard.trim())) {
      wx.showToast({ title: '请输入正确的18位身份证号', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const payload = {
      name: name.trim(),
      idCardType,
      idCard: idCard.trim(),
    }

    try {
      let res: any
      if (isEdit) {
        res = await api.put('/real-names/' + id, payload)
        wx.showToast({ title: '更新成功', icon: 'success' })
      } else {
        res = await api.post('/real-names', payload)
        wx.showToast({ title: '添加成功', icon: 'success' })
      }
      // 展示核验结果
      if (res?.idVerified) {
        setTimeout(() => wx.navigateBack(), 1500)
      } else if (res && res.idVerified === false) {
        wx.showModal({
          title: '核验提示',
          content: '实名信息已保存，但身份证核验未通过（证件号码格式异常），你可以在需要时重新编辑。',
          showCancel: false,
          success: () => setTimeout(() => wx.navigateBack(), 500),
        })
      } else {
        setTimeout(() => wx.navigateBack(), 1500)
      }
    } catch {
      // 错误已在 api 层处理
    } finally {
      this.setData({ submitting: false })
    }
  },
})
