<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const editForm = ref({ title: '', coverImage: '', location: '', startTime: '', endTime: '', status: 'UPCOMING', summary: '', richContent: '' })
const isEdit = ref(false)
const editId = ref(0)

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/activities'); if (res.data) list.value = res.data } finally { loading.value = false }
}

function openCreate() { isEdit.value = false; editId.value = 0; editForm.value = { title: '', coverImage: '', location: '', startTime: '', endTime: '', status: 'UPCOMING', summary: '', richContent: '' }; editVisible.value = true }
function openEdit(row: any) { isEdit.value = true; editId.value = row.id; editForm.value = { ...row }; editVisible.value = true }

async function handleSave() {
  try {
    if (isEdit.value) await request.put(`/admin/activities/${editId.value}`, editForm.value)
    else await request.post('/admin/activities', editForm.value)
    ElMessage.success('保存成功'); editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try { await ElMessageBox.confirm('确定删除？'); await request.delete(`/admin/activities/${id}`); ElMessage.success('已删除'); fetchData() } catch { /* cancelled */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>活动管理</h3><el-button type="primary" @click="openCreate">新增活动</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" min-width="150" />
        <el-table-column prop="location" label="地点" width="150" />
        <el-table-column prop="startTime" label="开始时间" width="160" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'ONGOING' ? 'success' : row.status === 'UPCOMING' ? 'warning' : 'info'" size="small">{{ row.status }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }"><el-button size="small" @click="openEdit(row)">编辑</el-button><el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" :title="isEdit ? '编辑活动' : '新增活动'" width="650px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="editForm.title" /></el-form-item>
        <el-form-item label="头图"><el-input v-model="editForm.coverImage" placeholder="图片URL" /></el-form-item>
        <el-form-item label="地点"><el-input v-model="editForm.location" /></el-form-item>
        <el-form-item label="时间"><el-input v-model="editForm.startTime" placeholder="开始时间" style="width:45%" /> ~ <el-input v-model="editForm.endTime" placeholder="结束时间" style="width:45%" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editForm.status"><el-option label="即将开始" value="UPCOMING" /><el-option label="进行中" value="ONGOING" /><el-option label="已结束" value="ENDED" /></el-select>
        </el-form-item>
        <el-form-item label="摘要"><el-input v-model="editForm.summary" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="详情"><el-input v-model="editForm.richContent" type="textarea" :rows="6" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>
