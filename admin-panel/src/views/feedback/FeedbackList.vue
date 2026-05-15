<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const p = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` } catch { return iso }
}

const list = ref([]); const total = ref(0); const page = ref(1); const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/feedbacks', { params: { page: page.value, pageSize: 10 } }); if (res.data) { list.value = res.data.records || []; total.value = res.data.total || 0 } } finally { loading.value = false }
}
onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>用户反馈</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="content" label="反馈内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="反馈时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'" size="small">{{ row.status === 'PENDING' ? '待处理' : '已处理' }}</el-tag></template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" style="margin-top:16px;text-align:right" />
    </el-card>
  </div>
</template>
