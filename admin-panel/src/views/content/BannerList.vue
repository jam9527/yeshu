<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([]); const loading = ref(false); const editVisible = ref(false); const isEdit = ref(false); const editId = ref(0)
const editForm = ref({ title: '', imageUrl: '', linkType: 'NONE', linkValue: '', sortOrder: 0 })

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/banners'); if (res.data) list.value = res.data } finally { loading.value = false }
}

function openCreate() { isEdit.value = false; editId.value = 0; editForm.value = { title: '', imageUrl: '', linkType: 'NONE', linkValue: '', sortOrder: 0 }; editVisible.value = true }
function openEdit(row: any) { isEdit.value = true; editId.value = row.id; editForm.value = { ...row }; editVisible.value = true }

async function handleSave() {
  try {
    if (isEdit.value) await request.put(`/admin/banners/${editId.value}`, editForm.value)
    else await request.post('/admin/banners', editForm.value)
    ElMessage.success('保存成功'); editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}
async function handleDelete(id: number) {
  try { await ElMessageBox.confirm('确定删除？'); await request.delete(`/admin/banners/${id}`); ElMessage.success('已删除'); fetchData() } catch { /* cancelled */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>Banner管理</h3><el-button type="primary" @click="openCreate">新增Banner</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="title" label="标题" /><el-table-column prop="imageUrl" label="图片" show-overflow-tooltip width="300" /><el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }"><el-button size="small" @click="openEdit(row)">编辑</el-button><el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="editVisible" :title="isEdit ? '编辑Banner' : '新增Banner'" width="500px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="标题"><el-input v-model="editForm.title" /></el-form-item>
        <el-form-item label="图片URL"><el-input v-model="editForm.imageUrl" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="editForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>
