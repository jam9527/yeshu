<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import request from '../../api/request'

const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const detailVisible = ref(false)
const currentDetail = ref<any>(null)

const attachmentFiles = computed(() => {
  const raw = currentDetail.value?.teamInfo?.attachmentFiles
  if (!raw) return []
  try { return typeof raw === 'string' ? JSON.parse(raw) : raw } catch { return [raw] }
})

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: '待核销', APPROVING: '审批中', APPROVED: '待核销',
    VERIFIED: '已使用', CANCELLED: '已取消', REJECTED: '已拒绝', EXPIRED: '已过期',
  }
  return map[status] || status
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/reservations/pending-review', { params: { page: page.value, pageSize: 10 } })
    if (res.data) {
      list.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } finally { loading.value = false }
}

async function handleApprove(id: number) {
  try {
    await ElMessageBox.confirm('确认通过该团队预约？', '审核确认')
    await request.put(`/admin/reservations/${id}/approve`)
    ElMessage.success('审核通过')
    fetchData()
  } catch { /* cancelled */ }
}

async function handleReject(id: number) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回确认')
    await request.put(`/admin/reservations/${id}/reject`, { reason: value })
    ElMessage.success('已驳回')
    fetchData()
  } catch { /* cancelled */ }
}

async function showDetail(id: number) {
  try {
    const res: any = await request.get(`/admin/reservations/${id}`)
    currentDetail.value = res.data
    detailVisible.value = true
  } catch { /* ignore */ }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>预约审核</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="reservationNo" label="预约编号" width="160" />
        <el-table-column prop="reservationDate" label="预约日期" width="120" />
        <el-table-column prop="sessionType" label="场次" width="80">
          <template #default="{ row }">
            <el-tag :type="row.sessionType === 'AM' ? 'warning' : 'primary'" size="small">
              {{ row.sessionType === 'AM' ? '上午' : '下午' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="visitorCount" label="人数" width="60" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'APPROVING' ? 'warning' : row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'info'" size="small">
              {{ row.status === 'APPROVING' ? '待审核' : row.status === 'APPROVED' ? '已通过' : row.status === 'REJECTED' ? '已驳回' : row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row.id)">详情</el-button>
            <el-button size="small" type="success" @click="handleApprove(row.id)" v-if="row.status === 'APPROVING'">通过</el-button>
            <el-button size="small" type="danger" @click="handleReject(row.id)" v-if="row.status === 'APPROVING'">驳回</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" />
      </div>
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="预约详情" width="700px">
      <template v-if="currentDetail">
        <el-descriptions :column="2" border style="margin-bottom:16px">
          <el-descriptions-item label="编号">{{ currentDetail.reservationNo }}</el-descriptions-item>
          <el-descriptions-item label="类型">{{ currentDetail.type === 'PERSONAL' ? '个人' : '团队' }}</el-descriptions-item>
          <el-descriptions-item label="日期">{{ currentDetail.reservationDate }}</el-descriptions-item>
          <el-descriptions-item label="场次">{{ currentDetail.sessionType === 'AM' ? '上午' : '下午' }}</el-descriptions-item>
          <el-descriptions-item label="人数">{{ currentDetail.visitorCount }}</el-descriptions-item>
          <el-descriptions-item label="状态">{{ statusLabel(currentDetail.status) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.rejectReason" label="驳回原因" :span="2">
            <span style="color:#e60012">{{ currentDetail.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 团队信息 -->
        <el-descriptions :column="2" border v-if="currentDetail.teamInfo" title="团队信息" style="margin-bottom:16px">
          <el-descriptions-item label="联系人">{{ currentDetail.teamInfo.contactName }}</el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ currentDetail.teamInfo.contactPhone }}</el-descriptions-item>
          <el-descriptions-item label="团队类型">{{ currentDetail.teamInfo.teamType }}</el-descriptions-item>
          <el-descriptions-item label="单位名称">{{ currentDetail.teamInfo.orgName }}</el-descriptions-item>
          <el-descriptions-item v-if="currentDetail.teamInfo.orgCode" label="信用代码">{{ currentDetail.teamInfo.orgCode }}</el-descriptions-item>
          <el-descriptions-item v-if="attachmentFiles.length" label="附件文件" :span="2">
            <div v-for="(f, i) in attachmentFiles" :key="i">
              <el-link :href="f" target="_blank" type="primary">{{ f.split('/').pop() }}</el-link>
            </div>
          </el-descriptions-item>
        </el-descriptions>

      </template>
    </el-dialog>
  </div>
</template>
