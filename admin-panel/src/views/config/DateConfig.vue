<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'

interface DateConfigItem {
  id: number
  date: string
  isAvailable: boolean
  morningStart: string
  morningEnd: string
  afternoonStart: string
  afternoonEnd: string
  amPersonalQuota: number
  amTeamQuota: number
  pmPersonalQuota: number
  pmTeamQuota: number
}

interface CalendarDay {
  dateStr: string
  day: number
  isCurrentMonth: boolean
  config?: DateConfigItem
}

const year = ref(new Date().getFullYear())
const month = ref(new Date().getMonth() + 1) // 1-based
const configs = ref<DateConfigItem[]>([])
const loading = ref(false)
const selectedDate = ref<string | null>(null)
const showDialog = ref(false)
const batchMode = ref(false)
const batchDates = ref<string[]>([])
const editingConfig = ref<Partial<DateConfigItem>>({})

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const daysInMonth = computed(() => new Date(year.value, month.value, 0).getDate())
const firstDayOfWeek = computed(() => new Date(year.value, month.value - 1, 1).getDay())

const monthLabel = computed(() => `${year.value}年${String(month.value).padStart(2, '0')}月`)

const calendarDays = computed<CalendarDay[]>(() => {
  const days: CalendarDay[] = []
  // 上月填充
  const prevMonthDays = firstDayOfWeek.value
  const prevMonthDate = new Date(year.value, month.value - 1, 0)
  for (let i = prevMonthDays - 1; i >= 0; i--) {
    const d = prevMonthDate.getDate() - i
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ dateStr, day: d, isCurrentMonth: false })
  }
  // 当月
  for (let d = 1; d <= daysInMonth.value; d++) {
    const dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const config = configs.value.find(c => c.date === dateStr)
    days.push({ dateStr, day: d, isCurrentMonth: true, config })
  }
  return days
})

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/config/dates')
    if (res?.data) configs.value = res.data
  } finally { loading.value = false }
}

function prevMonth() {
  if (month.value === 1) { month.value = 12; year.value-- }
  else month.value--
  fetchData()
}

function nextMonth() {
  if (month.value === 12) { month.value = 1; year.value++ }
  else month.value++
  fetchData()
}

function getStatus(day: CalendarDay): 'available' | 'unavailable' | 'none' {
  if (!day.isCurrentMonth) return 'none'
  if (!day.config) return 'unavailable'
  return day.config.isAvailable ? 'available' : 'unavailable'
}

function clickDay(day: CalendarDay) {
  if (!day.isCurrentMonth) return
  if (batchMode.value) {
    const idx = batchDates.value.indexOf(day.dateStr)
    if (idx >= 0) batchDates.value.splice(idx, 1)
    else batchDates.value.push(day.dateStr)
    return
  }
  if (day.config) {
    selectedDate.value = day.dateStr
    editingConfig.value = { ...day.config }
    showDialog.value = true
  } else {
    ElMessageBox.confirm(`是否添加 ${day.dateStr} 为可预约日期？`, '添加日期', {
      confirmButtonText: '添加',
      cancelButtonText: '取消',
    }).then(async () => {
      try {
        await request.post('/admin/config/dates', { date: day.dateStr })
        ElMessage.success('添加成功')
        fetchData()
      } catch { /* ignore */ }
    }).catch(() => {})
  }
}

async function saveConfig() {
  if (!editingConfig.value.id) return
  try {
    await request.put(`/admin/config/dates/${editingConfig.value.id}`, {
      isAvailable: editingConfig.value.isAvailable,
      morningStart: editingConfig.value.morningStart,
      morningEnd: editingConfig.value.morningEnd,
      afternoonStart: editingConfig.value.afternoonStart,
      afternoonEnd: editingConfig.value.afternoonEnd,
      amPersonalQuota: editingConfig.value.amPersonalQuota,
      amTeamQuota: editingConfig.value.amTeamQuota,
      pmPersonalQuota: editingConfig.value.pmPersonalQuota,
      pmTeamQuota: editingConfig.value.pmTeamQuota,
    })
    ElMessage.success('保存成功')
    showDialog.value = false
    fetchData()
  } catch { /* ignore */ }
}

