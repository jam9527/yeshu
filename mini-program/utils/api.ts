/**
 * API 请求封装
 * 统一处理 token 注入、错误提示、登录跳转
 */

const app = getApp()

/** 递归将对象中 /uploads/ 开头的 URL 转为绝对路径（包括 HTML 内嵌图片） */
export function resolveImageUrls(obj: any, _depth = 0): any {
  if (_depth > 30) return obj // 防止循环引用导致超时
  if (typeof obj === 'string') {
    // 纯 URL
    if (obj.startsWith('/uploads/')) {
      const baseUrl = app.globalData.baseUrl.replace(/\/api$/, '')
      return `${baseUrl}${obj}`
    }
    // HTML 字符串内的 <img src="/uploads/..."> 转绝对路径
    if (obj.includes('<img') && obj.includes('/uploads/')) {
      const baseUrl = app.globalData.baseUrl.replace(/\/api$/, '')
      return obj.replace(
        /(<img\b[^>]*\s+src\s*=\s*["'])(\/uploads\/[^"']*?)(["'])/gi,
        (_, prefix: string, path: string, suffix: string) =>
          `${prefix}${baseUrl}${path}${suffix}`,
      )
    }
    return obj
  }
  if (Array.isArray(obj)) return obj.map(item => resolveImageUrls(item, _depth + 1))
  if (obj && typeof obj === 'object') {
    const result: any = {}
    for (const key of Object.keys(obj)) {
      result[key] = resolveImageUrls(obj[key], _depth + 1)
    }
    return result
  }
  return obj
}

interface RequestOptions {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  loading?: boolean
}

/** 发起 API 请求 */
function request<T = any>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, loading } = options
  const baseUrl = app.globalData.baseUrl
  const token = app.globalData.token

  return new Promise((resolve, reject) => {
    if (loading) {
      wx.showLoading({ title: '加载中...' })
    }

    wx.request({
      url: `${baseUrl}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        if (res.data.code === 200 || res.statusCode === 200) {
          resolve(res.data.data ?? res.data)
        } else if (res.statusCode === 401) {
          // 未登录且无 token — 静默失败，不跳转
          if (!token) {
            reject(new Error('未登录'))
            return
          }
          // Token 过期，跳转登录
          wx.removeStorageSync('token')
          wx.reLaunch({ url: '/pages/login/index' })
          reject(new Error('登录已过期'))
        } else {
          const msg = res.data?.message || '请求失败'
          wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        wx.showToast({ title: '网络异常', icon: 'none' })
        reject(err)
      },
      complete: () => {
        if (loading) wx.hideLoading()
      },
    })
  })
}

/** 文件上传（使用 wx.uploadFile） */
function upload<T = any>(url: string, filePath: string, name: string = 'file', formData?: Record<string, any>): Promise<T> {
  const baseUrl = app.globalData.baseUrl
  const token = app.globalData.token

  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '上传中...' })
    wx.uploadFile({
      url: `${baseUrl}${url}`,
      filePath,
      name,
      formData,
      header: {
        Authorization: token ? `Bearer ${token}` : '',
      },
      success: (res: any) => {
        const data = JSON.parse(res.data)
        if (res.statusCode === 200 && (data.code === 200 || data.data !== undefined)) {
          resolve(data.data ?? data)
        } else {
          const msg = data?.message || '上传失败'
          wx.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        }
      },
      fail: (err) => {
        wx.showToast({ title: '上传失败', icon: 'none' })
        reject(err)
      },
      complete: () => {
        wx.hideLoading()
      },
    })
  })
}

/** 封装常用方法 */
export const api = {
  get: <T = any>(url: string, data?: any) => request<T>({ url, data }),
  post: <T = any>(url: string, data?: any) => request<T>({ url, method: 'POST', data }),
  put: <T = any>(url: string, data?: any) => request<T>({ url, method: 'PUT', data }),
  delete: <T = any>(url: string, data?: any) => request<T>({ url, method: 'DELETE', data }),
  upload: <T = any>(url: string, filePath: string, name?: string, formData?: Record<string, any>) =>
    upload<T>(url, filePath, name, formData),
}

export default api
