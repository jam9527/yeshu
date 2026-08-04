<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import request from '../../api/request'

const loading = ref(false)
const overview = ref({
  totalReservations: 0, todayReservations: 0, pendingReview: 0,
  totalVerified: 0, todayVerified: 0,
  todayVerificationRate: 0, totalVerificationRate: 0,
})

// 年龄段分布
const ageDistribution = ref<any[]>([])
const ageChartStyle = ref('')
const hasAgeData = ref(false)

// 热门日期
const popularDates = ref<any[]>([])
const popularLoading = ref(false)

// 实时配额
const quotaDate = ref(new Date().toISOString().split('T')[0])
const quota = ref<any>(null)
const quotaLoading = ref(false)

// 流量来源趋势
const trafficStartDate = ref('')
const trafficEndDate = ref('')
const trafficGranularity = ref<'day' | 'week' | 'month'>('day')
const trafficData = ref<any[]>([])
const trafficChart = ref<echarts.ECharts | null>(null)
const trafficChartRef = ref<HTMLDivElement | null>(null)

async function fetchOverview() {
  try {
    const res: any = await request.get('/admin/statistics/overview')
    if (res.data) overview.value = res.data
  } catch { /* ignore */ }
}

async function fetchAgeDistribution() {
  try {
    const res: any = await request.get('/admin/statistics/age-distribution')
    if (res.data) ageDistribution.value = res.data || []
    buildAgeChart()
  } catch { /* ignore */ }
}

function buildAgeChart() {
  if (!ageDistribution.value.length) return
  const colors = ['#91cc75', '#5470c6', '#fac858', '#ee6666', '#73c0de', '#3ba272']
  const total = ageDistribution.value.reduce((s: number, d: any) => s + d.count, 0)
  if (total === 0) { ageChartStyle.value = ''; hasAgeData.value = false; return }
  hasAgeData.value = true

  let accumulated = 0
  const sectors = ageDistribution.value.map((d: any, i: number) => {
    const pct = (d.count / total) * 100
    const start = accumulated
    accumulated += pct
    return { name: d.group, value: d.count, pct: d.percentage, color: colors[i % colors.length], start, end: accumulated }
  })
  const gradientParts = sectors.map((s: any) =>
    `${s.color} ${s.start}% ${s.end}%`
  ).join(', ')
  ageChartStyle.value = `conic-gradient(${gradientParts})`
}

async function fetchPopularDates() {
  popularLoading.value = true
  try {
    const now = new Date()
    const res: any = await request.get('/admin/statistics/popular-dates', {
      params: { year: now.getFullYear(), month: now.getMonth() + 1 }
    })
    if (res.data) popularDates.value = res.data || []
  } finally { popularLoading.value = false }
}

async function fetchQuota() {
  if (!quotaDate.value) return
  quotaLoading.value = true
  try {
    const res: any = await request.get('/admin/statistics/daily-quota', {
      params: { date: quotaDate.value }
    })
    if (res.data) quota.value = res.data
  } finally { quotaLoading.value = false }
}

// ===== 流量来源 =====
async function fetchTrafficSource() {
  loading.value = true
  try {
    const params: any = { granularity: trafficGranularity.value }
    if (trafficStartDate.value) params.startDate = trafficStartDate.value
    if (trafficEndDate.value) params.endDate = trafficEndDate.value
    const res: any = await request.get('/admin/statistics/traffic-source', { params })
    if (res.data) {
      trafficData.value = res.data
      renderTrafficChart()
    }
  } finally { loading.value = false }
}