function toggleBatchMode() {
  batchMode.value = !batchMode.value
  batchDates.value = []
}

/** 批量设置: 将选中的日期全部设为指定配额 */
async function batchSet() {
  if (batchDates.value.length === 0) {
    ElMessage.warning('请先选择日期')
    return
  }
  ElMessageBox.prompt('请输入个人上午名额', '批量设置', {
    inputValue: '500',
    inputPlaceholder: '个人上午名额',
  }).then(async ({ value: amPersonal }) => {
    const pmPersonal = await ElMessageBox.prompt('请输入个人下午名额', '批量设置', {
      inputValue: '500',
      inputPlaceholder: '个人下午名额',
    }).then(r => r.value)
    const amTeam = await ElMessageBox.prompt('请输入团队上午名额', '批量设置', {
      inputValue: '200',
      inputPlaceholder: '团队上午名额',
    }).then(r => r.value)
    const pmTeam = await ElMessageBox.prompt('请输入团队下午名额', '批量设置', {
      inputValue: '200',
      inputPlaceholder: '团队下午名额',
    }).then(r => r.value)

    for (const dateStr of batchDates.value) {
      const existing = configs.value.find(c => c.date === dateStr)
      if (existing) {
        await request.put(`/admin/config/dates/${existing.id}`, {
          amPersonalQuota: Number(amPersonal),
          pmPersonalQuota: Number(pmPersonal),
          amTeamQuota: Number(amTeam),
          pmTeamQuota: Number(pmTeam),
          isAvailable: true,
        })
      } else {
        await request.post('/admin/config/dates', {
          date: dateStr,
          amPersonalQuota: Number(amPersonal),
          pmPersonalQuota: Number(pmPersonal),
          amTeamQuota: Number(amTeam),
          pmTeamQuota: Number(pmTeam),
        })
      }
    }
    ElMessage.success(`已设置 ${batchDates.value.length} 个日期`)
    batchMode.value = false
    batchDates.value = []
    fetchData()
  }).catch(() => {})
}

