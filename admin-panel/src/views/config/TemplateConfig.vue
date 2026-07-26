<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import request from '../../api/request'

interface Template {
  id: number
  name: string
  fileUrl: string
  isActive: boolean
  uploadedBy: number
  createdAt: string
  updatedAt: string
}

const templates = ref<Template[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const form = ref({ name: '', fileUrl: '', isActive: true })
const saving = ref(false)
const uploading = ref(false)

async function fetchList() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/config/templates')
    templates.value = res?.data || res || []
  } finally {
    loading.value = false
  }
}

function openUpload() {
  form.value = { name: '', fileUrl: '', isActive: true }
  dialogVisible.value = true
}

async function handleFileUpload(options: any) {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', options.file)
    const res: any = await request.post('/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    form.value.fileUrl = res.data?.url || res.url
    ElMessage.success('文件已上传')
  } catch {
    ElMessage.error('文件上传失败')
  } finally {
    uploading.value = false
  }
}

async function handleUpload() {
  if (!form.value.name.trim() || !form.value.fileUrl.trim()) {
    ElMessage.warning('请填写模板名称和文件地址')
    return
  }
  saving.value = true
  try {
    await request.post('/admin/config/templates', form.value)
    ElMessage.success('上传成功')
    dialogVisible.value = false
    fetchList()
  } finally {
    saving.value = false
  }
}

function handleSetActive(item: Template) {
  ElMessageBox.confirm(`将 "${item.name}" 设为当前启用的模板？`, '提示').then(async () => {
    await request.put(`/admin/config/templates/${item.id}`, { isActive: true })
    ElMessage.success('设置成功')
    fetchList()
  }).catch(() => {})
}

function handleDelete(item: Template) {
  ElMessageBox.confirm(`确定删除模板 "${item.name}"？`, '删除确认', { type: 'warning' }).then(async () => {
    await request.delete(`/admin/config/templates/${item.id}`)
    ElMessage.success('删除成功')
    fetchList()
  }).catch(() => {})
}

onMounted(fetchList)
</script>

<template>
  <div>
    <div class="page-header"><h3>申请表模板管理</h3><el-button type="primary" @click="openUpload">上传新模板</el-button></div>

    <el-card>
      <el-table :data="templates" v-loading="loading" stripe style="width:100%">
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column prop="name" label="模板名称" min-width="180" />
        <el-table-column prop="fileUrl" label="文件地址" min-width="280" show-overflow-tooltip />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用中' : '未启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="上传时间" width="170">
          <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }).replace(/\//g, '-') : '' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <a v-if="row.fileUrl" :href="row.fileUrl" target="_blank" style="margin-right:8px">
              <el-button type="primary" link size="small">下载</el-button>
            </a>
            <el-button v-if="!row.isActive" type="primary" link size="small" @click="handleSetActive(row)">启用</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog v-model="dialogVisible" title="上传申请表模板" width="520px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="模板名称">
          <el-input v-model="form.name" placeholder="例如：团队参观申请表.docx" />
        </el-form-item>
        <el-form-item label="上传文件">
          <el-upload
            :show-file-list="false"
            :http-request="handleFileUpload"
            :auto-upload="true"
          >
            <el-button type="primary" :loading="uploading" :icon="UploadFilled">
              {{ uploading ? '上传中...' : '选择文件' }}
            </el-button>
            <template #tip>
              <div style="font-size:12px;color:#999;margin-top:4px">支持 .doc/.docx/.pdf 格式，最大 10MB</div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item label="文件地址">
          <el-input v-model="form.fileUrl" placeholder="上传后自动填充，也可手动输入" />
        </el-form-item>
        <el-form-item label="立即启用">
          <el-switch v-model="form.isActive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleUpload" :disabled="!form.fileUrl">确认上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>
