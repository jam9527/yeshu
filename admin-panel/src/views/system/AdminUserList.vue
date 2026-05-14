<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([]); const loading = ref(false); const editVisible = ref(false); const isEdit = ref(false); const editId = ref(0)
const editForm = ref({ username: '', password: '', nickname: '' })

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/system/users'); if (res.data) list.value = res.data } finally { loading.value = false }
}

function openCreate() { isEdit.value = false; editForm.value = { username: '', password: '', nickname: '' }; editVisible.value = true }
function openEdit(row: any) { isEdit.value = true; editId.value = row.id; editForm.value = { ...row, password: '' }; editVisible.value = true }

async function handleSave() {
  try {
    if (isEdit.value) await request.put(`/admin/system/users/${editId.value}`, editForm.value)
    else await request.post('/admin/system/users', editForm.value)
    ElMessage.success('保存成功'); editVisible.value = false; fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try { await ElMessageBox.confirm('确定删除？'); await request.delete(`/admin/system/users/${id}`); ElMessage.success('已删除'); fetchData() } catch { /* cancelled */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>账号管理</h3><el-button type="primary" @click="openCreate">新增账号</el-button></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="isSuperAdmin" label="超级管理员" width="120">
          <template #default="{ row }"><el-tag :type="row.isSuperAdmin ? 'danger' : 'info'" size="small">{{ row.isSuperAdmin ? '是' : '否' }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" width="160" />
        <el-table-column label="操作" width="180">
          <template #default="{ row }"><el-button size="small" @click="openEdit(row)">编辑</el-button><el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="editVisible" :title="isEdit ? '编辑账号' : '新增账号'" width="450px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户名"><el-input v-model="editForm.username" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="editForm.password" type="password" :placeholder="isEdit ? '留空不修改' : ''" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="editForm.nickname" /></el-form-item>
      </el-form>
      <template #footer><el-button type="primary" @click="handleSave">保存</el-button></template>
    </el-dialog>
  </div>
</template>
