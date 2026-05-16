<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'

const records = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)

const statusMap: Record<string, { label: string; type: string }> = {
  PENDING: { label: '待核销', type: 'warning' },
  APPROVING: { label: '审批中', type: 'warning' },
  APPROVED: { label: '待核销', type: 'warning' },
  VERIFIED: { label: '已使用', type: 'success' },
  CANCELLED: { label: '已取消', type: 'info' },
  REJECTED: { label: '已拒绝', type: 'danger' },
  EXPIRED: { label: '已过期', type: 'danger' },
}

function statusLabel(status: string): string {
  return statusMap[status]?.label || status
}

function statusType(status: string): string {
  return statusMap[status]?.type || 'info'
}

function formatTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  // 格式化为北京时间: 2026-05-12 19:15:54
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false })
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/reservations', { params: { page: page.value, pageSize: 10 } })
    if (res.data) {
      records.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } finally { loading.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>预约记录</h3></div>
    <el-card>
      <el-table :data="records" v-loading="loading" stripe>
        <el-table-column prop="reservationNo" label="编号" width="150" />
        <el-table-column label="昵称" width="100">
          <template #default="{ row }">{{ row.user?.nickname || '-' }}</template>
        </el-table-column>
        <el-table-column label="手机号" width="120">
          <template #default="{ row }">{{ row.user?.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="OpenID" width="180">
          <template #default="{ row }">{{ row.user?.openid || '-' }}</template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">{{ row.type === 'PERSONAL' ? '个人' : '团队' }}</template>
        </el-table-column>
        <el-table-column prop="reservationDate" label="日期" width="110" />
        <el-table-column prop="sessionType" label="场次" width="80">
          <template #default="{ row }">{{ row.sessionType === 'AM' ? '上午' : '下午' }}</template>
        </el-table-column>
        <el-table-column prop="visitorCount" label="人数" width="60" />
        <el-table-column label="参观人" min-width="160">
          <template #default="{ row }">
            <div v-if="row.visitors && row.visitors.length > 0">
              <div v-for="(v, i) in row.visitors" :key="i" style="font-size:12px;line-height:1.6">
                {{ v.name }} <span style="color:#999">{{ v.idCard }}</span>
              </div>
            </div>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="取消/驳回原因" min-width="160">
          <template #default="{ row }">
            <span v-if="row.status === 'CANCELLED' && row.cancelReason" style="color:#e6a23c">{{ row.cancelReason }}</span>
            <span v-else-if="row.status === 'REJECTED' && row.rejectReason" style="color:#f56c6c">{{ row.rejectReason }}</span>
            <span v-else style="color:#ccc">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="verifierName" label="核销员" width="100" />
        <el-table-column prop="verifyTime" label="核销时间" width="170">
          <template #default="{ row }">{{ formatTime(row.verifyTime) }}</template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" style="margin-top:16px;text-align:right" />
    </el-card>
  </div>
</template>
