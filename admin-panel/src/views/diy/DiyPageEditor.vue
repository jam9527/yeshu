<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'
import { useUpload } from '../../composables/useUpload'

interface ComponentDef {
  type: string
  label: string
  props: Record<string, any>
}

interface PageConfig {
  components: ComponentDef[]
}

interface DiyPageItem {
  id: number
  pageKey: string
  name: string
  config: PageConfig
  isActive: boolean
  version: number
  createdAt: string
  updatedAt: string
}

const list = ref<DiyPageItem[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editing = ref(false)
const currentId = ref<number | null>(null)

const form = reactive({
  name: '',
  pageKey: 'home',
  config: { components: [] } as PageConfig,
})

const componentTypes = [
  { type: 'swiper', label: '轮播图', icon: '🖼️', defaultProps: { images: [], interval: 3000, height: 180 } },
  { type: 'func_grid', label: '功能入口', icon: '🔲', defaultProps: { columns: 3, items: [
    { icon: '📅', text: '个人预约', url: '/pages/personal-reservation/index', color: '#005bac' },
    { icon: '👥', text: '团队预约', url: '/pages/team-reservation/index', color: '#2d5a2d' },
    { icon: '🏛️', text: '展厅导览', url: '/pages/exhibitions/index', color: '#6a2a3a' },
    { icon: '🎪', text: '活动预约', url: '/pages/activities/index', color: '#5a3a2a' },
    { icon: '❓', text: '常见问题', url: '/pages/faq/index', color: '#3a2a5a' },
    { icon: '📋', text: '我的预约', url: '/pages/my-reservations/index', color: '#2a3a5a' },
  ]}},
  { type: 'slogan', label: '品牌标语', icon: '✨', defaultProps: { title: '椰树集团', subtitle: 'Coconut Palm Group', text: '国宴品质 · 民族品牌', titleColor: '#ffd700', bgStyle: 'dark' } },
  { type: 'text_block', label: '文本块', icon: '📝', defaultProps: { content: '请输入文本内容', style: { fontSize: '14px', color: '#333', padding: '12px' } } },
  { type: 'image', label: '图片', icon: '📷', defaultProps: { src: '', link: '', width: '100%' } },
  { type: 'exhibition_scroll', label: '展厅列表', icon: '🏛️', defaultProps: { title: '常设展厅', showMore: true } },
  { type: 'activity_list', label: '活动列表', icon: '🎪', defaultProps: { title: '活动资讯', showMore: true } },
  { type: 'notice_bar', label: '公告栏', icon: '📢', defaultProps: { text: '公告内容', backgroundColor: '#fff3e0' } },
  { type: 'divider', label: '分隔线', icon: '➖', defaultProps: { margin: '12px 0', color: '#eee' } },
  { type: 'button', label: '按钮', icon: '🔘', defaultProps: { text: '按钮', link: '', type: 'primary' } },
  { type: 'footer', label: '底部信息', icon: '📄', defaultProps: { brand: '椰树集团', copyright: '© 椰树集团 参观预约系统' } },
  { type: 'spacer', label: '空白间距', icon: '⬜', defaultProps: { height: 16 } },
]

// 默认首页模板（模拟当前硬编码布局）
const defaultHomeTemplate: ComponentDef[] = [
  { type: 'swiper', label: '轮播图', props: { images: [], interval: 3000, height: 220 } },
  { type: 'func_grid', label: '功能入口', props: { columns: 3, items: [
    { icon: '📅', text: '个人预约', url: '/pages/personal-reservation/index', color: '#005bac' },
    { icon: '👥', text: '团队预约', url: '/pages/team-reservation/index', color: '#2d5a2d' },
    { icon: '🏛️', text: '展厅导览', url: '/pages/exhibitions/index', color: '#6a2a3a' },
    { icon: '🎪', text: '活动预约', url: '/pages/activities/index', color: '#5a3a2a' },
    { icon: '❓', text: '常见问题', url: '/pages/faq/index', color: '#3a2a5a' },
    { icon: '📋', text: '我的预约', url: '/pages/my-reservations/index', color: '#2a3a5a' },
  ]}},
  { type: 'slogan', label: '品牌标语', props: { title: '椰树集团', subtitle: 'Coconut Palm Group', text: '国宴品质 · 民族品牌', titleColor: '#ffd700', bgStyle: 'dark' } },
  { type: 'exhibition_scroll', label: '展厅列表', props: { title: '常设展厅', showMore: true } },
  { type: 'activity_list', label: '活动列表', props: { title: '活动资讯', showMore: true } },
  { type: 'footer', label: '底部信息', props: { brand: '椰树集团', copyright: '© 椰树集团 参观预约系统' } },
]

const editingCompIndex = ref(-1)
const compDialogVisible = ref(false)
const editingComp = reactive<ComponentDef>({ type: '', label: '', props: {} })

// 菜单网格项编辑器
const menuItemDialogVisible = ref(false)
const editingMenuItemIndex = ref(-1)
const editingMenuItem = reactive({ icon: '', text: '', url: '', color: '#005bac' })

// 拖拽
const dragIndex = ref(-1)

const { uploadFile } = useUpload()

// ===== 手机预览 =====
const previewComponents = computed(() => form.config.components)
const hasDiySwiper = computed(() => previewComponents.value.some(c => c.type === 'swiper'))

// ===== API =====
async function fetchList() {
  loading.value = true
  try {
    const res: any = await request.get('/diy-page', { params: { pageKey: 'home' } })
    list.value = (res as any)?.data || []
  } finally { loading.value = false }
}

function openCreate() {
  editing.value = false
  currentId.value = null
  form.name = ''
  form.pageKey = 'home'
  form.config = { components: [] }
  dialogVisible.value = true
}

function openCreateWithTemplate() {
  editing.value = false
  currentId.value = null
  form.name = '首页默认布局'
  form.pageKey = 'home'
  form.config = { components: JSON.parse(JSON.stringify(defaultHomeTemplate)) }
  dialogVisible.value = true
}

function openEdit(item: DiyPageItem) {
  editing.value = true
  currentId.value = item.id
  form.name = item.name
  form.pageKey = item.pageKey
  form.config = JSON.parse(JSON.stringify(item.config))
  dialogVisible.value = true
}

async function handleSave() {
  if (!form.name.trim()) { ElMessage.warning('请输入页面名称'); return }
  try {
    if (editing.value && currentId.value) {
      await request.put(`/diy-page/${currentId.value}`, { name: form.name, config: form.config })
      ElMessage.success('已更新')
    } else {
      await request.post('/diy-page', { pageKey: form.pageKey, name: form.name, config: form.config })
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch { /* ignore */ }
}

function handleCancel() {
  if (form.config.components.length > 0) {
    ElMessageBox.confirm('将丢失未保存的修改，确定？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
      .then(() => { dialogVisible.value = false }).catch(() => {})
  } else {
    dialogVisible.value = false
  }
}

async function handlePublish(id: number) {
  try {
    await ElMessageBox.confirm('发布后将立即生效，确定发布？', '确认')
    await request.put(`/diy-page/${id}/publish`)
    ElMessage.success('已发布')
    fetchList()
  } catch { /* cancelled */ }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定删除该版本？', '确认', { type: 'warning' })
    await request.delete(`/diy-page/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch { /* cancelled */ }
}

// ===== 组件管理 =====
function addComponent(type: string) {
  const def = componentTypes.find(c => c.type === type)
  if (!def) return
  form.config.components.push({
    type: def.type,
    label: def.label,
    props: JSON.parse(JSON.stringify(def.defaultProps)),
  })
}

function removeComponent(index: number) {
  form.config.components.splice(index, 1)
}

function moveComponent(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= form.config.components.length) return
  const arr = form.config.components
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
}

// ===== 拖拽 =====
function onDragStart(index: number) {
  dragIndex.value = index
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(index: number) {
  if (dragIndex.value < 0 || dragIndex.value === index) return
  const arr = form.config.components
  const [removed] = arr.splice(dragIndex.value, 1)
  arr.splice(index, 0, removed)
  dragIndex.value = -1
}

// ===== 组件属性编辑 =====
function openCompEditor(index: number) {
  editingCompIndex.value = index
  const comp = form.config.components[index]
  Object.assign(editingComp, JSON.parse(JSON.stringify(comp)))
  compDialogVisible.value = true
}

function saveComp() {
  if (editingCompIndex.value < 0) return
  form.config.components[editingCompIndex.value] = {
    type: editingComp.type,
    label: editingComp.label,
    props: { ...editingComp.props },
  }
  compDialogVisible.value = false
  editingCompIndex.value = -1
}

// ===== 图片上传 =====
async function handleUploadSwiperImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      if (!editingComp.props.images) editingComp.props.images = []
      editingComp.props.images.push(url)
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

function removeSwiperImage(index: number) {
  editingComp.props.images.splice(index, 1)
}

async function handleUploadImageSrc() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      editingComp.props.src = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

// ===== 菜单项编辑器 =====
function openMenuItemEditor(index: number) {
  editingMenuItemIndex.value = index
  const item = editingComp.props.items[index] || {}
  Object.assign(editingMenuItem, { icon: item.icon || '', text: item.text || '', url: item.url || '', color: item.color || '#005bac' })
  menuItemDialogVisible.value = true
}

function addMenuItem() {
  if (!editingComp.props.items) editingComp.props.items = []
  editingMenuItemIndex.value = -1
  Object.assign(editingMenuItem, { icon: '📋', text: '新菜单', url: '', color: '#005bac' })
  menuItemDialogVisible.value = true
}

function saveMenuItem() {
  const item = { ...editingMenuItem }
  if (editingMenuItemIndex.value >= 0) {
    editingComp.props.items[editingMenuItemIndex.value] = item
  } else {
    editingComp.props.items.push(item)
  }
  menuItemDialogVisible.value = false
}

function removeMenuItem(index: number) {
  editingComp.props.items.splice(index, 1)
}

onMounted(fetchList)
</script>

<template>
  <div>
    <div class="page-header">
      <h3>首页DIY编辑</h3>
      <div>
        <el-button @click="openCreateWithTemplate">从默认模板创建</el-button>
        <el-button type="primary" @click="openCreate">新建空白版本</el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="version" label="版本" width="60" />
        <el-table-column prop="name" label="名称" min-width="150" />
        <el-table-column label="组件数" width="80">
          <template #default="{ row }">{{ row.config?.components?.length || 0 }}</template>
        </el-table-column>
        <el-table-column prop="isActive" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? '启用' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="170">
          <template #default="{ row }">
            {{ row.updatedAt ? new Date(row.updatedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="success" @click="handlePublish(row.id)" v-if="!row.isActive">发布</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="list.length === 0 && !loading" class="empty-state">
        暂无页面配置，点击"新建版本"创建首页布局
      </div>
    </el-card>

    <!-- ====== 可视化编辑弹窗 ====== -->
    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑版本' : '新建版本'"
      width="95%"
      fullscreen
      class="visual-editor-dialog"
    >
      <div class="editor-layout">
        <!-- 左侧：编辑器 -->
        <div class="editor-panel">
          <div class="editor-toolbar">
            <el-input v-model="form.name" placeholder="页面名称（如: 首页v3 春节版）" size="large" style="flex:1" />
            <el-dropdown trigger="click" @command="addComponent" style="margin-left:12px">
              <el-button type="primary" size="large">+ 添加组件</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="ct in componentTypes" :key="ct.type" :command="ct.type">
                    {{ ct.icon }} {{ ct.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <!-- 组件列表 -->
          <div class="comp-list" v-if="form.config.components.length > 0">
            <div
              v-for="(comp, index) in form.config.components"
              :key="index"
              class="comp-item"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover="onDragOver"
              @drop="onDrop(index)"
              :class="{ 'dragging': dragIndex === index }"
            >
              <!-- 拖拽手柄 -->
              <div class="comp-drag-handle">⠿</div>

              <!-- 组件迷你预览 -->
              <div class="comp-mini-preview" @click="openCompEditor(index)">
                <!-- 轮播图预览 -->
                <div v-if="comp.type === 'swiper'" class="mini-swiper" :style="{ height: Math.min(comp.props.height || 180, 100) + 'px' }">
                  <div v-if="comp.props.images?.length" class="mini-swiper-track">
                    <img v-for="(img, i) in comp.props.images.slice(0, 3)" :key="i" :src="img" class="mini-swiper-img" />
                    <span v-if="comp.props.images.length > 3" class="mini-swiper-more">+{{ comp.props.images.length - 3 }}</span>
                  </div>
                  <div v-else class="mini-empty">暂无图片</div>
                </div>

                <!-- 功能入口预览 -->
                <div v-else-if="comp.type === 'func_grid'" class="mini-grid">
                  <div v-for="(item, i) in (comp.props.items || []).slice(0, 4)" :key="i" class="mini-grid-item" :style="{ width: (100 / Math.min(comp.props.columns || 3, 4)) + '%' }">
                    <div class="mini-grid-icon" :style="{ background: item.color || '#005bac' }">{{ item.icon || '📋' }}</div>
                    <span class="mini-grid-label">{{ item.text || '' }}</span>
                  </div>
                  <div v-if="!comp.props.items?.length" class="mini-empty">暂无菜单项</div>
                </div>

                <!-- 品牌标语预览 -->
                <div v-else-if="comp.type === 'slogan'" class="mini-slogan">
                  <div class="mini-slogan-title" :style="{ color: comp.props.titleColor || '#ffd700' }">{{ comp.props.title || '品牌名' }}</div>
                  <div class="mini-slogan-sub" v-if="comp.props.subtitle">{{ comp.props.subtitle }}</div>
                  <div class="mini-slogan-text" v-if="comp.props.text">{{ comp.props.text }}</div>
                </div>

                <!-- 文本块预览 -->
                <div v-else-if="comp.type === 'text_block'" class="mini-text" :style="comp.props.style">
                  <div v-html="(comp.props.content || '').slice(0, 80)"></div>
                </div>

                <!-- 图片预览 -->
                <div v-else-if="comp.type === 'image'" class="mini-image-wrap">
                  <img v-if="comp.props.src" :src="comp.props.src" class="mini-image" />
                  <div v-else class="mini-empty">暂无图片</div>
                </div>

                <!-- 展厅列表预览 -->
                <div v-else-if="comp.type === 'exhibition_scroll'" class="mini-section-preview">
                  <span class="mini-section-title">{{ comp.props.title || '展厅' }}</span>
                  <span class="mini-section-desc">横向滚动卡片 (自动加载)</span>
                </div>

                <!-- 活动列表预览 -->
                <div v-else-if="comp.type === 'activity_list'" class="mini-section-preview">
                  <span class="mini-section-title">{{ comp.props.title || '活动' }}</span>
                  <span class="mini-section-desc">纵向列表 (自动加载)</span>
                </div>

                <!-- 公告栏预览 -->
                <div v-else-if="comp.type === 'notice_bar'" class="mini-notice" :style="{ background: comp.props.backgroundColor || '#fff3e0' }">
                  📢 {{ (comp.props.text || '').slice(0, 30) }}
                </div>

                <!-- 分隔线预览 -->
                <div v-else-if="comp.type === 'divider'" class="mini-divider-wrap">
                  <div class="mini-divider" :style="{ background: comp.props.color || '#eee' }"></div>
                </div>

                <!-- 按钮预览 -->
                <div v-else-if="comp.type === 'button'" class="mini-button-wrap">
                  <div class="mini-button">{{ comp.props.text || '按钮' }}</div>
                </div>

                <!-- 底部信息预览 -->
                <div v-else-if="comp.type === 'footer'" class="mini-footer-preview">
                  <span>{{ comp.props.brand || '品牌' }}</span>
                </div>

                <!-- 空白间距预览 -->
                <div v-else-if="comp.type === 'spacer'" class="mini-spacer" :style="{ height: Math.min(comp.props.height || 16, 60) + 'px' }"></div>
              </div>

              <!-- 组件操作 -->
              <div class="comp-actions">
                <span class="comp-label">{{ comp.label }}</span>
                <div class="comp-btns">
                  <el-button size="small" text @click="moveComponent(index, -1)" :disabled="index === 0" title="上移">↑</el-button>
                  <el-button size="small" text @click="moveComponent(index, 1)" :disabled="index === form.config.components.length - 1" title="下移">↓</el-button>
                  <el-button size="small" text type="primary" @click="openCompEditor(index)" title="编辑属性">⚙️</el-button>
                  <el-button size="small" text type="danger" @click="removeComponent(index)" title="删除">🗑️</el-button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="comp-empty">
            <div class="comp-empty-icon">🧩</div>
            <p>点击上方「+ 添加组件」开始搭建首页</p>
            <div class="comp-empty-tips">
              <span v-for="ct in componentTypes" :key="ct.type" class="comp-empty-tip">{{ ct.icon }} {{ ct.label }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧：手机预览 -->
        <div class="preview-panel">
          <div class="preview-header">📱 手机预览</div>
          <div class="phone-frame">
            <div class="phone-notch"></div>
            <div class="phone-content">
              <!-- 预览组件列表 -->
              <template v-for="(comp, index) in previewComponents" :key="index">
                <!-- 轮播图 -->
                <div v-if="comp.type === 'swiper'" class="pv-swiper" :style="{ height: (comp.props.height || 180) + 'px' }">
                  <div v-if="comp.props.images?.length" class="pv-swiper-track">
                    <img v-for="(img, i) in comp.props.images" :key="i" :src="img" class="pv-swiper-img" />
                  </div>
                  <div v-else class="pv-placeholder">轮播图区域</div>
                </div>

                <!-- 功能入口 -->
                <div v-else-if="comp.type === 'func_grid'" class="pv-func-grid">
                  <div v-for="(item, i) in comp.props.items || []" :key="i" class="pv-func-item" :style="{ width: (100 / Math.min(comp.props.columns || 3, 4)) + '%' }">
                    <div class="pv-func-icon" :style="{ background: item.color || '#005bac' }">{{ item.icon || '📋' }}</div>
                    <span class="pv-func-label">{{ item.text || '' }}</span>
                  </div>
                </div>

                <!-- 品牌标语 -->
                <div v-else-if="comp.type === 'slogan'" class="pv-slogan">
                  <div class="pv-slogan-title" :style="{ color: comp.props.titleColor || '#ffd700' }">{{ comp.props.title || '品牌名称' }}</div>
                  <div class="pv-slogan-sub" v-if="comp.props.subtitle">{{ comp.props.subtitle }}</div>
                  <div class="pv-slogan-text" v-if="comp.props.text">{{ comp.props.text }}</div>
                </div>

                <!-- 文本块 -->
                <div v-else-if="comp.type === 'text_block'" class="pv-text" :style="comp.props.style">
                  <div v-if="comp.props.content" v-html="comp.props.content"></div>
                  <span v-else style="color:#999">文本内容</span>
                </div>

                <!-- 图片 -->
                <div v-else-if="comp.type === 'image'" class="pv-image-wrap">
                  <img v-if="comp.props.src" :src="comp.props.src" class="pv-image" :style="{ width: comp.props.width || '100%' }" />
                  <div v-else class="pv-placeholder">图片区域</div>
                </div>

                <!-- 展厅列表 -->
                <div v-else-if="comp.type === 'exhibition_scroll'" class="pv-section">
                  <div class="pv-section-header">
                    <span class="pv-section-title">{{ comp.props.title || '常设展厅' }}</span>
                    <span class="pv-section-more" v-if="comp.props.showMore !== false">查看全部 ›</span>
                  </div>
                  <div class="pv-section-scroll">
                    <div v-for="i in 3" :key="i" class="pv-section-card">
                      <div class="pv-section-card-img"></div>
                      <div class="pv-section-card-name">展厅 {{ i }}</div>
                    </div>
                  </div>
                </div>

                <!-- 活动列表 -->
                <div v-else-if="comp.type === 'activity_list'" class="pv-section">
                  <div class="pv-section-header">
                    <span class="pv-section-title">{{ comp.props.title || '活动资讯' }}</span>
                    <span class="pv-section-more" v-if="comp.props.showMore !== false">查看全部 ›</span>
                  </div>
                  <div v-for="i in 2" :key="i" class="pv-section-activity">
                    <span class="pv-section-tag">公告</span>
                    <span class="pv-section-activity-title">活动标题 {{ i }}</span>
                    <span class="pv-section-arrow">›</span>
                  </div>
                </div>

                <!-- 公告栏 -->
                <div v-else-if="comp.type === 'notice_bar'" class="pv-notice" :style="{ background: comp.props.backgroundColor || '#fff3e0' }">
                  📢 {{ comp.props.text || '公告内容' }}
                </div>

                <!-- 分隔线 -->
                <div v-else-if="comp.type === 'divider'" class="pv-divider-wrap">
                  <div class="pv-divider" :style="{ margin: comp.props.margin || '12px 0', background: comp.props.color || '#eee' }"></div>
                </div>

                <!-- 按钮 -->
                <div v-else-if="comp.type === 'button'" class="pv-btn-wrap">
                  <div class="pv-btn" :class="'pv-btn-' + (comp.props.type || 'primary')">{{ comp.props.text || '按钮' }}</div>
                </div>

                <!-- 底部信息 -->
                <div v-else-if="comp.type === 'footer'" class="pv-footer">
                  <div class="pv-footer-brand">{{ comp.props.brand || '品牌' }}</div>
                  <div class="pv-footer-copy">{{ comp.props.copyright || '版权信息' }}</div>
                </div>

                <!-- 空白间距 -->
                <div v-else-if="comp.type === 'spacer'" class="pv-spacer" :style="{ height: (comp.props.height || 16) + 'px' }"></div>
              </template>

              <!-- 无组件提示 -->
              <div v-if="previewComponents.length === 0" class="pv-empty">
                <div class="pv-empty-icon">📱</div>
                <p>添加组件后实时预览</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="handleCancel">取消</el-button>
        <el-button type="primary" @click="handleSave" size="large">保存版本</el-button>
      </template>
    </el-dialog>

    <!-- ====== 组件属性编辑弹窗 ====== -->
    <el-dialog v-model="compDialogVisible" title="编辑组件属性" width="650px" class="prop-editor-dialog">
      <el-form label-width="100px">
        <el-form-item label="组件类型">
          <el-tag size="large">{{ editingComp.label }}</el-tag>
        </el-form-item>

        <!-- 轮播图 -->
        <template v-if="editingComp.type === 'swiper'">
          <el-form-item label="图片列表">
            <div style="width:100%">
              <el-button size="small" type="primary" @click="handleUploadSwiperImage">+ 上传图片</el-button>
              <div v-if="editingComp.props.images?.length" class="swiper-image-list">
                <div v-for="(img, imgIdx) in editingComp.props.images" :key="imgIdx" class="swiper-image-item">
                  <img :src="img" class="swiper-image-preview" />
                  <el-button size="small" type="danger" circle class="swiper-image-del" @click="removeSwiperImage(imgIdx)">×</el-button>
                </div>
              </div>
              <div v-else style="color:#999;font-size:13px;margin-top:4px">暂无图片，点击上传</div>
            </div>
          </el-form-item>
          <el-form-item label="高度(px)">
            <el-input-number v-model="editingComp.props.height" :min="100" :max="400" />
          </el-form-item>
          <el-form-item label="切换间隔">
            <el-input-number v-model="editingComp.props.interval" :min="1000" :max="10000" :step="500" /> ms
          </el-form-item>
        </template>

        <!-- 菜单网格 / 功能入口 -->
        <template v-if="editingComp.type === 'menu_grid' || editingComp.type === 'func_grid'">
          <el-form-item label="列数">
            <el-input-number v-model="editingComp.props.columns" :min="2" :max="5" />
          </el-form-item>
          <el-form-item label="菜单项">
            <div style="width:100%">
              <el-button size="small" type="primary" @click="addMenuItem">+ 添加菜单项</el-button>
              <div v-if="editingComp.props.items?.length" style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
                <div v-for="(item, i) in editingComp.props.items" :key="i" class="menu-item-card">
                  <div class="menu-item-icon" :style="{ background: item.color || '#005bac' }">{{ item.icon || '📋' }}</div>
                  <div class="menu-item-info">
                    <span class="menu-item-text">{{ item.text || '未命名' }}</span>
                    <span class="menu-item-url" v-if="item.url">{{ item.url }}</span>
                  </div>
                  <div class="menu-item-actions">
                    <el-button size="small" text @click="openMenuItemEditor(i)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="removeMenuItem(i)">删除</el-button>
                  </div>
                </div>
              </div>
              <div v-else style="color:#999;font-size:13px;margin-top:4px">暂无菜单项</div>
            </div>
          </el-form-item>
        </template>

        <!-- 品牌标语 -->
        <template v-if="editingComp.type === 'slogan'">
          <el-form-item label="标题">
            <el-input v-model="editingComp.props.title" placeholder="椰树集团" />
          </el-form-item>
          <el-form-item label="副标题">
            <el-input v-model="editingComp.props.subtitle" placeholder="Coconut Palm Group" />
          </el-form-item>
          <el-form-item label="标语文字">
            <el-input v-model="editingComp.props.text" placeholder="国宴品质 · 民族品牌" />
          </el-form-item>
          <el-form-item label="标题颜色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.titleColor" placeholder="#ffd700" style="width:150px" />
              <input type="color" v-model="editingComp.props.titleColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
        </template>

        <!-- 展厅列表 -->
        <template v-if="editingComp.type === 'exhibition_scroll'">
          <el-form-item label="区块标题">
            <el-input v-model="editingComp.props.title" placeholder="常设展厅" />
          </el-form-item>
          <el-form-item label="显示「查看全部」">
            <el-switch v-model="editingComp.props.showMore" />
          </el-form-item>
        </template>

        <!-- 活动列表 -->
        <template v-if="editingComp.type === 'activity_list'">
          <el-form-item label="区块标题">
            <el-input v-model="editingComp.props.title" placeholder="活动资讯" />
          </el-form-item>
          <el-form-item label="显示「查看全部」">
            <el-switch v-model="editingComp.props.showMore" />
          </el-form-item>
        </template>

        <!-- 文本块 -->
        <template v-if="editingComp.type === 'text_block'">
          <el-form-item label="内容(HTML)">
            <el-input v-model="editingComp.props.content" type="textarea" :rows="6" />
          </el-form-item>
          <el-form-item label="字号">
            <el-input v-model="editingComp.props.style.fontSize" placeholder="14px" />
          </el-form-item>
          <el-form-item label="颜色">
            <el-input v-model="editingComp.props.style.color" placeholder="#333" />
          </el-form-item>
        </template>

        <!-- 图片 -->
        <template v-if="editingComp.type === 'image'">
          <el-form-item label="图片">
            <div style="display:flex;gap:8px;width:100%">
              <el-input v-model="editingComp.props.src" placeholder="图片URL或上传" style="flex:1" />
              <el-button size="small" @click="handleUploadImageSrc">上传</el-button>
            </div>
            <div v-if="editingComp.props.src" style="margin-top:8px;width:200px;height:120px;border-radius:6px;overflow:hidden;border:1px solid #eee">
              <img :src="editingComp.props.src" style="width:100%;height:100%;object-fit:cover" />
            </div>
          </el-form-item>
          <el-form-item label="跳转链接">
            <el-input v-model="editingComp.props.link" placeholder="/pages/xxx/index" />
          </el-form-item>
          <el-form-item label="宽度">
            <el-input v-model="editingComp.props.width" placeholder="100%" />
          </el-form-item>
        </template>

        <!-- 公告栏 -->
        <template v-if="editingComp.type === 'notice_bar'">
          <el-form-item label="文字内容">
            <el-input v-model="editingComp.props.text" type="textarea" :rows="3" placeholder="公告文字..." />
          </el-form-item>
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.backgroundColor" placeholder="#fff3e0" style="width:150px" />
              <input type="color" v-model="editingComp.props.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
        </template>

        <!-- 按钮 -->
        <template v-if="editingComp.type === 'button'">
          <el-form-item label="按钮文字">
            <el-input v-model="editingComp.props.text" placeholder="按钮" />
          </el-form-item>
          <el-form-item label="按钮类型">
            <el-select v-model="editingComp.props.type">
              <el-option label="主要按钮 (primary)" value="primary" />
              <el-option label="成功 (success)" value="success" />
              <el-option label="警告 (warning)" value="warning" />
              <el-option label="危险 (danger)" value="danger" />
              <el-option label="默认 (default)" value="default" />
            </el-select>
          </el-form-item>
          <el-form-item label="跳转链接">
            <el-input v-model="editingComp.props.link" placeholder="/pages/xxx/index" />
          </el-form-item>
        </template>

        <!-- 分隔线 -->
        <template v-if="editingComp.type === 'divider'">
          <el-form-item label="间距">
            <el-input v-model="editingComp.props.margin" placeholder="12px 0" />
          </el-form-item>
          <el-form-item label="颜色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.color" placeholder="#eee" style="width:150px" />
              <input type="color" v-model="editingComp.props.color" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
        </template>

        <!-- 底部信息 -->
        <template v-if="editingComp.type === 'footer'">
          <el-form-item label="品牌名称">
            <el-input v-model="editingComp.props.brand" placeholder="椰树集团" />
          </el-form-item>
          <el-form-item label="版权信息">
            <el-input v-model="editingComp.props.copyright" placeholder="© 椰树集团 参观预约系统" />
          </el-form-item>
        </template>

        <!-- 空白间距 -->
        <template v-if="editingComp.type === 'spacer'">
          <el-form-item label="高度(px)">
            <el-input-number v-model="editingComp.props.height" :min="4" :max="200" />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="compDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveComp">确定</el-button>
      </template>
    </el-dialog>

    <!-- ====== 菜单项编辑弹窗 ====== -->
    <el-dialog v-model="menuItemDialogVisible" :title="editingMenuItemIndex >= 0 ? '编辑菜单项' : '添加菜单项'" width="500px">
      <el-form label-width="80px">
        <el-form-item label="图标">
          <el-input v-model="editingMenuItem.icon" placeholder="emoji图标，如 📋 📅 👥" />
        </el-form-item>
        <el-form-item label="文字">
          <el-input v-model="editingMenuItem.text" placeholder="菜单文字" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="editingMenuItem.url" placeholder="/pages/xxx/index" />
        </el-form-item>
        <el-form-item label="背景色">
          <div style="display:flex;gap:8px;align-items:center">
            <el-input v-model="editingMenuItem.color" placeholder="#005bac" style="width:150px" />
            <input type="color" v-model="editingMenuItem.color" style="width:36px;height:36px;border:none;cursor:pointer" />
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="menuItemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMenuItem">确定</el-button>
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
.page-header h3 {
  margin: 0;
  font-size: 18px;
}
.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
}

/* ===== 可视化编辑器布局 ===== */
.editor-layout {
  display: flex;
  gap: 20px;
  height: calc(100vh - 160px);
  overflow: hidden;
}

/* 左侧编辑面板 */
.editor-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.editor-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

/* 组件列表 */
.comp-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}
.comp-item {
  display: flex;
  align-items: stretch;
  gap: 10px;
  margin-bottom: 10px;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  cursor: default;
}
.comp-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px rgba(64,158,255,0.15);
}
.comp-item.dragging {
  opacity: 0.4;
}
.comp-drag-handle {
  display: flex;
  align-items: center;
  padding: 0 8px;
  color: #ccc;
  font-size: 18px;
  cursor: grab;
  user-select: none;
}
.comp-drag-handle:active {
  cursor: grabbing;
}
.comp-mini-preview {
  width: 120px;
  min-height: 70px;
  flex-shrink: 0;
  background: #f8f8f8;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  border-right: 1px solid #eee;
}
.comp-actions {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  min-width: 0;
}
.comp-label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}
.comp-btns {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* 空组件状态 */
.comp-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}
.comp-empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}
.comp-empty-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
}
.comp-empty-tip {
  padding: 4px 12px;
  background: #f5f5f5;
  border-radius: 20px;
  font-size: 12px;
}

/* ===== 迷你预览 ===== */
.mini-swiper {
  width: 100%;
  display: flex;
  align-items: center;
  overflow: hidden;
}
.mini-swiper-track {
  display: flex;
  gap: 2px;
}
.mini-swiper-img {
  width: 50px;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}
.mini-swiper-more {
  font-size: 11px;
  color: #999;
  padding: 0 4px;
  display: flex;
  align-items: center;
}
.mini-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
}
.mini-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
}
.mini-grid-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  margin-bottom: 2px;
}
.mini-grid-label {
  font-size: 9px;
  color: #666;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 48px;
}
.mini-text {
  font-size: 11px;
  padding: 8px;
  line-height: 1.4;
  overflow: hidden;
}
.mini-image-wrap {
  width: 100%;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}
.mini-notice {
  font-size: 11px;
  padding: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.mini-divider-wrap {
  width: 100%;
  padding: 0 12px;
  display: flex;
  align-items: center;
}
.mini-divider {
  width: 100%;
  height: 1px;
}
.mini-button-wrap {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.mini-button {
  background: #409eff;
  color: #fff;
  font-size: 11px;
  padding: 6px 20px;
  border-radius: 6px;
}
.mini-empty {
  font-size: 11px;
  color: #ccc;
  padding: 8px;
}
.mini-slogan {
  padding: 8px;
  text-align: center;
}
.mini-slogan-title {
  font-size: 13px;
  font-weight: bold;
}
.mini-slogan-sub {
  font-size: 9px;
  color: #999;
  margin-top: 2px;
}
.mini-slogan-text {
  font-size: 10px;
  color: #bbb;
  margin-top: 2px;
}
.mini-section-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
}
.mini-section-title {
  font-size: 12px;
  font-weight: 500;
  color: #333;
}
.mini-section-desc {
  font-size: 10px;
  color: #999;
}
.mini-footer-preview {
  font-size: 11px;
  color: #ffd700;
  font-weight: 500;
  padding: 8px;
}
.mini-spacer {
  width: 100%;
}

/* ===== 手机预览面板 ===== */
.preview-panel {
  width: 360px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.preview-header {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 12px;
}
.phone-frame {
  width: 340px;
  height: 620px;
  background: #fff;
  border-radius: 32px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.15), 0 0 0 2px #ddd;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}
.phone-notch {
  height: 36px;
  background: #000;
  position: relative;
  flex-shrink: 0;
}
.phone-notch::after {
  content: '';
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 20px;
  background: #1a1a1a;
  border-radius: 0 0 12px 12px;
}
.phone-content {
  flex: 1;
  overflow-y: auto;
  background: #000;
}

/* 预览组件样式 */
.pv-swiper {
  width: 100%;
  overflow: hidden;
}
.pv-swiper-track {
  display: flex;
  height: 100%;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
}
.pv-swiper-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  scroll-snap-align: start;
  flex-shrink: 0;
}
.pv-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  color: #666;
  font-size: 13px;
}
.pv-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 8px 4px;
}
.pv-grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  box-sizing: border-box;
}
.pv-grid-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 4px;
}
.pv-grid-label {
  font-size: 11px;
  color: #e0e0e0;
  text-align: center;
}
.pv-text {
  padding: 12px;
  line-height: 1.6;
  color: #e0e0e0;
}
.pv-image-wrap {
  line-height: 0;
}
.pv-image {
  display: block;
}
.pv-notice {
  padding: 10px 16px;
  font-size: 13px;
  color: #333;
  line-height: 1.5;
}
.pv-divider-wrap {
  padding: 0 16px;
}
.pv-divider {
  height: 1px;
}
.pv-btn-wrap {
  padding: 8px 16px;
}
.pv-btn {
  width: 100%;
  text-align: center;
  padding: 10px;
  border-radius: 8px;
  font-size: 14px;
}
.pv-btn-primary { background: #409eff; color: #fff; }
.pv-btn-success { background: #67c23a; color: #fff; }
.pv-btn-warning { background: #e6a23c; color: #fff; }
.pv-btn-danger { background: #f56c6c; color: #fff; }
.pv-btn-default { background: #fff; color: #333; border: 1px solid #dcdfe6; }
.pv-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}
.pv-empty-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

/* 功能入口预览 */
.pv-func-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 12px 8px;
  gap: 0;
}
.pv-func-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px;
  box-sizing: border-box;
}
.pv-func-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-bottom: 6px;
}
.pv-func-label {
  font-size: 11px;
  color: #e0e0e0;
  text-align: center;
}

/* 品牌标语预览 */
.pv-slogan {
  padding: 24px 16px;
  text-align: center;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  border-top: 1px solid rgba(255,215,0,0.1);
  border-bottom: 1px solid rgba(255,215,0,0.1);
  margin: 0;
}
.pv-slogan-title {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 4px;
}
.pv-slogan-sub {
  font-size: 10px;
  color: rgba(255,255,255,0.3);
  margin-top: 4px;
  letter-spacing: 3px;
  text-transform: uppercase;
}
.pv-slogan-text {
  font-size: 13px;
  color: rgba(255,255,255,0.6);
  margin-top: 8px;
  letter-spacing: 2px;
}

/* 区块样式（展厅/活动） */
.pv-section {
  padding: 0;
  margin: 12px 16px 0;
}
.pv-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.pv-section-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  padding-left: 8px;
  border-left: 3px solid #ffd700;
}
.pv-section-more {
  font-size: 12px;
  color: #ffd700;
  opacity: 0.7;
}
.pv-section-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
}
.pv-section-card {
  width: 200px;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a1a;
  flex-shrink: 0;
}
.pv-section-card-img {
  height: 100px;
  background: #2a2a2a;
}
.pv-section-card-name {
  padding: 8px 10px;
  font-size: 12px;
  color: #fff;
}
.pv-section-activity {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #1a1a1a;
  border-radius: 8px;
  margin-bottom: 6px;
}
.pv-section-tag {
  background: #ffd700;
  color: #000;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.pv-section-activity-title {
  flex: 1;
  font-size: 13px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pv-section-arrow {
  color: #666;
  font-size: 16px;
  flex-shrink: 0;
}

/* 底部信息预览 */
.pv-footer {
  text-align: center;
  padding: 24px 16px 12px;
}
.pv-footer-brand {
  font-size: 13px;
  font-weight: bold;
  color: #ffd700;
  letter-spacing: 2px;
}
.pv-footer-copy {
  font-size: 10px;
  color: rgba(255,255,255,0.2);
  margin-top: 4px;
}

/* 空白间距预览 */
.pv-spacer {
  width: 100%;
}

/* ===== 轮播图图片列表 ===== */
.swiper-image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.swiper-image-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #eee;
}
.swiper-image-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.swiper-image-del {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  padding: 0;
  min-width: unset;
}

/* ===== 菜单项卡片 ===== */
.menu-item-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  background: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 8px;
  width: 100%;
  box-sizing: border-box;
}
.menu-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}
.menu-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.menu-item-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}
.menu-item-url {
  font-size: 12px;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.menu-item-actions {
  flex-shrink: 0;
}

/* 对话框全屏模式调整 */
:deep(.el-dialog__body) {
  padding: 16px 20px;
  overflow: hidden;
}

/* 颜色选择器 */
input[type="color"] {
  padding: 0;
  border-radius: 4px;
}
</style>
