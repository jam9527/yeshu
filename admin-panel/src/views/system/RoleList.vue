<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([])
const loading = ref(false)
const editVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const editForm = ref({ name: '', code: '', description: '', permissions: [] as string[] })

const permissionGroups = [
  {
    label: '预约管理',
    permissions: [
      { value: 'reservation:review', label: '预约审核' },
    ],
  },
  {
    label: '用户管理',
    permissions: [
      { value: 'user:manage', label: '用户管理（含黑名单）' },
    ],
  },
  {
    label: '内容管理',
    permissions: [
      { value: 'content:manage', label: '内容管理（展厅/活动/Banner/FAQ）' },
      { value: 'diy:manage', label: '页面装修' },
      { value: 'feedback:view', label: '反馈查看' },
    ],
  },
  {
    label: '推广管理',
    permissions: [
      { value: 'promotion:manage', label: '推广员管理' },
    ],
  },
  {
    label: '系统管理',
    permissions: [
      { value: 'system:admin', label: '账号/角色/日志管理' },
      { value: 'config:manage', label: '预约配置管理' },
    ],
  },
]

function hasPermission(perm: string) {
  return editForm.value.permissions.includes(perm)
}

function togglePermission(perm: string) {
  const idx = editForm.value.permissions.indexOf(perm)
  if (idx >= 0) {
    editForm.value.permissions.splice(idx, 1)
  } else {
    editForm.value.permissions.push(perm)
  }
}

function toggleGroup(group: any) {
  const values = group.permissions.map((p: any) => p.value)
  const allHas = values.every((v: string) => hasPermission(v))
  if (allHas) {
    editForm.value.permissions = editForm.value.permissions.filter((p: string) => !values.includes(p))
  } else {
    const toAdd = values.filter((v: string) => !hasPermission(v))
    editForm.value.permissions.push(...toAdd)
  }
}

function isGroupAllChecked(group: any) {
  return group.permissions.every((p: any) => hasPermission(p.value))
}

function isGroupIndeterminate(group: any) {
  const someChecked = group.permissions.some((p: any) => hasPermission(p.value))
  const allChecked = isGroupAllChecked(group)
  return someChecked && !allChecked
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/system/roles')
    list.value = res.data || []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  isEdit.value = false
  editForm.value = { name: '', code: '', description: '', permissions: [] }
  editVisible.value = true
}

function openEdit(row: any) {
  isEdit.value = true
  editId.value = row.id
  const perms = Array.isArray(row.permissions) ? [...row.permissions] : []
  editForm.value = { name: row.name, code: row.code, description: row.description || '', permissions: perms }
  editVisible.value = true
}

async function handleSave() {
  try {
    if (isEdit.value) {
      await request.put(`/admin/system/roles/${editId.value}`, editForm.value)
    } else {
      await request.post('/admin/system/roles', editForm.value)
    }
    ElMessage.success('保存成功')
    editVisible.value = false
    fetchData()
  } catch { /* ignore */ }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该角色？正在使用该角色的账号将失去对应权限。')
    await request.delete(`/admin/system/roles/${id}`)
    ElMessage.success('已删除')
    fetchData()
  } catch { /* cancelled */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>角色管理</h3>
      <el-button type="primary" @click="openCreate">新增角色</el-button>
    </div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="编码" width="150" />
        <el-table-column label="权限" min-width="300">
          <template #default="{ row }">
            <el-tag
              v-for="(p, i) in (Array.isArray(row.permissions) ? row.permissions : [])"
              :key="i"
              size="small"
              style="margin-right:4px;margin-bottom:2px"
            >
              {{ p }}
            </el-tag>
            <span v-if="!row.permissions || row.permissions.length === 0" style="color:#ccc">无特殊权限（仅基础访问）</span>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="180">
          <template #default="{ row }">{{ row.description || '—' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="600px">
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editForm.name" placeholder="例如：运营管理员" />
        </el-form-item>
        <el-form-item label="编码">
          <el-input v-model="editForm.code" placeholder="例如：operator" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" placeholder="角色说明" />
        </el-form-item>
        <el-form-item label="权限配置">
          <div v-for="group in permissionGroups" :key="group.label" style="margin-bottom:12px">
            <el-checkbox
              :model-value="isGroupAllChecked(group)"
              :indeterminate="isGroupIndeterminate(group)"
              @change="toggleGroup(group)"
              style="font-weight:bold;margin-bottom:4px"
            >
              {{ group.label }}
            </el-checkbox>
            <div style="margin-left:24px">
              <el-checkbox
                v-for="perm in group.permissions"
                :key="perm.value"
                :model-value="hasPermission(perm.value)"
                @change="togglePermission(perm.value)"
              >
                {{ perm.label }}
              </el-checkbox>
            </div>
          </div>
          <div style="color:#909399;font-size:12px;margin-top:8px">
            未勾选任何权限的角色仅能查看预约记录和统计数据（基础权限）
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