function renderTrafficChart() {
  if (!trafficChartRef.value || !trafficData.value.length) return

  if (!trafficChart.value) {
    trafficChart.value = echarts.init(trafficChartRef.value)
  }

  const data = trafficData.value
  const periods = data.map((d: any) => d.period)
  const organicRes = data.map((d: any) => d.organic.reservations)
  const promoterRes = data.map((d: any) => d.promoter.reservations)
  const organicVer = data.map((d: any) => d.organic.verified)
  const promoterVer = data.map((d: any) => d.promoter.verified)

  trafficChart.value.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['自然预约', '推广预约', '自然核销', '推广核销'], bottom: 0 },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: { type: 'category', data: periods, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      { name: '自然预约', type: 'line', data: organicRes, smooth: true,
        lineStyle: { color: '#5470c6', width: 2 }, itemStyle: { color: '#5470c6' } },
      { name: '推广预约', type: 'line', data: promoterRes, smooth: true,
        lineStyle: { color: '#91cc75', width: 2 }, itemStyle: { color: '#91cc75' } },
      { name: '自然核销', type: 'line', data: organicVer,
        lineStyle: { color: '#5470c6', type: 'dashed', width: 1.5 }, itemStyle: { color: '#5470c6' } },
      { name: '推广核销', type: 'line', data: promoterVer,
        lineStyle: { color: '#91cc75', type: 'dashed', width: 1.5 }, itemStyle: { color: '#91cc75' } },
    ],
  })
}

// 流量来源汇总
const trafficSummary = ref({ organicReservations: 0, organicVerified: 0, promoterReservations: 0, promoterVerified: 0 })

watch(trafficData, (data) => {
  if (!data.length) return
  trafficSummary.value = {
    organicReservations: data.reduce((s: number, d: any) => s + d.organic.reservations, 0),
    organicVerified: data.reduce((s: number, d: any) => s + d.organic.verified, 0),
    promoterReservations: data.reduce((s: number, d: any) => s + d.promoter.reservations, 0),
    promoterVerified: data.reduce((s: number, d: any) => s + d.promoter.verified, 0),
  }
})

watch(trafficGranularity, () => { fetchTrafficSource() })
watch([trafficStartDate, trafficEndDate], () => { fetchTrafficSource() })
watch(quotaDate, fetchQuota)

// ===== 每日场次明细 =====
const sessionStats = ref<any[]>([])
const sessionLoading = ref(false)
const sessionStartDate = ref('')
const sessionEndDate = ref('')

function setDefaultSessionDates() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  sessionStartDate.value = `${y}-${String(m + 1).padStart(2, '0')}-01`
  sessionEndDate.value = now.toISOString().split('T')[0]
}

async function fetchSessionStats() {
  sessionLoading.value = true
  try {
    const params: any = {}
    if (sessionStartDate.value) params.startDate = sessionStartDate.value
    if (sessionEndDate.value) params.endDate = sessionEndDate.value
    const res: any = await request.get('/admin/statistics/reservation-stats', { params })
    if (res.data) sessionStats.value = res.data || []
  } finally { sessionLoading.value = false }
}

const sessionSummary = computed(() => {
  if (!sessionStats.value.length) return null
  const sum = (field: string) => sessionStats.value.reduce((acc, s) => acc + (Number(s[field]) || 0), 0)
  return {
    amReservations: sum('amReservations'), amVisitors: sum('amVisitors'),
    pmReservations: sum('pmReservations'), pmVisitors: sum('pmVisitors'),
    evReservations: sum('evReservations'), evVisitors: sum('evVisitors'),
    totalReservations: sum('totalReservations'), totalVisitors: sum('totalVisitors'),
  }
})

onMounted(() => {
  fetchOverview()
  fetchAgeDistribution()
  fetchPopularDates()
  fetchQuota()
  fetchTrafficSource()
  setDefaultSessionDates()
  fetchSessionStats()
})
</script>

