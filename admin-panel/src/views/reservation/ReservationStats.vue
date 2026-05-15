<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import request from '../../api/request'

const loading = ref(false)
const overview = ref({ totalReservations: 0, todayReservations: 0, pendingReview: 0 })

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

  // Build conic gradient pie
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

watch(quotaDate, fetchQuota)

onMounted(() => {
  fetchOverview()
  fetchAgeDistribution()
  fetchPopularDates()
  fetchQuota()
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
            <div class="stat-label">待审核团队</div>
            <div class="stat-value" style="color: #e6a23c;">{{ overview.pendingReview }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">今日核销率</div>
            <div class="stat-value" style="color: #67c23a;">--</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

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
