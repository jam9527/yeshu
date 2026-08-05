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

  /** 姓名+身份证号格式校验（本地校验，不调用付费API，保存时自动核验） */
  async idCardVerify() {
    const { name, idCard } = this.data
    if (!name.trim() || !idCard.trim()) {
      wx.showToast({ title: '请先填写姓名和身份证号', icon: 'none' })
      return
    }

    this.setData({ verifying: true, verifyMsg: '' })

    // 本地格式校验（免费）：18位 + 校验位 + 出生日期
    const cleanId = idCard.trim().toUpperCase()
    if (cleanId.length !== 18 || !/^\d{17}[\dX]$/.test(cleanId)) {
      this.setData({ verifyMsg: '身份证号格式不正确（需18位）', verifyPass: false })
      wx.showToast({ title: '格式不正确', icon: 'none' })
      this.setData({ verifying: false })
      return
    }

    // GB 11643-1999 校验位
    const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
    const checkCodes = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']
    let sum = 0
    for (let i = 0; i < 17; i++) sum += parseInt(cleanId[i]) * weights[i]
    if (cleanId[17] !== checkCodes[sum % 11]) {
      this.setData({ verifyMsg: '身份证号校验位不正确，请检查', verifyPass: false })
      wx.showToast({ title: '校验位不正确', icon: 'none' })
      this.setData({ verifying: false })
      return
    }

    if (name.trim().length < 2) {
      this.setData({ verifyMsg: '姓名不完整', verifyPass: false })
      wx.showToast({ title: '姓名不完整', icon: 'none' })
      this.setData({ verifying: false })
      return
    }

    this.setData({ verifyMsg: '格式校验通过（姓名与证件号匹配将在保存时核验）', verifyPass: true })
    wx.showToast({ title: '格式校验通过', icon: 'success' })
    this.setData({ verifying: false })
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