/** 一键生成本月所有日期（已有配置自动跳过） */
async function generateMonth() {
  ElMessageBox.confirm(
    `将为 ${monthLabel.value} 所有日期创建预约配置（各500/200名额），是否继续？`,
    '批量生成',
    { confirmButtonText: '生成', cancelButtonText: '取消' }
  ).then(async () => {
    let count = 0
    const total = daysInMonth.value
    for (let d = 1; d <= total; d++) {
      const dateStr = `${year.value}-${String(month.value).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      // 跳过已有配置的日期
      if (configs.value.some(c => c.date === dateStr)) continue
      try {
        await request.post('/admin/config/dates', { date: dateStr })
        count++
      } catch { /* ignore */ }
    }
    ElMessage.success(`成功生成 ${count} 个日期配置`)
    fetchData()
  }).catch(() => {})
}

/** 删除日期配置 */
async function deleteConfig(id: number) {
  ElMessageBox.confirm('确定删除该日期配置？', '删除确认', {
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(async () => {
    try {
      await request.delete(`/admin/config/dates/${id}`)
      ElMessage.success('已删除')
      showDialog.value = false
      fetchData()
    } catch { /* ignore */ }
  }).catch(() => {})
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>可预约日期管理</h3>
      <div class="header-actions">
        <el-button size="small" @click="toggleBatchMode">
          {{ batchMode ? '退出批量' : '批量设置' }}
        </el-button>
        <el-button size="small" type="primary" @click="generateMonth">
          一键生成本月
        </el-button>
      </div>
    </div>

    <el-card>
      <!-- 月份导航 -->
      <div class="calendar-nav">
        <el-button text @click="prevMonth">‹ 上月</el-button>
        <span class="calendar-title">{{ monthLabel }}</span>
        <el-button text @click="nextMonth">下月 ›</el-button>
      </div>

      <!-- 批量操作栏 -->
      <div class="batch-bar" v-if="batchMode">
        <span>已选 {{ batchDates.length }} 天</span>
        <el-button size="small" type="primary" :disabled="batchDates.length === 0" @click="batchSet">
          应用批量设置
        </el-button>
      </div>

      <!-- 星期行 -->
      <div class="week-row">
        <div class="week-cell" v-for="w in weekDays" :key="w">{{ w }}</div>
      </div>

      <!-- 日历网格 -->
      <div class="calendar-grid">
        <div
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="day-cell"
          :class="[
            getStatus(day),
            { 'batch-selected': batchDates.includes(day.dateStr), 'other-month': !day.isCurrentMonth }
          ]"
          @click="clickDay(day)"
        >
          <div class="day-number">{{ day.day }}</div>
          <div class="day-info" v-if="day.isCurrentMonth && day.config && day.config.isAvailable">
            <span class="info-line">个:{{ day.config.amPersonalQuota }}/{{ day.config.pmPersonalQuota }}</span>
            <span class="info-line">团:{{ day.config.amTeamQuota }}/{{ day.config.pmTeamQuota }}</span>
          </div>
          <div class="day-info unavailable" v-else-if="day.isCurrentMonth && day.config && !day.config.isAvailable">
            <span class="info-line">已关闭</span>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="showDialog" title="编辑日期配置" width="420px">
      <el-form label-width="100px" v-if="editingConfig">
        <el-form-item label="日期">
          <span>{{ selectedDate }}</span>
        </el-form-item>
        <el-form-item label="是否开放">
          <el-switch v-model="editingConfig.isAvailable" />
        </el-form-item>
        <el-divider>上午场</el-divider>
        <el-form-item label="开始时间">
          <el-time-picker v-model="editingConfig.morningStart" format="HH:mm" value-format="HH:mm" placeholder="09:00" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-picker v-model="editingConfig.morningEnd" format="HH:mm" value-format="HH:mm" placeholder="12:00" />
        </el-form-item>
        <el-form-item label="个人名额">
          <el-input-number v-model="editingConfig.amPersonalQuota" :min="0" />
        </el-form-item>
        <el-form-item label="团队名额">
          <el-input-number v-model="editingConfig.amTeamQuota" :min="0" />
        </el-form-item>
        <el-divider>下午场</el-divider>
        <el-form-item label="开始时间">
          <el-time-picker v-model="editingConfig.afternoonStart" format="HH:mm" value-format="HH:mm" placeholder="14:00" />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-time-picker v-model="editingConfig.afternoonEnd" format="HH:mm" value-format="HH:mm" placeholder="17:00" />
        </el-form-item>
        <el-form-item label="个人名额">
          <el-input-number v-model="editingConfig.pmPersonalQuota" :min="0" />
        </el-form-item>
        <el-form-item label="团队名额">
          <el-input-number v-model="editingConfig.pmTeamQuota" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="danger" text @click="deleteConfig(editingConfig.id)" v-if="editingConfig.id">删除</el-button>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="saveConfig">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.header-actions {
  display: flex;
  gap: 8px;
}
.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}
.calendar-title {
  font-size: 18px;
  font-weight: bold;
}
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #ecf5ff;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 14px;
  color: #409eff;
}
.week-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 4px;
}
.week-cell {
  padding: 8px;
  font-size: 13px;
  color: #909399;
  font-weight: bold;
}
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.day-cell {
  min-height: 72px;
  border: 1px solid #ebeef5;
  padding: 4px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}
.day-cell:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.day-cell.other-month {
  opacity: 0.3;
  pointer-events: none;
}
.day-cell.available {
  background: #f0f9eb;
  border-color: #e1f3d8;
}
.day-cell.unavailable {
  background: #fafafa;
}
.day-cell.batch-selected {
  background: #ecf5ff;
  border-color: #409eff;
  box-shadow: 0 0 0 1px #409eff;
}
.day-number {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 2px;
}
.day-info {
  font-size: 10px;
  line-height: 1.4;
  color: #67c23a;
}
.day-info.unavailable {
  color: #c0c4cc;
}
.info-line {
  display: block;
}
</style>
