import request from '../api/request'

/**
 * 文件上传 composable
 * 返回上传后的文件 URL
 */
export function useUpload() {
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const res: any = await request.post('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    // res = { code, message, data: { url } }
    return res?.data?.url || res?.url || ''
  }

  return { uploadFile }
}
