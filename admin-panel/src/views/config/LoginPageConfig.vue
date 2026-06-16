<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import request from '../../api/request'

const form = reactive({
  background: '',
  logo: '',
  titleColor: '#ffffff',
  buttonColor: '#d92b2b',
  buttonTextColor: '#ffffff',
})

const loading = ref(false)
const saving = ref(false)

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''

const uploadHeaders = {
  Authorization: 'Bearer ' + (localStorage.getItem('admin_token') || ''),
}

async function fetchConfig() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/config/login-page')
    const data = res.data ?? res
    if (data && Object.keys(data).length > 0) {
      Object.assign(form, data)
    }
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    await request.put('/admin/config/login-page', {
      background: form.background,
      logo: form.logo,
      titleColor: form.titleColor,
      buttonColor: form.buttonColor,
      buttonTextColor: form.buttonTextColor,
    })
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}

function handleUpload(res: any, field: 'background' | 'logo') {
  const url = res?.data?.url || res?.url || res
  ;(form as any)[field] = url
}

onMounted(fetchConfig)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>登录页自定义</h3>
      <el-button type="primary" :loading="saving" @click="handleSave">
        保存配置
      </el-button>
    </div>

    <el-card v-loading="loading" style="max-width: 700px">
      <el-form label-width="120px">
        <el-form-item label="背景图">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-input
              v-model="form.background"
              placeholder="/uploads/xxx.png 或留空使用默认"
              style="flex: 1"
            />
            <el-upload
              :action="baseUrl + '/files/upload'"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="(r: any) => handleUpload(r, 'background')"
              accept="image/*"
            >
              <el-button :icon="Upload">上传</el-button>
            </el-upload>
          </div>
          <el-image
            v-if="form.background"
            :src="form.background"
            style="margin-top: 8px; max-width: 200px; max-height: 120px; border-radius: 4px; border: 1px solid #eee"
            fit="contain"
          />
          <div v-else style="color: #999; font-size: 12px; margin-top: 4px">
            默认白色背景
          </div>
        </el-form-item>

        <el-form-item label="Logo 图片">
          <div style="display: flex; align-items: center; gap: 12px">
            <el-input
              v-model="form.logo"
              placeholder="/uploads/xxx.png 或留空使用默认"
              style="flex: 1"
            />
            <el-upload
              :action="baseUrl + '/files/upload'"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="(r: any) => handleUpload(r, 'logo')"
              accept="image/*"
            >
              <el-button :icon="Upload">上传</el-button>
            </el-upload>
          </div>
          <el-image
            v-if="form.logo"
            :src="form.logo"
            style="margin-top: 8px; max-width: 200px; max-height: 120px; border-radius: 4px; border: 1px solid #eee"
            fit="contain"
          />
          <div v-else style="color: #999; font-size: 12px; margin-top: 4px">
            默认显示"椰树集团"文字
          </div>
        </el-form-item>

        <el-form-item label="标题颜色">
          <el-color-picker v-model="form.titleColor" />
          <span style="margin-left: 8px; color: #999; font-size: 12px">
            默认白色
          </span>
        </el-form-item>

        <el-form-item label="按钮颜色">
          <el-color-picker v-model="form.buttonColor" />
          <span style="margin-left: 8px; color: #999; font-size: 12px">
            默认椰树红 #d92b2b
          </span>
        </el-form-item>

        <el-form-item label="按钮文字颜色">
          <el-color-picker v-model="form.buttonTextColor" />
          <span style="margin-left: 8px; color: #999; font-size: 12px">
            默认白色
          </span>
        </el-form-item>
      </el-form>

      <el-divider />

      <div style="font-size: 13px; color: #999">
        <p>配置后将在小程序登录页实时生效（无需重新发布小程序）。</p>
        <p>留空的配置项使用默认样式。</p>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0;
}
</style>
