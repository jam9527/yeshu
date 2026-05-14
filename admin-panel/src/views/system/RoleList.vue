<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([]); const loading = ref(false); const editVisible = ref(false); const isEdit = ref(false); const editId = ref(0)
const editForm = ref({ name: '', code: '', description: '' })

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/system/roles'); if (res.data) list.value = res.data } finally { loading.value = false }
}
function openCreate() { isEdit.value = false; editForm.value = { name: '', code: '', description: '' }; editVisible.value = true }
function openEdit(row: any) { isEdit.value = true; editId.value = row.id; editForm.value = { ...row }; editVisible.value = true }

async function handleSave() {
  try {
    if (isEdit.value) await request.put(`/admin/system/roles/${editId.value}`, editForm.value)
    else await request.post('/admin/system/roles', editForm.value)
    ElMessage.success('保存成功'); editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}
async function handleDelete(id: number) {
  try { await ElMessageBox.confirm('确定删除？'); await request.delete(`/admin/system/roles/${id}`); ElMessage.success('已删除'); fetchData() } catch { /* cancelled */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>角色管理</h3><el-button type="primary" @click="openCreate">新增角色</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="名称" width="150" />
        <el-table-column prop="code" label="编码" width="150" />
        <el-table-column prop="description" label="描述" min-width="200" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }"><el-button size="small" @click="openEdit(row)">编辑</el-button><el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="editVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="450px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="编码"><el-input v-model="editForm.code" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="editForm.description" type="textarea" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>
