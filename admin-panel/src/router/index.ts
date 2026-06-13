import { createRouter, createWebHistory } from 'vue-router'
import MainLayout from '../layouts/MainLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/login/LoginView.vue'),
    },
    {
      path: '/',
      component: MainLayout,
      redirect: '/dashboard',
      children: [
        { path: 'dashboard', name: 'Dashboard', component: () => import('../views/dashboard/DashboardView.vue') },
        // 用户管理
        { path: 'user/list', name: 'UserList', component: () => import('../views/user/UserList.vue') },
        { path: 'user/blacklist', name: 'Blacklist', component: () => import('../views/user/Blacklist.vue') },
        // 预约管理
        { path: 'reservation/review', name: 'ReservationReview', component: () => import('../views/reservation/ReservationReview.vue') },
        { path: 'reservation/records', name: 'ReservationRecords', component: () => import('../views/reservation/ReservationRecords.vue') },
        { path: 'reservation/stats', name: 'ReservationStats', component: () => import('../views/reservation/ReservationStats.vue') },
        // 内容管理
        { path: 'content/exhibition', name: 'ExhibitionList', component: () => import('../views/content/ExhibitionList.vue') },
        { path: 'content/activity', name: 'ActivityList', component: () => import('../views/content/ActivityList.vue') },
        { path: 'content/banner', name: 'BannerList', component: () => import('../views/content/BannerList.vue') },
        { path: 'content/faq', name: 'FaqList', component: () => import('../views/content/FaqList.vue') },
        { path: 'content/page-links', name: 'PageLinks', component: () => import('../views/content/PageLinks.vue') },
        { path: 'diy/page', name: 'DiyPageEditor', component: () => import('../views/diy/DiyPageEditor.vue') },
        // 预约设置
        { path: 'config/date', name: 'DateConfig', component: () => import('../views/config/DateConfig.vue') },
        { path: 'config/notice', name: 'NoticeConfig', component: () => import('../views/config/NoticeConfig.vue') },
        { path: 'config/frequency', name: 'FrequencyConfig', component: () => import('../views/config/FrequencyConfig.vue') },
        { path: 'config/template', name: 'TemplateConfig', component: () => import('../views/config/TemplateConfig.vue') },
        { path: 'config/require-real-name', name: 'RequireRealNameConfig', component: () => import('../views/config/RequireRealNameConfig.vue') },
        // 反馈
        { path: 'feedback', name: 'FeedbackList', component: () => import('../views/feedback/FeedbackList.vue') },
        // 推广管理
        { path: 'promotion/promoters', name: 'PromoterManagement', component: () => import('../views/promotion/PromoterManagement.vue') },
        // 系统管理
        { path: 'system/admin-user', name: 'AdminUserList', component: () => import('../views/system/AdminUserList.vue') },
        { path: 'system/role', name: 'RoleList', component: () => import('../views/system/RoleList.vue') },
        { path: 'system/log/login', name: 'LoginLog', component: () => import('../views/system/LoginLog.vue') },
        { path: 'system/log/operation', name: 'OperationLog', component: () => import('../views/system/OperationLog.vue') },
      ],
    },
  ],
})

// 路由守卫：未登录跳转登录页
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
