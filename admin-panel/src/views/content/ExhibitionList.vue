<script setup lang="ts">
import { ref, onMounted, shallowRef, onBeforeUnmount } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import request from '../../api/request'

const baseUrl = import.meta.env.VITE_API_BASE_URL || ''
const uploadHeaders = { Authorization: 'Bearer ' + (localStorage.getItem('admin_token') || '') }

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const editForm = ref({ name: '', coverImage: '', description: '', richContent: '' })
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

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/exhibitions'); if (res.data) list.value = res.data } finally { loading.value = false }
}

function openCreate() {
  isEdit.value = false; editId.value = 0
  editForm.value = { name: '', coverImage: '', description: '', richContent: '' }
  editVisible.value = true
}

function openEdit(row: any) {
  isEdit.value = true; editId.value = row.id
  editForm.value = { ...row }
  editVisible.value = true
}

async function handleSave() {
  try {
    if (isEdit.value) {
      await request.put(`/admin/exhibitions/${editId.value}`, editForm.value)
    } else {
      await request.post('/admin/exhibitions', editForm.value)
    }
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除？')
    await request.delete(`/admin/exhibitions/${id}`)
    ElMessage.success('删除成功'); fetchData()
  } catch { /* cancelled */ }
}

onMounted(fetchData)
onBeforeUnmount(() => { if (editorRef.value) { editorRef.value.destroy(); editorRef.value = null } })
</script>

<template>
  <div>
    <div class="page-header"><h3>展厅管理</h3><el-button type="primary" @click="openCreate">新增展厅</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="description" label="简介" show-overflow-tooltip />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" :title="isEdit ? '编辑展厅' : '新增展厅'" width="750px" destroy-on-close>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="缩略图">
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
        <el-form-item label="简介"><el-input v-model="editForm.description" type="textarea" :rows="3" /></el-form-item>
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
