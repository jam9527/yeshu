<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const loading = ref(false)
const exporting = ref(false)
const stats = ref<any[]>([])
const startDate = ref('')
const endDate = ref('')

// 默认本月
function setDefaultDates() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  startDate.value = `${y}-${String(m + 1).padStart(2, '0')}-01`
  const lastDay = new Date(y, m + 1, 0).getDate()
  endDate.value = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function setToday() {
  const today = new Date().toISOString().split('T')[0]
  startDate.value = today
  endDate.value = today
  fetchStats()
}

function setThisMonth() {
  setDefaultDates()
  fetchStats()
}

function setLastMonth() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const lastM = m === 0 ? 11 : m - 1
  const lastY = m === 0 ? y - 1 : y
  startDate.value = `${lastY}-${String(lastM + 1).padStart(2, '0')}-01`
  const lastDay = new Date(lastY, lastM + 1, 0).getDate()
  endDate.value = `${lastY}-${String(lastM + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  fetchStats()
}

async function fetchStats() {
  loading.value = true
  try {
    const params: any = {}
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res: any = await request.get('/admin/promoters/stats', { params })
    if (res.data) {
      stats.value = res.data || []
    }
  } finally { loading.value = false }
}

async function exportCsv() {
  exporting.value = true
  try {
    const params: any = {}
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/admin/promoters/stats/export?` +
      new URLSearchParams(params).toString(),
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      }
    )
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `推广员业绩_${startDate.value || '全部'}_${endDate.value || '全部'}.csv`
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  } finally { exporting.value = false }
}

// 汇总行
const summary = computed(() => {
  if (!stats.value.length) return null
  const sum = (field: string) => stats.value.reduce((acc, s) => acc + (Number(s[field]) || 0), 0)
  return {
    personalReservations: sum('personalReservations'),
    teamReservations: sum('teamReservations'),
    totalReservations: sum('totalReservations'),
    personalVisitors: sum('personalVisitors'),
    teamVisitors: sum('teamVisitors'),
    totalVisitors: sum('totalVisitors'),
    personalActualVisitors: sum('personalActualVisitors'),
    teamActualVisitors: sum('teamActualVisitors'),
    totalActualVisitors: sum('totalActualVisitors'),
    personalVerified: sum('personalVerified'),
    teamVerified: sum('teamVerified'),
    totalVerified: sum('totalVerified'),
    adultVisitors: sum('adultVisitors'),
    childrenVisitors: sum('childrenVisitors'),
    islandCount: sum('islandCount'),
    offIslandCount: sum('offIslandCount'),
  }
})

function fmtRate(v: number) {
  return v != null ? v + '%' : '-'
}

onMounted(() => {
  setDefaultDates()
  fetchStats()
})
</script>

<template>
  <div>
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h3>推广业绩统计</h3>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <el-button size="small" @click="setToday">今日</el-button>
        <el-button size="small" @click="setThisMonth">本月</el-button>
        <el-button size="small" @click="setLastMonth">上月</el-button>
        <el-date-picker
          v-model="startDate"
          type="date"
          placeholder="开始日期"
          value-format="YYYY-MM-DD"
          size="small"
          style="width:140px"
        />
        <span style="color:#999">-</span>
        <el-date-picker
          v-model="endDate"
          type="date"
          placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="small"
          style="width:140px"
        />
        <el-button type="primary" size="small" @click="fetchStats">查询</el-button>
        <el-button type="success" size="small" :loading="exporting" @click="exportCsv">导出 CSV</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="stats" v-loading="loading" stripe border size="small" style="width:100%"
        :show-summary="false"
      >
        <el-table-column prop="promoterName" label="推广员" width="120" fixed="left" />
        <el-table-column prop="shortCode" label="短码" width="100" />
        <el-table-column prop="promoterPhone" label="手机号" width="130" />

        <el-table-column label="预约人数" align="center">
          <el-table-column prop="personalReservations" label="个人" width="70" sortable />
          <el-table-column prop="teamReservations" label="团队" width="70" sortable />
          <el-table-column prop="totalReservations" label="小计" width="70" sortable />
        </el-table-column>

        <el-table-column label="预约人次" align="center">
          <el-table-column prop="personalVisitors" label="个人" width="80" sortable />
          <el-table-column prop="teamVisitors" label="团队" width="80" sortable />
          <el-table-column prop="totalVisitors" label="小计" width="80" sortable />
        </el-table-column>

        <el-table-column label="实到人数" align="center">
          <el-table-column prop="personalActualVisitors" label="个人" width="80" sortable />
          <el-table-column prop="teamActualVisitors" label="团队" width="80" sortable />
          <el-table-column prop="totalActualVisitors" label="小计" width="80" sortable />
        </el-table-column>

        <el-table-column label="核销" align="center">
          <el-table-column prop="personalVerified" label="个人单数" width="85" sortable />
          <el-table-column prop="teamVerified" label="团队单数" width="85" sortable />
          <el-table-column prop="totalVerified" label="小计" width="70" sortable />
        </el-table-column>

        <el-table-column label="核销率" width="80" sortable prop="verificationRate">
          <template #default="{ row }">{{ fmtRate(row.verificationRate) }}</template>
        </el-table-column>

        <el-table-column label="大人/小孩" align="center">
          <el-table-column prop="adultVisitors" label="成人" width="70" sortable />
          <el-table-column prop="childrenVisitors" label="儿童" width="70" sortable />
        </el-table-column>

        <el-table-column label="岛内/外" align="center">
          <el-table-column prop="islandCount" label="岛内" width="70" sortable />
          <el-table-column prop="offIslandCount" label="岛外" width="70" sortable />
        </el-table-column>
      </el-table>

      <!-- 汇总行 -->
      <div v-if="summary" style="margin-top:12px;padding:10px 16px;background:#f5f7fa;border-radius:4px;font-size:13px;display:flex;flex-wrap:wrap;gap:4px 20px">
        <span><b>汇总：</b></span>
        <span>预约人数 个人{{ summary.personalReservations }} / 团队{{ summary.teamReservations }} / 共{{ summary.totalReservations }}</span>
        <span>预约人次 个人{{ summary.personalVisitors }} / 团队{{ summary.teamVisitors }} / 共{{ summary.totalVisitors }}</span>
        <span>实到 个人{{ summary.personalActualVisitors }} / 团队{{ summary.teamActualVisitors }} / 共{{ summary.totalActualVisitors }}</span>
        <span>核销 个人{{ summary.personalVerified }} / 团队{{ summary.teamVerified }} / 共{{ summary.totalVerified }}</span>
        <span>成人{{ summary.adultVisitors }} / 儿童{{ summary.childrenVisitors }}</span>
        <span>岛内{{ summary.islandCount }} / 岛外{{ summary.offIslandCount }}</span>
      </div>

      <el-empty v-if="!stats.length && !loading" description="暂无数据" />
    </el-card>
  </div>
</template>
