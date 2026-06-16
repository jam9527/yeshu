<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { User, Document, Setting, ChatDotSquare, DataAnalysis, Tickets } from '@element-plus/icons-vue'

const router = useRouter()
const isCollapse = ref(false)

const adminNickname = computed(() => {
  try {
    const raw = localStorage.getItem('admin_user')
    if (raw) {
      const user = JSON.parse(raw)
      return user.nickname || user.username || '管理员'
    }
  } catch { /* ignore */ }
  return '管理员'
})

const menuItems = [
  { path: '/dashboard', label: '统计仪表盘', icon: DataAnalysis },
  { path: '/user/list', label: '用户管理', icon: User, children: [
    { path: '/user/list', label: '用户列表' },
    { path: '/user/blacklist', label: '黑名单管理' },
    { path: '/promotion/promoters', label: '推广员管理' },
    { path: '/promotion/poster', label: '推广海报管理' },
  ]},
  { path: '/reservation/review', label: '预约管理', icon: Tickets, children: [
    { path: '/reservation/review', label: '预约审核' },
    { path: '/reservation/records', label: '预约记录' },
    { path: '/reservation/stats', label: '预约统计' },
  ]},
  { path: '/content/exhibition', label: '内容管理', icon: Document, children: [
    { path: '/content/exhibition', label: '展厅管理' },
    { path: '/content/activity', label: '活动管理' },
    { path: '/content/faq', label: '常见问题' },
    { path: '/content/page-links', label: '页面链接' },
    { path: '/diy/page', label: 'DIY首页编辑' },
  ]},
  { path: '/config/date', label: '预约设置', icon: Setting, children: [
    { path: '/config/date', label: '日期与名额（日历）' },
    { path: '/config/notice', label: '预约须知' },
    { path: '/config/frequency', label: '次数限制' },
    { path: '/config/template', label: '申请表模板' },
    { path: '/config/require-real-name', label: '实名预约开关' },
    { path: '/config/login-page', label: '登录页自定义' },
  ]},
  { path: '/feedback', label: '用户反馈', icon: ChatDotSquare },
  { path: '/system/admin-user', label: '系统管理', icon: Setting, children: [
    { path: '/system/admin-user', label: '账号管理' },
    { path: '/system/role', label: '角色管理' },
    { path: '/system/log/login', label: '登录日志' },
    { path: '/system/log/operation', label: '操作日志' },
  ]},
]

function handleSelect(index: string) {
  router.push(index)
}

function handleLogout() {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  router.push('/login')
}
</script>

<template>
  <el-container style="height: 100vh">
    <!-- 侧边栏 -->
    <el-menu
      :default-active="router.currentRoute.value.path"
      :collapse="isCollapse"
      :router="true"
      background-color="#001529"
      text-color="#fff"
      active-text-color="#ffd700"
      style="overflow-y: auto"
      @select="handleSelect"
    >
      <div style="padding: 16px; text-align: center; border-bottom: 1px solid #0d253f">
        <h2 style="color: #ffd700; font-size: 16px; font-weight: bold">
          {{ isCollapse ? '椰' : '椰树预约管理' }}
        </h2>
      </div>

      <template v-for="item in menuItems" :key="item.path">
        <!-- 有子菜单 -->
        <el-sub-menu v-if="item.children" :index="item.path">
          <template #title>
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </template>
          <el-menu-item v-for="child in item.children" :key="child.path" :index="child.path">
            {{ child.label }}
          </el-menu-item>
        </el-sub-menu>
        <!-- 无子菜单 -->
        <el-menu-item v-else :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </template>
    </el-menu>

    <!-- 主内容区 -->
    <el-container>
      <el-header style="background: #fff; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: flex-end; padding: 0 20px; height: 50px;">
        <el-dropdown @command="handleLogout">
          <span style="cursor: pointer; color: #333; display: flex; align-items: center; gap: 6px;">
            {{ adminNickname }}
            <el-icon><User /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>

      <el-main style="background: #f5f6fa; padding: 20px;">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
