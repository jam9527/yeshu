<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const users = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const toggling = ref<number | null>(null)

// 拉黑弹窗
const blacklistVisible = ref(false)
const blacklistUserId = ref<number | null>(null)
const blacklistUserName = ref('')
const blacklistDuration = ref('30')
const blacklistCustomDate = ref('')
const blacklistSubmitting = ref(false)

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

async function fetchData() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/users', { params: { page: page.value, pageSize: 10 } })
    if (res.data) {
      users.value = res.data.records || []
      total.value = res.data.total || 0
    }
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

async function toggleVerifier(row: any) {
  toggling.value = row.id
  try {
    const newVal = !row.isVerifier
    await request.put(`/admin/users/${row.id}/verifier`, null, { params: { isVerifier: newVal } })
    row.isVerifier = newVal
    ElMessage.success(newVal ? '已设为核销员' : '已取消核销员')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    toggling.value = null
  }
}

async function togglePromoter(row: any) {
  toggling.value = row.id
  try {
    const newVal = !row.isPromoter
    await request.put(`/admin/users/${row.id}/promoter`, null, { params: { isPromoter: newVal } })
    row.isPromoter = newVal
    ElMessage.success(newVal ? '已设为推广员' : '已取消推广员')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    toggling.value = null
  }
}

function openBlacklistDialog(row: any) {
  blacklistUserId.value = row.id
  blacklistUserName.value = row.nickname || row.phone || row.id
  blacklistDuration.value = '30'
  blacklistCustomDate.value = ''
  blacklistVisible.value = true
}

async function confirmBlacklist() {
  if (blacklistSubmitting.value) return
  blacklistSubmitting.value = true
  try {
    let blacklistUntil: string
    if (blacklistDuration.value === 'custom') {
      blacklistUntil = blacklistCustomDate.value
      if (!blacklistUntil) {
        ElMessage.warning('请选择截止日期')
        blacklistSubmitting.value = false
        return
      }
    } else {
      const days = parseInt(blacklistDuration.value)
      const d = new Date()
      d.setDate(d.getDate() + days)
      blacklistUntil = d.toISOString().slice(0, 19).replace('T', ' ')
    }
    await request.put(`/admin/users/${blacklistUserId.value}/blacklist`, {
      isBlacklisted: true,
      blacklistUntil,
    })
    ElMessage.success('已拉黑')
    blacklistVisible.value = false
    fetchData()
  } catch {
    ElMessage.error('操作失败')
  } finally {
    blacklistSubmitting.value = false
  }
}

async function removeBlacklist(row: any) {
  toggling.value = row.id
  try {
    await request.put(`/admin/users/${row.id}/blacklist`, { isBlacklisted: false })
    row.isBlacklisted = false
    row.blacklistUntil = null
    ElMessage.success('已移出黑名单')
  } catch {
    ElMessage.error('操作失败')
  } finally {
    toggling.value = null
  }
}
</script>

<template>
  <div>
    <div class="page-header"><h3>用户列表</h3></div>
    <el-card>
      <el-table :data="users" v-loading="loading" stripe>
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="黑名单" width="140">
          <template #default="{ row }">
            <template v-if="row.isBlacklisted">
              <el-tag type="danger" size="small">已拉黑</el-tag>
              <div style="font-size:11px;color:#999;margin-top:2px">{{ formatDate(row.blacklistUntil) }}</div>
            </template>
            <el-tag v-else type="success" size="small">正常</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="核销员" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isVerifier ? 'success' : 'info'" size="small">
              {{ row.isVerifier ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="推广员" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isPromoter ? 'warning' : 'info'" size="small">
              {{ row.isPromoter ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" min-width="320">
          <template #default="{ row }">
            <el-button size="small" :type="row.isVerifier ? 'danger' : 'success'" :loading="toggling === row.id" @click="toggleVerifier(row)">
              {{ row.isVerifier ? '取消核销' : '设为核销' }}
            </el-button>
            <el-button size="small" :type="row.isPromoter ? 'danger' : 'warning'" :loading="toggling === row.id" @click="togglePromoter(row)">
              {{ row.isPromoter ? '取消推广' : '设为推广' }}
            </el-button>
            <el-button v-if="!row.isBlacklisted" size="small" type="danger" @click="openBlacklistDialog(row)">
              拉黑
            </el-button>
            <el-button v-else size="small" type="success" :loading="toggling === row.id" @click="removeBlacklist(row)">
              解除拉黑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 16px; text-align: right;">
        <el-pagination
          v-model:current-page="page"
          :total="total"
          :page-size="10"
          layout="prev, pager, next"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 拉黑弹窗 -->
    <el-dialog v-model="blacklistVisible" title="拉黑用户" width="420px">
      <div style="margin-bottom:12px;font-size:14px">
        用户：<strong>{{ blacklistUserName }}</strong>
      </div>
      <div style="margin-bottom:8px;font-size:13px;color:#666">拉黑时长</div>
      <el-radio-group v-model="blacklistDuration" style="display:flex;flex-direction:column;gap:10px">
        <el-radio value="7">7 天</el-radio>
        <el-radio value="30">30 天</el-radio>
        <el-radio value="90">90 天</el-radio>
        <el-radio value="custom">自定义日期</el-radio>
      </el-radio-group>
      <div v-if="blacklistDuration === 'custom'" style="margin-top:12px">
        <el-date-picker
          v-model="blacklistCustomDate"
          type="datetime"
          placeholder="选择截止日期"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width:100%"
        />
      </div>
      <template #footer>
        <el-button @click="blacklistVisible = false">取消</el-button>
        <el-button type="danger" :loading="blacklistSubmitting" @click="confirmBlacklist">确认拉黑</el-button>
      </template>
    </el-dialog>
  </div>
</template>
