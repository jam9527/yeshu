<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../api/request'

const router = useRouter()
const overview = ref({ totalReservations: 0, todayReservations: 0, pendingReview: 0 })
const weeklyTrend = ref<any[]>([])
const loading = ref(true)

function maxCount(): number {
  if (!weeklyTrend.value.length) return 1
  return Math.max(...weeklyTrend.value.map((d: any) => parseInt(d.count || 0)), 1)
}

onMounted(async () => {
  try {
    const [overviewRes, trendRes] = await Promise.all([
      request.get('/admin/statistics/overview'),
      request.get('/admin/statistics/weekly-trend'),
    ])
    if ((overviewRes as any)?.data) overview.value = (overviewRes as any).data
    if ((trendRes as any)?.data) weeklyTrend.value = (trendRes as any).data
  } catch { /* ignore */ }
  finally { loading.value = false }
})
</script>

<template>
  <div>
    <div class="page-header"><h3>统计仪表盘</h3></div>

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
            <div class="stat-value" style="color: #e6a23c;">{{ overview.pendingReview || 0 }}</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover">
          <div class="stat-card">
            <div class="stat-label">系统状态</div>
            <div class="stat-value" style="color: #67c23a; font-size: 20px;">运行正常</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="16">
      <!-- 一周预约趋势 -->
      <el-col :span="16">
        <el-card shadow="hover" style="margin-bottom: 16px;">
          <template #header>一周预约趋势</template>
          <div class="bar-chart" v-loading="loading">
            <div v-if="weeklyTrend.length" class="bar-chart-inner">
              <div v-for="(d, i) in weeklyTrend" :key="i" class="bar-column">
                <div class="bar-value">{{ d.count }}</div>
                <div class="bar-track" :style="{ height: '120px' }">
                  <div
                    class="bar-fill"
                    :style="{ height: (d.count / maxCount() * 100) + '%', background: i === weeklyTrend.length - 1 ? '#e60012' : '#005bac' }"
                  ></div>
                </div>
                <div class="bar-label">{{ d.date?.slice(5) }}</div>
              </div>
            </div>
            <el-empty v-else description="暂无数据" />
          </div>
        </el-card>
      </el-col>

      <!-- 快捷入口 -->
      <el-col :span="8">
        <el-card shadow="hover" style="margin-bottom: 16px;">
          <template #header>快捷入口</template>
          <div class="quick-links">
            <el-button type="primary" class="quick-btn" @click="router.push('/reservation/review')">
              预约审核
            </el-button>
            <el-button class="quick-btn" @click="router.push('/reservation/stats')">
              预约统计
            </el-button>
            <el-button class="quick-btn" @click="router.push('/content/exhibition')">
              展厅管理
            </el-button>
            <el-button class="quick-btn" @click="router.push('/content/activity')">
              活动管理
            </el-button>
            <el-button class="quick-btn" @click="router.push('/config/date')">
              日期设置
            </el-button>
            <el-button class="quick-btn" @click="router.push('/config/quota')">
              名额设置
            </el-button>
          </div>
        </el-card>

        <!-- 今日快速概览 -->
        <el-card shadow="hover">
          <template #header>今日概览</template>
          <div class="today-summary">
            <div class="today-item">
              <span class="today-label">今日预约</span>
              <span class="today-value" style="color:#005bac">{{ overview.todayReservations }}</span>
            </div>
            <div class="today-item">
              <span class="today-label">待审核</span>
              <span class="today-value" style="color:#e6a23c">{{ overview.pendingReview || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.stat-card { text-align: center; padding: 10px; }
.stat-label { font-size: 14px; color: #666; margin-bottom: 8px; }
.stat-value { font-size: 32px; font-weight: bold; }

.bar-chart { min-height: 180px; }
.bar-chart-inner { display: flex; align-items: flex-end; justify-content: space-around; height: 180px; padding: 0 10px; }
.bar-column { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; }
.bar-column .bar-value { font-size: 12px; color: #666; }
.bar-track { width: 32px; display: flex; align-items: flex-end; }
.bar-fill { width: 100%; border-radius: 4px 4px 0 0; transition: height 0.3s; min-height: 4px; }
.bar-column .bar-label { font-size: 12px; color: #999; }

.quick-links { display: flex; flex-direction: column; gap: 8px; }
.quick-btn { width: 100%; justify-content: flex-start; }

.today-summary { display: flex; flex-direction: column; gap: 12px; }
.today-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
.today-item:last-child { border-bottom: none; }
.today-label { font-size: 14px; color: #666; }
.today-value { font-size: 20px; font-weight: bold; }
</style>
