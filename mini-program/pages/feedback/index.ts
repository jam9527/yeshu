/**
 * 意见反馈
 * 用户提交反馈内容与截图
 */
import api from '../../utils/api'

Page({
  data: {
    content: '',
    contact: '',
    images: [] as string[],
    submitting: false,
  },

  onContentInput(e: any) {
    this.setData({ content: e.detail.value })
  },

  onContactInput(e: any) {
    this.setData({ contact: e.detail.value })
  },

  /** 选择图片 */
  chooseImage() {
    const remain = 9 - this.data.images.length
    if (remain <= 0) {
      wx.showToast({ title: '最多上传9张图片', icon: 'none' })
      return
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({
          images: this.data.images.concat(res.tempFilePaths),
        })
      },
    })
  },

  /** 删除图片 */
  removeImage(e: any) {
    const { index } = e.currentTarget.dataset
    const images = this.data.images.filter((_: string, i: number) => i !== index)
    this.setData({ images })
  },

  /** 预览图片 */
  previewImage(e: any) {
    const { index } = e.currentTarget.dataset
    wx.previewImage({
      current: this.data.images[index],
      urls: this.data.images,
    })
  },

  /** 提交反馈 */
  async submit() {
    const app = getApp()
    if (!app.globalData.token) {
      app.globalData.pendingRedirect = '/' + (this.route || 'pages/feedback/index')
      wx.redirectTo({ url: '/pages/login/index' })
      return
    }
    const { content, images } = this.data

    if (!content.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    try {
      // 如果有图片，先上传图片获取 URL
      let imageUrls: string[] = []
      if (images.length > 0) {
        imageUrls = await this.uploadImages(images)
      }

      await api.post('/feedback', {
        content: content.trim(),
        contact: this.data.contact.trim(),
        images: imageUrls,
      })

      wx.showToast({ title: '提交成功，感谢您的反馈！', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 1500)
    } catch {
      wx.showToast({ title: '提交失败，请稍后重试', icon: 'none' })
    } finally {
      this.setData({ submitting: false })
    }
  },

  /** 上传图片到服务器 */
  uploadImages(filePaths: string[]): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const uploadedUrls: string[] = []
      let completed = 0

      filePaths.forEach((filePath) => {
        const app = getApp()
        wx.uploadFile({
          url: `${app.globalData.baseUrl}/upload`,
          filePath,
          name: 'file',
          header: {
            Authorization: app.globalData.token ? `Bearer ${app.globalData.token}` : '',
          },
          success: (res: any) => {
            try {
              const data = JSON.parse(res.data)
              if (data.data?.url) {
                uploadedUrls.push(data.data.url)
              } else if (data.url) {
                uploadedUrls.push(data.url)
              }
            } catch {
              // 单个图片上传失败不影响整体
            }
          },
          fail: () => {
            // 单个图片上传失败不影响整体
          },
          complete: () => {
            completed++
            if (completed === filePaths.length) {
              resolve(uploadedUrls)
            }
          },
        })
      })
    })
  },
})
