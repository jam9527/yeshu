<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const users = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const toggling = ref<number | null>(null)

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/users', { params: { page: page.value, pageSize: 10 } })
    if (res.data) {
      users.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

async function toggleVerifier(row: any) {
  toggling.value = row.id
  try {
    const newVal = !row.isVerifier
    await request.put(`/admin/users/${row.id}/verifier`, null, { params: { isVerifier: newVal } })
    row.isVerifier = newVal
    ElMessage.success(newVal ? '已设为核销员' : '已取消核销员')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    toggling.value = null
  }
}

async function togglePromoter(row: any) {
  toggling.value = row.id
  try {
    const newVal = !row.isPromoter
    await request.put(`/admin/users/${row.id}/promoter`, null, { params: { isPromoter: newVal } })
    row.isPromoter = newVal
    ElMessage.success(newVal ? '已设为推广员' : '已取消推广员')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <div>
    <div class="page-header"><h3>用户列表</h3></div>
    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="phone" label="手机号" width="150" />
        <el-table-column prop="isVerifier" label="核销员" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isVerifier ? 'success' : 'info'" size="small">
              {{ row.isVerifier ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="isPromoter" label="推广员" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isPromoter ? 'warning' : 'info'" size="small">
              {{ row.isPromoter ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="180">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="240">
          <template #default="{ row }">
            <el-button size="small" :type="row.isVerifier ? 'danger' : 'success'" :loading="toggling === row.id" @click="toggleVerifier(row)">
              {{ row.isVerifier ? '取消核销' : '设为核销' }}
            </el-button>
            <el-button size="small" :type="row.isPromoter ? 'danger' : 'warning'" :loading="toggling === row.id" @click="togglePromoter(row)">
              {{ row.isPromoter ? '取消推广' : '设为推广' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="10"
          layout="prev, pager, next"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>
