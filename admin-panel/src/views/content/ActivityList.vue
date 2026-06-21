<script setup lang="ts">
import { ref, computed, onMounted, shallowRef, onBeforeUnmount } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import request from '../../api/request'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const p = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` } catch { return iso }
}

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
const uploadHeaders = { Authorization: 'Bearer ' + (localStorage.getItem('admin_token') || '') }

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const editForm = ref({ title: '', coverImage: '', location: '', startTime: null, endTime: null, summary: '', richContent: '' })
const isEdit = ref(false)
const editId = ref(0)

function handleCoverUpload(res: any) {
  const url = res?.data?.url || res?.url || res
  if (url) editForm.value.coverImage = url
}

// wangEditor
const editorRef = shallowRef()
const toolbarConfig = {}
const editorConfig = { placeholder: '请输入详细内容...' }
const handleCreated = (editor: any) => { editorRef.value = editor }

// 根据时间自动计算状态
const computedStatus = computed(() => {
  const now = Date.now()
  const start = editForm.value.startTime?.getTime() ?? Infinity
  const end = editForm.value.endTime?.getTime() ?? Infinity
  if (now >= start && now <= end) return 'ONGOING'
  if (now > end) return 'ENDED'
  return 'UPCOMING'
})

const statusLabel: Record<string, string> = { UPCOMING: '即将开始', ONGOING: '进行中', ENDED: '已结束' }
const statusType: Record<string, string> = { UPCOMING: 'warning', ONGOING: 'success', ENDED: 'info' }

// 表格行内单独计算状态
function rowStatus(row: any) {
  const now = Date.now()
  const start = row.startTime ? new Date(row.startTime).getTime() : Infinity
  const end = row.endTime ? new Date(row.endTime).getTime() : Infinity
  if (now >= start && now <= end) return 'ONGOING'
  if (now > end) return 'ENDED'
  return 'UPCOMING'
}

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/activities'); if (res.data) list.value = res.data } finally { loading.value = false }
}

function openCreate() {
  isEdit.value = false; editId.value = 0
  editForm.value = { title: '', coverImage: '', location: '', startTime: null, endTime: null, summary: '', richContent: '' }
  editVisible.value = true
}

function openEdit(row: any) {
  isEdit.value = true; editId.value = row.id
  editForm.value = {
    ...row,
    startTime: row.startTime ? new Date(row.startTime) : null,
    endTime: row.endTime ? new Date(row.endTime) : null,
  }
  editVisible.value = true
}

async function handleSave() {
  try {
    const data = { ...editForm.value, status: computedStatus.value }
    if (isEdit.value) await request.put(`/admin/activities/${editId.value}`, data)
    else await request.post('/admin/activities', data)
    ElMessage.success('保存成功'); editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try { await ElMessageBox.confirm('确定删除？'); await request.delete(`/admin/activities/${id}`); ElMessage.success('已删除'); fetchData() } catch { /* cancelled */ }
}

onMounted(fetchData)
onBeforeUnmount(() => { if (editorRef.value) { editorRef.value.destroy(); editorRef.value = null } })
</script>

<template>
  <div>
    <div class="page-header"><h3>活动管理</h3><el-button type="primary" @click="openCreate">新增活动</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column prop="location" label="地点" width="150" />
        <el-table-column label="开始时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.startTime) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType[rowStatus(row)]" size="small">{{ statusLabel[rowStatus(row)] }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }"><el-button size="small" @click="openEdit(row)">编辑</el-button><el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" :title="isEdit ? '编辑活动' : '新增活动'" width="750px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="editForm.title" /></el-form-item>
        <el-form-item label="头图">
          <div style="display:flex;align-items:center;gap:12px">
            <el-input v-model="editForm.coverImage" placeholder="图片URL" style="flex:1" />
            <el-upload
              :action="baseUrl + '/files/upload'"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleCoverUpload"
              accept="image/*"
            >
              <el-button :icon="Upload">上传</el-button>
            </el-upload>
          </div>
          <div style="color:#999;font-size:12px;margin-top:4px">建议尺寸 750×400px</div>
        </el-form-item>
        <el-form-item label="地点"><el-input v-model="editForm.location" /></el-form-item>
        <el-form-item label="时间">
          <el-date-picker v-model="editForm.startTime" type="datetime" placeholder="选择开始时间" format="YYYY-MM-DD HH:mm" style="width:220px" />
          ~
          <el-date-picker v-model="editForm.endTime" type="datetime" placeholder="选择结束时间" format="YYYY-MM-DD HH:mm" style="width:220px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-tag :type="statusType[computedStatus]" size="default">{{ statusLabel[computedStatus] }}</el-tag>
          <span style="font-size:12px;color:#999;margin-left:10px;">根据所选时间自动计算</span>
        </el-form-item>
        <el-form-item label="摘要"><el-input v-model="editForm.summary" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="详情">
          <div style="border:1px solid #dcdfe6;">
            <Toolbar v-if="editorRef" :editor="editorRef" :defaultConfig="toolbarConfig" style="border-bottom:1px solid #dcdfe6" />
            <Editor v-model="editForm.richContent" :defaultConfig="editorConfig" @onCreated="handleCreated" style="height:300px;" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>
