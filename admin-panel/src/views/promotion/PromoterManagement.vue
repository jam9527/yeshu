<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'

const activeTab = ref('promoters')
const loading = ref(false)
// 推广员列表
const promoters = ref([])
const promoterTotal = ref(0)
const promoterPage = ref(1)
// 申请列表
const applications = ref([])
const appTotal = ref(0)
const appPage = ref(1)
// 二维码弹窗
const qrDialog = ref(false)
const qrImage = ref('')
const qrToken = ref('')
const generating = ref(false)

async function fetchPromoters() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/promoters', { params: { page: promoterPage.value, pageSize: 20 } })
    if (res.data) {
      promoters.value = res.data.records || []
      promoterTotal.value = res.data.total || 0
    }
  } finally { loading.value = false }
}

async function fetchApplications() {
  loading.value = true
  try {
    const params: any = { page: appPage.value, pageSize: 20 }
    if (activeTab.value === 'pending') params.status = 'PENDING'
    const res: any = await request.get('/admin/promoters/applications', { params })
    if (res.data) {
      applications.value = res.data.records || []
      appTotal.value = res.data.total || 0
    }
  } finally { loading.value = false }
}

function onTabChange(tab: string) {
  activeTab.value = tab
  if (tab === 'promoters') fetchPromoters()
  else fetchApplications()
}

async function handleGenerateQr() {
  generating.value = true
  try {
    const res: any = await request.post('/admin/promoters/generate-qr')
    if (res.data) {
      qrImage.value = res.data.qrcode
      qrToken.value = res.data.token
      qrDialog.value = true
    }
  } finally { generating.value = false }
}

async function handleApprove(id: number) {
  try {
    await request.put(`/admin/promoters/applications/${id}/approve`)
    ElMessage.success('已通过')
    fetchApplications()
    fetchPromoters()
  } catch { /* ignore */ }
}

async function handleReject(id: number) {
  try {
    const { value } = await ElMessageBox.prompt('请输入驳回原因', '驳回申请')
    await request.put(`/admin/promoters/applications/${id}/reject`, { remark: value })
    ElMessage.success('已驳回')
    fetchApplications()
  } catch { /* cancelled */ }
}

async function handleDisable(userId: number, name: string) {
  try {
    await ElMessageBox.confirm(`确定取消「${name}」的推广员资格？`)
    await request.put(`/admin/promoters/${userId}/disable`)
    ElMessage.success('已取消')
    fetchPromoters()
  } catch { /* cancelled */ }
}

onMounted(() => fetchPromoters())
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center">
      <h3>推广员管理</h3>
      <el-button type="primary" :loading="generating" @click="handleGenerateQr">添加推广员</el-button>
    </div>

    <el-card>
      <el-tabs :model-value="activeTab" @tab-change="onTabChange">
        <el-tab-pane label="推广员列表" name="promoters">
          <el-table :data="promoters" v-loading="loading && activeTab === 'promoters'" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column prop="nickname" label="昵称" width="120" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column label="推广数据" min-width="300">
              <template #default="{ row }">
                <span style="margin-right:12px">分享: {{ row.stats?.totalClicks || 0 }}</span>
                <span style="margin-right:12px">注册: {{ row.stats?.totalRegisters || 0 }}</span>
                <span style="margin-right:12px">预约: 个人{{ row.stats?.totalReservationsPersonal || 0 }} 团队{{ row.stats?.totalReservationsTeam || 0 }}</span>
                <span>核销: 个人{{ row.stats?.totalVerifiedPersonal || 0 }} 团队{{ row.stats?.totalVerifiedTeam || 0 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="成为推广员时间" width="170">
              <template #default="{ row }">{{ row.updatedAt ? new Date(row.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }).replace(/\//g, '-') : '' }}</template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button type="danger" link size="small" @click="handleDisable(row.id, row.nickname || row.id)">取消资格</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:16px;text-align:right">
            <el-pagination v-model:current-page="promoterPage" :total="promoterTotal" :page-size="20" layout="prev, pager, next" @current-change="fetchPromoters" />
          </div>
        </el-tab-pane>

        <el-tab-pane label="待审核" name="pending">
          <el-table :data="applications" v-loading="loading && activeTab === 'pending'" stripe>
            <el-table-column prop="id" label="ID" width="60" />
            <el-table-column label="申请人" width="150">
              <template #default="{ row }">{{ row.user?.nickname || row.user?.phone || (row.userId === 0 ? '未扫码' : '用户' + row.userId) }}</template>
            </el-table-column>
            <el-table-column label="申请时间" width="170">
              <template #default="{ row }">{{ row.createdAt ? new Date(row.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }).replace(/\//g, '-') : '' }}</template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'">
                  {{ row.status === 'APPROVED' ? '已通过' : row.status === 'REJECTED' ? '已驳回' : '待审核' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
            <el-table-column label="操作" width="160" fixed="right">
              <template #default="{ row }">
                <el-button v-if="row.status === 'PENDING'" type="success" size="small" @click="handleApprove(row.id)">通过</el-button>
                <el-button v-if="row.status === 'PENDING'" type="danger" size="small" @click="handleReject(row.id)">驳回</el-button>
                <span v-else style="color:#999;font-size:13px">已处理</span>
              </template>
            </el-table-column>
          </el-table>
          <div style="margin-top:16px;text-align:right">
            <el-pagination v-model:current-page="appPage" :total="appTotal" :page-size="20" layout="prev, pager, next" @current-change="fetchApplications" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrDialog" title="推广邀请二维码" width="400px" :close-on-click-modal="false">
      <div style="text-align:center;padding:10px 0">
        <img v-if="qrImage" :src="qrImage" style="width:280px;height:280px;display:block;margin:0 auto" />
        <p style="color:#999;font-size:13px;margin-top:12px">
          让推广员使用微信扫描此二维码，<br />
          扫码后一键登录并自动提交推广申请
        </p>
        <p style="color:#999;font-size:12px">
          二维码Token: {{ qrToken }}
        </p>
      </div>
      <template #footer>
        <el-button @click="qrDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>