<template>
  <div>
    <div class="page-header"><h3>预约统计</h3></div>

    <!-- 概览卡片 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">累计预约总数</div>
            <div class="stat-value" style="color: #e60012;">{{ overview.totalReservations }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">今日预约数</div>
            <div class="stat-value" style="color: #005bac;">{{ overview.todayReservations }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">累计核销率</div>
            <div class="stat-value" style="color: #67c23a;">{{ overview.totalVerificationRate }}%</div>
            <div class="stat-sub">{{ overview.totalVerified }} 已核销</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">待审核团队</div>
            <div class="stat-value" style="color: #e6a23c;">{{ overview.pendingReview }}</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 流量来源对比 -->
    <el-row :gutter="16" style="margin-bottom: 20px;">
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">自然流量预约</div>
            <div class="stat-value" style="color: #5470c6;">{{ trafficSummary.organicReservations }}</div>
            <div class="stat-sub">核销 {{ trafficSummary.organicVerified }} 次</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">自然流量核销率</div>
            <div class="stat-value" style="color: #5470c6;">
              {{ trafficSummary.organicReservations > 0 ? Math.round(trafficSummary.organicVerified / trafficSummary.organicReservations * 100) : 0 }}%
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">推广流量预约</div>
            <div class="stat-value" style="color: #91cc75;">{{ trafficSummary.promoterReservations }}</div>
            <div class="stat-sub">核销 {{ trafficSummary.promoterVerified }} 次</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">推广流量核销率</div>
            <div class="stat-value" style="color: #91cc75;">
              {{ trafficSummary.promoterReservations > 0 ? Math.round(trafficSummary.promoterVerified / trafficSummary.promoterReservations * 100) : 0 }}%
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 流量来源趋势图 -->
    <el-card shadow="hover" style="margin-bottom: 16px;" v-loading="loading">
      <template #header>
        <div class="chart-header">
          <span>流量来源趋势</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <el-radio-group v-model="trafficGranularity" size="small">
              <el-radio-button value="day">按日</el-radio-button>
              <el-radio-button value="week">按周</el-radio-button>
              <el-radio-button value="month">按月</el-radio-button>
            </el-radio-group>
            <el-date-picker
              v-model="trafficStartDate"
              type="date"
              placeholder="开始日期"
              value-format="YYYY-MM-DD"
              size="small"
              style="width:140px"
            />
            <span style="color:#999;">-</span>
            <el-date-picker
              v-model="trafficEndDate"
              type="date"
              placeholder="结束日期"
              value-format="YYYY-MM-DD"
              size="small"
              style="width:140px"
            />
          </div>
        </div>
      </template>
      <div ref="trafficChartRef" style="height:360px;" v-show="trafficData.length"></div>
      <el-empty v-if="!trafficData.length && !loading" description="暂无数据" />
    </el-card>

    <!-- 每日场次预约明细 -->
    <el-card shadow="hover" style="margin-bottom:16px" v-loading="sessionLoading">
      <template #header>
        <div class="chart-header">
          <span>每日场次预约明细</span>
          <div style="display:flex;align-items:center;gap:8px">
            <el-date-picker
              v-model="sessionStartDate"
              type="date"
              placeholder="开始日期"
              value-format="YYYY-MM-DD"
              size="small"
              style="width:140px"
            />
            <span style="color:#999">-</span>
            <el-date-picker
              v-model="sessionEndDate"
              type="date"
              placeholder="结束日期"
              value-format="YYYY-MM-DD"
              size="small"
              style="width:140px"
            />
            <el-button type="primary" size="small" @click="fetchSessionStats">查询</el-button>
          </div>
        </div>
      </template>

      <el-table :data="sessionStats" stripe border size="small" max-height="500" style="width:100%">
        <el-table-column prop="date" label="日期" width="120" fixed="left" />

        <el-table-column label="上午场" align="center">
          <el-table-column prop="amReservations" label="预约" width="70" sortable />
          <el-table-column prop="amVisitors" label="人次" width="70" sortable />
        </el-table-column>

        <el-table-column label="下午场" align="center">
          <el-table-column prop="pmReservations" label="预约" width="70" sortable />
          <el-table-column prop="pmVisitors" label="人次" width="70" sortable />
        </el-table-column>

        <el-table-column label="夜场" align="center">
          <el-table-column prop="evReservations" label="预约" width="70" sortable />
          <el-table-column prop="evVisitors" label="人次" width="70" sortable />
        </el-table-column>

        <el-table-column label="合计" align="center">
          <el-table-column prop="totalReservations" label="预约" width="70" sortable />
          <el-table-column prop="totalVisitors" label="人次" width="70" sortable />
        </el-table-column>
      </el-table>

      <!-- 汇总行 -->
      <div v-if="sessionSummary" style="margin-top:12px;padding:10px 16px;background:#f5f7fa;border-radius:4px;font-size:13px;display:flex;flex-wrap:wrap;gap:4px 20px">
        <span><b>汇总：</b></span>
        <span>上午 预约{{ sessionSummary.amReservations }} / 人次{{ sessionSummary.amVisitors }}</span>
        <span>下午 预约{{ sessionSummary.pmReservations }} / 人次{{ sessionSummary.pmVisitors }}</span>
        <span>夜场 预约{{ sessionSummary.evReservations }} / 人次{{ sessionSummary.evVisitors }}</span>
        <span>合计 预约{{ sessionSummary.totalReservations }} / 人次{{ sessionSummary.totalVisitors }}</span>
      </div>

      <el-empty v-if="!sessionStats.length && !sessionLoading" description="暂无数据" />
    </el-card>

    <el-row :gutter="16">
      <!-- 年龄段分布 -->
      <el-col :span="12">
        <el-card shadow="hover" style="margin-bottom: 16px;">
          <template #header>年龄段分布</template>
          <div v-if="hasAgeData" class="chart-container">
            <div class="pie-chart-wrapper">
              <div class="pie-chart" :style="{ background: ageChartStyle }"></div>
            </div>
            <div class="legend-list">
              <div v-for="d in ageDistribution" :key="d.group" class="legend-item">
                <span class="legend-dot" :style="{ background: ['#91cc75','#5470c6','#fac858','#ee6666','#73c0de','#3ba272'][ageDistribution.indexOf(d) % 6] }"></span>
                <span class="legend-label">{{ d.group }}岁</span>
                <span class="legend-value">{{ d.count }}人</span>
                <span class="legend-pct">({{ d.percentage }}%)</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无数据" />
        </el-card>
      </el-col>

      <!-- 本月热门日期 -->
      <el-col :span="12">
        <el-card shadow="hover" style="margin-bottom: 16px;">
          <template #header>本月热门预约日期 Top 5</template>
          <el-table :data="popularDates" v-loading="popularLoading" stripe size="small">
            <el-table-column label="排名" type="index" width="60" />
            <el-table-column prop="date" label="日期" />
            <el-table-column prop="count" label="预约数" sortable />
          </el-table>
          <el-empty v-if="!popularDates.length && !popularLoading" description="暂无数据" />
        </el-card>
      </el-col>
    </el-row>

    <!-- 实时剩余名额 -->
    <el-card shadow="hover">
      <template #header>
        <div class="quota-header">
          <span>实时剩余名额</span>
          <el-date-picker
            v-model="quotaDate"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 160px;"
            size="small"
          />
        </div>
      </template>

      <div v-if="quota" class="quota-grid">
        <div v-if="quota.available === false" class="quota-unavailable">
          该日期未开放预约
        </div>
        <template v-else>
          <div class="quota-session">
            <h4>上午场 <small>{{ quota.morning?.startTime }} - {{ quota.morning?.endTime }}</small></h4>
            <div class="quota-bars">
              <div class="quota-bar-item">
                <span class="bar-label">个人名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.morning ? ((quota.morning.personalTotal - quota.morning.personalRemaining) / quota.morning.personalTotal * 100) + '%' : '0%', background: '#e60012' }"></div>
                </div>
                <span class="bar-text">{{ quota.morning?.personalRemaining }}/{{ quota.morning?.personalTotal }}</span>
              </div>
              <div class="quota-bar-item">
                <span class="bar-label">团队名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.morning ? ((quota.morning.teamTotal - quota.morning.teamRemaining) / quota.morning.teamTotal * 100) + '%' : '0%', background: '#005bac' }"></div>
                </div>
                <span class="bar-text">{{ quota.morning?.teamRemaining }}/{{ quota.morning?.teamTotal }}</span>
              </div>
            </div>
          </div>
          <div class="quota-session">
            <h4>下午场 <small>{{ quota.afternoon?.startTime }} - {{ quota.afternoon?.endTime }}</small></h4>
            <div class="quota-bars">
              <div class="quota-bar-item">
                <span class="bar-label">个人名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.afternoon ? ((quota.afternoon.personalTotal - quota.afternoon.personalRemaining) / quota.afternoon.personalTotal * 100) + '%' : '0%', background: '#e60012' }"></div>
                </div>
                <span class="bar-text">{{ quota.afternoon?.personalRemaining }}/{{ quota.afternoon?.personalTotal }}</span>
              </div>
              <div class="quota-bar-item">
                <span class="bar-label">团队名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.afternoon ? ((quota.afternoon.teamTotal - quota.afternoon.teamRemaining) / quota.afternoon.teamTotal * 100) + '%' : '0%', background: '#005bac' }"></div>
                </div>
                <span class="bar-text">{{ quota.afternoon?.teamRemaining }}/{{ quota.afternoon?.teamTotal }}</span>
              </div>
            </div>
          </div>
          <div class="quota-session">
            <h4>夜场 <small>{{ quota.evening?.startTime }} - {{ quota.evening?.endTime }}</small></h4>
            <div class="quota-bars">
              <div class="quota-bar-item">
                <span class="bar-label">个人名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.evening ? ((quota.evening.personalTotal - quota.evening.personalRemaining) / quota.evening.personalTotal * 100) + '%' : '0%', background: '#e60012' }"></div>
                </div>
                <span class="bar-text">{{ quota.evening?.personalRemaining }}/{{ quota.evening?.personalTotal }}</span>
              </div>
              <div class="quota-bar-item">
                <span class="bar-label">团队名额</span>
                <div class="bar-track">
                  <div class="bar-fill" :style="{ width: quota.evening ? ((quota.evening.teamTotal - quota.evening.teamRemaining) / quota.evening.teamTotal * 100) + '%' : '0%', background: '#005bac' }"></div>
                </div>
                <span class="bar-text">{{ quota.evening?.teamRemaining }}/{{ quota.evening?.teamTotal }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
      <el-skeleton v-else :rows="4" animated />
    </el-card>
  </div>
</template>

<style scoped>
.stat-card { text-align: center; padding: 10px; }
.stat-label { font-size: 14px; color: #666; margin-bottom: 8px; }
.stat-value { font-size: 32px; font-weight: bold; }
.stat-sub { font-size: 12px; color: #999; margin-top: 4px; }

.chart-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }

.chart-container { display: flex; gap: 24px; align-items: center; }
.pie-chart-wrapper { flex-shrink: 0; }
.pie-chart { width: 140px; height: 140px; border-radius: 50%; }
.legend-list { flex: 1; }
.legend-item { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 13px; }
.legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.legend-label { width: 48px; }
.legend-value { color: #333; font-weight: 500; }
.legend-pct { color: #999; font-size: 12px; }

.quota-header { display: flex; justify-content: space-between; align-items: center; }
.quota-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.quota-unavailable { grid-column: 1 / -1; text-align: center; color: #999; padding: 40px; }
.quota-session h4 { margin: 0 0 12px; font-size: 15px; }
.quota-session h4 small { font-weight: normal; color: #999; font-size: 12px; }
.quota-bars { display: flex; flex-direction: column; gap: 10px; }
.quota-bar-item { display: flex; align-items: center; gap: 10px; }
.bar-label { width: 64px; font-size: 13px; color: #666; flex-shrink: 0; }
.bar-track { flex: 1; height: 20px; background: #f0f0f0; border-radius: 10px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 10px; transition: width 0.3s; min-width: 0; }
.bar-text { width: 72px; text-align: right; font-size: 13px; color: #333; flex-shrink: 0; }
</style>
