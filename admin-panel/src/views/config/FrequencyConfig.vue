<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([])

async function fetchData() {
  try { const res: any = await request.get('/admin/config/frequency-limits'); if (res.data) list.value = res.data } catch { /* ignore */ }
}

async function updateLimit(item: any) {
  try { await request.put(`/admin/config/frequency-limits/${item.id}`, { maxCount: item.maxCount }); ElMessage.success('更新成功') } catch { /* ignore */ }
}

async function toggleEnabled(item: any) {
  try { await request.put(`/admin/config/frequency-limits/${item.id}`, { enabled: !item.enabled }); ElMessage.success('更新成功') } catch { /* ignore */ }
}

function getPeriodLabel(period: string): string {
  const map: Record<string, string> = { WEEKLY: '每周', MONTHLY: '每月', YEARLY: '每年', TOTAL: '总共' }
  return map[period] || period
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>预约次数限制</h3></div>
    <el-card>
      <el-table :data="list" stripe>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="{ row }">{{ row.type === 'PERSONAL' ? '个人' : '团队' }}</template>
        </el-table-column>
        <el-table-column prop="period" label="周期" width="120">
          <template #default="{ row }">{{ getPeriodLabel(row.period) }}</template>
        </el-table-column>
        <el-table-column label="次数上限" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.maxCount" :min="0" size="small" @change="updateLimit(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="enabled" label="启用" width="80">
          <template #default="{ row }">
            <el-switch :model-value="row.enabled" @change="toggleEnabled(row)" />
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>
