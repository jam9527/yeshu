<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const editForm = ref({ username: '', password: '', nickname: '', roleId: undefined as number | undefined })
const roles = ref([] as any[])

function formatTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

async function fetchData() {
  loading.value = true
  try {
    const [userRes, roleRes]: any[] = await Promise.all([
      request.get('/admin/system/users'),
      request.get('/admin/system/roles'),
    ])
    list.value = userRes.data || []
    roles.value = roleRes.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEdit.value = false
  editForm.value = { username: '', password: '', nickname: '', roleId: undefined }
  editVisible.value = true
}

function openEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  editForm.value = { username: row.username, password: '', nickname: row.nickname || '', roleId: row.roleId }
  editVisible.value = true
}

async function handleSave() {
  try {
    const payload: any = { ...editForm.value }
    if (isEdit.value && !payload.password) delete payload.password
    if (isEdit.value) {
      await request.put(`/admin/system/users/${editId.value}`, payload)
    } else {
      await request.post('/admin/system/users', payload)
    }
    ElMessage.success('保存成功')
    editVisible.value = false
    fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该账号？')
    await request.delete(`/admin/system/users/${id}`)
    ElMessage.success('已删除')
    fetchData()
  } catch { /* cancelled */ }
}

function roleName(roleId: number): string {
  const role = roles.value.find((r: any) => r.id === roleId)
  return role?.name || '—'
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>账号管理</h3>
      <el-button type="primary" @click="openCreate">新增账号</el-button>
    </div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="130" />
        <el-table-column prop="nickname" label="昵称" width="130">
          <template #default="{ row }">{{ row.nickname || '—' }}</template>
        </el-table-column>
        <el-table-column prop="isSuperAdmin" label="超级管理员" width="110">
          <template #default="{ row }">
            <el-tag :type="row.isSuperAdmin ? 'danger' : 'info'" size="small">
              {{ row.isSuperAdmin ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="角色" width="140">
          <template #default="{ row }">
            <span v-if="row.isSuperAdmin" style="color:#e6a23c">超级管理员（全部权限）</span>
            <span v-else>{{ roleName(row.roleId) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" width="170">
          <template #default="{ row }">{{ formatTime(row.lastLoginAt) }}</template>
        </el-table-column>
        <el-table-column prop="lastLoginIp" label="登录IP" width="140">
          <template #default="{ row }">{{ row.lastLoginIp || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" :title="isEdit ? '编辑账号' : '新增账号'" width="480px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="用户名">
          <el-input v-model="editForm.username" placeholder="登录用户名" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input
            v-model="editForm.password"
            type="password"
            :placeholder="isEdit ? '留空不修改密码' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="editForm.nickname" placeholder="显示名称" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="editForm.roleId" placeholder="选择角色（可选）" clearable style="width:100%">
            <el-option
              v-for="role in roles"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
          <div style="color:#909399;font-size:12px;margin-top:4px">
            不选角色则仅拥有基础权限（查看预约记录和统计数据）
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
