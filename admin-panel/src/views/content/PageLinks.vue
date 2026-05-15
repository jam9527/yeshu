<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'
import request from '../../api/request'

interface PageLink {
  name: string
  path: string
  desc?: string
}

interface DynamicItem {
  id: number
  title?: string
  name?: string
}

const staticLinks = ref<PageLink[]>([
  { name: '首页', path: '/pages/home/index', desc: 'DIY 配置的首页' },
  { name: '展厅导览', path: '/pages/exhibitions/index', desc: '全部展厅列表' },
  { name: '展厅详情', path: '/pages/exhibition-detail/index?id=', desc: '需拼接具体展厅 ID' },
  { name: '活动资讯', path: '/pages/activities/index', desc: '全部活动列表' },
  { name: '活动详情', path: '/pages/activity-detail/index?id=', desc: '需拼接具体活动 ID' },
  { name: '个人预约', path: '/pages/personal-reservation/index' },
  { name: '团队预约', path: '/pages/team-reservation/index' },
  { name: '快捷检票', path: '/pages/quick-check/index' },
  { name: '我的预约', path: '/pages/my-reservations/index' },
  { name: '预约详情', path: '/pages/reservation-detail/index?id=', desc: '需拼接预约 ID' },
  { name: '个人信息', path: '/pages/profile/index' },
  { name: '常见问题', path: '/pages/faq/index' },
  { name: '意见反馈', path: '/pages/feedback/index' },
  { name: '推广中心', path: '/pages/promotion-center/index' },
  { name: '推广员申请', path: '/pages/promotion-apply/index' },
  { name: '实人认证列表', path: '/pages/real-name-list/index' },
  { name: '实人认证编辑', path: '/pages/real-name-edit/index' },
])

const exhibitions = ref<DynamicItem[]>([])
const activities = ref<DynamicItem[]>([])
const loading = ref(false)

async function fetchDynamicPages() {
  loading.value = true
  try {
    const [exhRes, actRes] = await Promise.all([
      request.get('/exhibitions').catch(() => []),
      request.get('/activities').catch(() => []),
    ])
    exhibitions.value = (exhRes as any).data || exhRes || []
    activities.value = (actRes as any).data || actRes || []
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function copy(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    // fallback
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制到剪贴板')
  })
}

onMounted(fetchDynamicPages)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>页面链接</h3>
      <el-button type="primary" @click="fetchDynamicPages" :loading="loading">刷新列表</el-button>
    </div>

    <!-- 固定页面 -->
    <el-card class="link-card">
      <template #header><span>固定页面</span></template>
      <div class="link-grid">
        <div v-for="link in staticLinks" :key="link.path" class="link-item">
          <div class="link-info">
            <span class="link-name">{{ link.name }}</span>
            <code class="link-path">{{ link.path }}</code>
            <span v-if="link.desc" class="link-desc">{{ link.desc }}</span>
          </div>
          <el-button size="small" type="primary" plain @click="copy(link.path)">
            复制
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 展厅详情链接 -->
    <el-card class="link-card">
      <template #header><span>展厅详情页（{{ exhibitions.length }} 个）</span></template>
      <div class="link-grid" v-if="exhibitions.length > 0">
        <div v-for="exh in exhibitions" :key="'exh-' + exh.id" class="link-item">
          <div class="link-info">
            <span class="link-name">{{ exh.name }}</span>
            <code class="link-path">/pages/exhibition-detail/index?id={{ exh.id }}</code>
          </div>
          <el-button size="small" type="primary" plain @click="copy('/pages/exhibition-detail/index?id=' + exh.id)">
            复制
          </el-button>
        </div>
      </div>
      <el-empty v-else description="暂无展厅数据" :image-size="80" />
    </el-card>

    <!-- 活动详情链接 -->
    <el-card class="link-card">
      <template #header><span>活动详情页（{{ activities.length }} 个）</span></template>
      <div class="link-grid" v-if="activities.length > 0">
        <div v-for="act in activities" :key="'act-' + act.id" class="link-item">
          <div class="link-info">
            <span class="link-name">{{ act.title }}</span>
            <code class="link-path">/pages/activity-detail/index?id={{ act.id }}</code>
          </div>
          <el-button size="small" type="primary" plain @click="copy('/pages/activity-detail/index?id=' + act.id)">
            复制
          </el-button>
        </div>
      </div>
      <el-empty v-else description="暂无活动数据" :image-size="80" />
    </el-card>
  </div>
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.page-header h3 {
  margin: 0;
}
.link-card {
  margin-bottom: 16px;
}
.link-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.link-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f9f9f9;
  border-radius: 6px;
  transition: background 0.2s;
}
.link-item:hover {
  background: #eef1f5;
}
.link-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.link-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}
.link-path {
  font-size: 12px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.link-desc {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}
</style>
