<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'

const list = ref([]); const total = ref(0); const page = ref(1); const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/system/logs/login', { params: { page: page.value, pageSize: 10 } }); if (res.data) { list.value = res.data.records || []; total.value = res.data.total || 0 } } finally { loading.value = false }
}
onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>登录日志</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="ip" label="IP" width="150" />
        <el-table-column prop="loginResult" label="结果" width="100">
          <template #default="{ row }"><el-tag :type="row.loginResult === 'SUCCESS' ? 'success' : 'danger'" size="small">{{ row.loginResult }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="failReason" label="失败原因" min-width="200" />
        <el-table-column prop="loginAt" label="登录时间" width="160" />
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" style="margin-top:16px;text-align:right" />
    </el-card>
  </div>
</template>
