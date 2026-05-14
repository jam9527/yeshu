<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([]); const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/blacklist'); if (res.data) list.value = res.data } finally { loading.value = false }
}

async function removeBlacklist(id: number) {
  try { await request.put(`/admin/users/${id}/blacklist`, { isBlacklisted: false }); ElMessage.success('已移出黑名单'); fetchData() } catch { /* ignore */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>黑名单管理</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="nickname" label="昵称" width="150" />
        <el-table-column prop="noShowCount" label="过期次数" width="100" />
        <el-table-column prop="blacklistUntil" label="到期时间" width="160" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }"><el-button size="small" type="success" @click="removeBlacklist(row.id)">移出黑名单</el-button></template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
