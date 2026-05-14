<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'

const list = ref([]); const total = ref(0); const page = ref(1); const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/system/logs/operation', { params: { page: page.value, pageSize: 10 } }); if (res.data) { list.value = res.data.records || []; total.value = res.data.total || 0 } } finally { loading.value = false }
}
onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>操作日志</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="adminUserId" label="管理员" width="100" />
        <el-table-column prop="action" label="操作" width="100"><template #default="{ row }"><el-tag size="small">{{ row.action }}</el-tag></template></el-table-column>
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="resourceId" label="资源ID" width="80" />
        <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="时间" width="160" />
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" style="margin-top:16px;text-align:right" />
    </el-card>
  </div>
</template>
