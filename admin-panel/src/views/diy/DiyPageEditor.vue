<script setup lang="ts">
import { ref, onMounted, reactive, computed, nextTick, watch, onUnmounted, shallowRef } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '../../api/request'
import { useUpload } from '../../composables/useUpload'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import type { IDomEditor } from '@wangeditor/editor'

interface ComponentDef {
  type: string
  label: string
  props: Record<string, any>
}

interface PageConfig {
  components: ComponentDef[]
  background?: {
    image: string
    color: string
    size: string
    position: string
  }
  logo?: string
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
  config: {
    components: [],
    background: { image: '', color: '#000000', size: 'cover', position: 'center center' },
    logo: '',
  } as PageConfig,
})

const componentTypes = [
  { type: 'swiper', label: '轮播图', icon: '🖼️', defaultProps: { images: [], interval: 3000, height: 180, borderRadius: 0, margin: 0, objectFit: 'cover' } },
  { type: 'func_grid', label: '功能入口', icon: '🔲', defaultProps: { columns: 3, padding: '12px 8px', backgroundColor: 'transparent', items: [
    { icon: '📅', text: '个人预约', url: '/pages/personal-reservation/index', color: '#005bac', iconImage: '' },
    { icon: '👥', text: '团队预约', url: '/pages/team-reservation/index', color: '#2d5a2d', iconImage: '' },
    { icon: '🏛️', text: '展厅导览', url: '/pages/exhibitions/index', color: '#6a2a3a', iconImage: '' },
    { icon: '🎪', text: '活动预约', url: '/pages/activities/index', color: '#5a3a2a', iconImage: '' },
    { icon: '❓', text: '常见问题', url: '/pages/faq/index', color: '#3a2a5a', iconImage: '' },
    { icon: '📋', text: '我的预约', url: '/pages/my-reservations/index', color: '#2a3a5a', iconImage: '' },
  ]}},
  { type: 'slogan', label: '品牌标语', icon: '✨', defaultProps: { title: '椰树集团', subtitle: 'Coconut Palm Group', text: '国宴品质 · 民族品牌', titleColor: '#ffd700', bgStyle: 'dark', backgroundColor: '#0a0a0a' } },
  { type: 'text_block', label: '文本块', icon: '📝', defaultProps: { content: '请输入文本内容', style: { fontSize: '14px', color: '#333', padding: '12px', backgroundColor: 'transparent', borderRadius: 0 } } },
  { type: 'image', label: '图片', icon: '📷', defaultProps: { src: '', link: '', width: '100%', padding: '0', borderRadius: 0 } },
  { type: 'exhibition_scroll', label: '展厅列表', icon: '🏛️', defaultProps: { title: '常设展厅', showMore: true } },
  { type: 'activity_list', label: '活动列表', icon: '🎪', defaultProps: { title: '活动资讯', showMore: true } },
  { type: 'notice_bar', label: '公告栏', icon: '📢', defaultProps: { text: '公告内容', backgroundColor: '#fff3e0', textColor: '#e65100', fontSize: '13px', fontWeight: 'normal' } },
  { type: 'media_grid', label: '媒体网格', icon: '🔲', defaultProps: { columns: 3, gap: 8, items: [] } },
  { type: 'video', label: '视频', icon: '🎬', defaultProps: { src: '', poster: '', controls: true, autoplay: false, loop: false, objectFit: 'contain', height: 220 } },
  { type: 'section_wrapper', label: '区块包装器', icon: '📦', defaultProps: { bgColor: '#1a1a1a', padding: '16px', borderRadius: 12, margin: '0', title: '', components: [] } },
  { type: 'columns', label: '多列布局', icon: '📐', defaultProps: { columns: 2, gap: 12, rowGap: 8, columnRatio: '1:1', items: [] } },
  { type: 'button', label: '按钮', icon: '🔘', defaultProps: { text: '按钮', link: '', type: 'primary', borderRadius: 8, padding: '10px' } },
  { type: 'footer', label: '底部信息', icon: '📄', defaultProps: { brand: '椰树集团', copyright: '© 椰树集团 参观预约系统', backgroundColor: '#000000' } },
  { type: 'spacer', label: '空白间距', icon: '⬜', defaultProps: { height: 16 } },
  { type: 'navigation', label: '导航', icon: '📍', defaultProps: { label: '导航到椰树集团', latitude: 20.017, longitude: 110.358, name: '椰树集团', address: '海南省海口市龙华路41号', backgroundColor: '#1a3a2a', textColor: '#ffd700' } },
  { type: 'wechat_store', label: '微信小店', icon: '🛒', defaultProps: { appid: '', padding: '0' } },
]

// 默认首页模板（模拟当前硬编码布局）
const defaultHomeTemplate: ComponentDef[] = [
  { type: 'swiper', label: '轮播图', props: { images: [], interval: 3000, height: 220, borderRadius: 0 } },
  { type: 'func_grid', label: '功能入口', props: { columns: 3, items: [
    { icon: '📅', text: '个人预约', url: '/pages/personal-reservation/index', color: '#005bac', iconImage: '' },
    { icon: '👥', text: '团队预约', url: '/pages/team-reservation/index', color: '#2d5a2d', iconImage: '' },
    { icon: '🏛️', text: '展厅导览', url: '/pages/exhibitions/index', color: '#6a2a3a', iconImage: '' },
    { icon: '🎪', text: '活动预约', url: '/pages/activities/index', color: '#5a3a2a', iconImage: '' },
    { icon: '❓', text: '常见问题', url: '/pages/faq/index', color: '#3a2a5a', iconImage: '' },
    { icon: '📋', text: '我的预约', url: '/pages/my-reservations/index', color: '#2a3a5a', iconImage: '' },
  ]}},
  { type: 'slogan', label: '品牌标语', props: { title: '椰树集团', subtitle: 'Coconut Palm Group', text: '国宴品质 · 民族品牌', titleColor: '#ffd700', bgStyle: 'dark' } },
  { type: 'exhibition_scroll', label: '展厅列表', props: { title: '常设展厅', showMore: true } },
  { type: 'activity_list', label: '活动列表', props: { title: '活动资讯', showMore: true } },
  { type: 'footer', label: '底部信息', props: { brand: '椰树集团', copyright: '© 椰树集团 参观预约系统' } },
]

const editingCompIndex = ref(-1)
const compDialogVisible = ref(false)
const editingComp = reactive<ComponentDef>({ type: '', label: '', props: {} })
const compDialogContext = ref<'main' | 'section' >('main') // 组件编辑上下文
const compDialogSectionIndex = ref(-1) // section_wrapper的索引
const compDialogColumnIndex = ref(-1) // columns子项的索引
let savedColumnParentComp: ComponentDef | null = null // 编辑列子组件时暂存父级数据
let savedColumnParentIndex = -1 // 编辑列子组件前的主组件索引

// 菜单网格项编辑器
const menuItemDialogVisible = ref(false)
const editingMenuItemIndex = ref(-1)
const editingMenuItem = reactive({ icon: '', text: '', url: '', color: '#005bac', iconImage: '' })

// 媒体网格项编辑器
const mediaItemDialogVisible = ref(false)
const editingMediaIndex = ref(-1)
const editingMediaItem = reactive({ image: '', title: '', link: '', borderRadius: 8, shadow: false, aspectRatio: '1' })

// 多列布局项编辑器
const columnItemDialogVisible = ref(false)
const editingColumnIndex = ref(-1)
const editingColumnItem = reactive({ image: '', title: '', text: '', link: '', buttonText: '', buttonType: 'primary', type: 'image_text', components: [] })

// 调试：预览列数据
function debugColumnPreview(msg: string) {
  if (editingComp.type === 'columns') {
    console.log(`[列预览] ${msg}:`, {
      items: editingComp.props?.items?.length,
      col0: editingComp.props?.items?.[0] ? { title: editingComp.props.items[0].title, comps: editingComp.props.items[0].components?.length, img: editingComp.props.items[0].components?.[0]?.props?.src?.slice(0, 30) } : 'none',
      col1: editingComp.props?.items?.[1] ? { title: editingComp.props.items[1].title, comps: editingComp.props.items[1].components?.length, img: editingComp.props.items[1].components?.[0]?.props?.src?.slice(0, 30) } : 'none',
      colIdx: editingColumnIndex.value,
      colDialog: columnItemDialogVisible.value,
      compDialogColumnIdx: compDialogColumnIndex.value,
      savedParent: !!savedColumnParentComp,
    })
  }
}

// 轮播图自动播放
const activeSwiperIndex = ref(0)
let swiperTimer: ReturnType<typeof setInterval> | null = null

function startSwiper(interval = 3000) {
  stopSwiper()
  swiperTimer = setInterval(() => {
    const swiperPreview = previewComponents.value.find(c => c.type === 'swiper')
    const len = swiperPreview?.props?.images?.length || 0
    if (len > 1) {
      activeSwiperIndex.value = (activeSwiperIndex.value + 1) % len
    } else {
      activeSwiperIndex.value = 0
    }
  }, interval)
}

function stopSwiper() {
  if (swiperTimer !== null) {
    clearInterval(swiperTimer)
    swiperTimer = null
  }
}

watch(dialogVisible, (val) => {
  if (val) {
    activeSwiperIndex.value = 0
    const swiper = form.config.components.find(c => c.type === 'swiper')
    startSwiper(swiper?.props?.interval || 3000)
  } else {
    stopSwiper()
  }
})

// 当编辑中的轮播图参数变化时重新调整定时器
watch([compDialogVisible, () => editingComp.type, () => editingComp.props?.interval], () => {
  if (compDialogVisible.value && editingComp.type === 'swiper') {
    activeSwiperIndex.value = 0
    startSwiper(editingComp.props?.interval || 3000)
  }
})

onUnmounted(() => { stopSwiper(); destroyTextBlockEditor() })

// 拖拽
const dragIndex = ref(-1)

const { uploadFile } = useUpload()

// 列宽比例解析: "2:1" → [2, 1]
function getColumnFlex(comp: any, index: number): number {
  const count = comp.props.columns || 2
  const ratio = comp.props.columnRatio || '1:1'
  const parts = ratio.split(':').map(Number).filter((n: number) => n > 0)
  const flexes = parts.length >= count ? parts : Array(count).fill(1)
  return flexes[index] || 1
}
// ===== 手机预览 =====
const previewComponents = computed(() => {
  const comps = [...form.config.components]
  // 组件编辑弹窗打开时，实时显示编辑中的状态
  if (compDialogVisible.value && editingCompIndex.value >= 0 && editingComp.type) {
    let previewData = editingComp

    // 强制追踪 editingComp.props.items 的所有索引，确保修改 items[i] 时触发重渲染
    if (editingComp.props?.items) {
      for (let _i = 0; _i < editingComp.props.items.length; _i++) {
        const _ = editingComp.props.items[_i]
      }
    }

    if (compDialogColumnIndex.value >= 0 && savedColumnParentComp) {
      // 编辑列子组件：用保存的父级数据 + 当前 editingColumnItem 构建预览
      previewData = JSON.parse(JSON.stringify(savedColumnParentComp))
      if (editingColumnIndex.value >= 0 && previewData.props?.items) {
        previewData.props.items[editingColumnIndex.value] = JSON.parse(JSON.stringify(editingColumnItem))
      }
    } else if (compDialogColumnIndex.value < 0) {
      // 列项编辑弹窗打开时，将 editingColumnItem 合并到多列组件预览
      if (columnItemDialogVisible.value && editingColumnIndex.value >= 0 && previewData.props?.items) {
        const merged = JSON.parse(JSON.stringify(editingComp))
        merged.props.items[editingColumnIndex.value] = JSON.parse(JSON.stringify(editingColumnItem))
        previewData = merged
      }
    }

    comps[editingCompIndex.value] = { ...previewData }
  }
  return comps
})
const hasDiySwiper = computed(() => previewComponents.value.some(c => c.type === 'swiper'))
const phoneBgStyle = computed(() => {
  const bg = form.config.background || {} as any
  const styles: Record<string, string> = {}
  if (bg.color) styles.backgroundColor = bg.color
  if (bg.image) {
    styles.backgroundImage = `url(${bg.image})`
    styles.backgroundSize = bg.size || 'cover'
    styles.backgroundPosition = bg.position || 'center center'
    styles.backgroundRepeat = bg.size === 'repeat' ? 'repeat' : 'no-repeat'
  }
  return styles
})

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
  form.config = { components: [], background: { image: '', color: '#000000', size: 'cover', position: 'center center' } }
  dialogVisible.value = true
}

function openCreateWithTemplate() {
  editing.value = false
  currentId.value = null
  form.name = '首页默认布局'
  form.pageKey = 'home'
  form.config = { components: JSON.parse(JSON.stringify(defaultHomeTemplate)), background: { image: '', color: '#000000', size: 'cover', position: 'center center' } }
  dialogVisible.value = true
}

function openEdit(item: DiyPageItem) {
  editing.value = true
  currentId.value = item.id
  form.name = item.name
  form.pageKey = item.pageKey
  const cfg = JSON.parse(JSON.stringify(item.config))
  if (!cfg.background) {
    cfg.background = { image: '', color: '#000000', size: 'cover', position: 'center center' }
  }
  // 兼容旧轮播图数据格式：string[] → {src, link}[]
  if (cfg.components) {
    for (const comp of cfg.components) {
      if (comp.type === 'swiper' && Array.isArray(comp.props?.images)) {
        comp.props.images = comp.props.images.map((img: any) =>
          typeof img === 'string' ? { src: img, link: '' } : img,
        )
      }
    }
  }
  form.config = cfg
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

// ===== wangEditor 文本块编辑器 =====
const editorRef = shallowRef<IDomEditor | null>(null)
const textBlockEditorMode = ref(false)

const toolbarConfig = {
  excludeKeys: ['group-video', 'fullScreen', 'insertTable', 'codeBlock'],
}
const editorConfig = {
  placeholder: '请输入文本内容...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file: File, insertFn: (url: string) => void) {
        try {
          const url = await uploadFile(file)
          insertFn(url)
        } catch { ElMessage.error('图片上传失败') }
      },
    },
  },
}

function handleTextBlockCreated(editor: IDomEditor) {
  editorRef.value = editor
}

// 销毁编辑器
function destroyTextBlockEditor() {
  if (editorRef.value) {
    editorRef.value.destroy()
    editorRef.value = null
  }
}

// 打开文本块编辑时初始化编辑器内容
function openTextBlockEditor(comp: any) {
  textBlockEditorMode.value = true
  // wangEditor 通过 v-model 双向绑定 content
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
function openCompEditor(index: number, context: 'main' | 'section' = 'main', sectionIndex = -1) {
  editingCompIndex.value = index
  compDialogContext.value = context
  compDialogSectionIndex.value = sectionIndex
  const comp = context === 'section' && sectionIndex >= 0
    ? form.config.components[sectionIndex].props.components?.[index]
    : form.config.components[index]
  if (comp) {
    Object.assign(editingComp, JSON.parse(JSON.stringify(comp)))
  }
  compDialogVisible.value = true
}

function openSectionNestedCompEditor(sectionIndex: number, childIndex: number) {
  openCompEditor(childIndex, 'section', sectionIndex)
}

function saveComp() {
  if (editingCompIndex.value < 0) return
  const data = {
    type: editingComp.type,
    label: editingComp.label,
    props: JSON.parse(JSON.stringify(editingComp.props)),
  }
  if (compDialogColumnIndex.value >= 0) {
    // 保存列子组件数据到 editingColumnItem
    if (editingColumnItem.components) {
      editingColumnItem.components[editingCompIndex.value] = data
    }
    compDialogColumnIndex.value = -1
    // 恢复 columns 父级数据和索引
    if (savedColumnParentComp) {
      Object.assign(editingComp, savedColumnParentComp)
      savedColumnParentComp = null
    }
    if (savedColumnParentIndex >= 0) {
      editingCompIndex.value = savedColumnParentIndex
      savedColumnParentIndex = -1
    }
    nextTick(() => { columnItemDialogVisible.value = true })
    return // 不关闭 compDialog，用户还需保存多列组件
  } else if (compDialogContext.value === 'section' && compDialogSectionIndex.value >= 0) {
    const section = form.config.components[compDialogSectionIndex.value]
    if (section.props.components) {
      section.props.components[editingCompIndex.value] = data
    }
  } else {
    form.config.components[editingCompIndex.value] = data
  }
  compDialogVisible.value = false
  editingCompIndex.value = -1
  compDialogContext.value = 'main'
  compDialogSectionIndex.value = -1
}

function cancelCompEdit() {
  if (compDialogColumnIndex.value >= 0) {
    // 取消编辑列子组件：恢复父级数据并重新打开列编辑框，不关闭 compDialog
    compDialogColumnIndex.value = -1
    if (savedColumnParentComp) {
      Object.assign(editingComp, savedColumnParentComp)
      savedColumnParentComp = null
    }
    if (savedColumnParentIndex >= 0) {
      editingCompIndex.value = savedColumnParentIndex
      savedColumnParentIndex = -1
    }
    nextTick(() => { columnItemDialogVisible.value = true })
    return
  }
  compDialogVisible.value = false
  editingCompIndex.value = -1
  compDialogContext.value = 'main'
  compDialogSectionIndex.value = -1
}

// ===== 区块包装器子组件管理 =====
const columnChildTypes = [
  { type: 'text_block', label: '文本块', defaultProps: { content: '文本内容', style: { fontSize: '12px', color: '#fff', padding: '4px 0' } } },
  { type: 'image', label: '图片', defaultProps: { src: '', link: '', width: '100%', padding: '0', borderRadius: 0 } },
  { type: 'button', label: '按钮', defaultProps: { text: '按钮', link: '', type: 'primary', borderRadius: 8, padding: '10px' } },
  { type: 'divider', label: '分隔线', defaultProps: { margin: '8px 0', color: '#333' } },
  { type: 'spacer', label: '空白间距', defaultProps: { height: 12 } },
]

const sectionChildTypes = [
  { type: 'text_block', label: '文本块', defaultProps: { content: '文本内容', style: { fontSize: '14px', color: '#333', padding: '12px' } } },
  { type: 'image', label: '图片', defaultProps: { src: '', link: '', width: '100%', padding: '0', borderRadius: 0 } },
  { type: 'button', label: '按钮', defaultProps: { text: '按钮', link: '', type: 'primary', borderRadius: 8, padding: '10px' } },
  { type: 'divider', label: '分隔线', defaultProps: { margin: '12px 0', color: '#eee' } },
  { type: 'spacer', label: '空白间距', defaultProps: { height: 16 } },
  { type: 'notice_bar', label: '公告栏', defaultProps: { text: '公告内容', backgroundColor: '#fff3e0', textColor: '#e65100', fontSize: '13px', fontWeight: 'normal' } },
]

function addSectionChildComp(type: string) {
  if (!editingComp.props.components) editingComp.props.components = []
  const def = sectionChildTypes.find(c => c.type === type)
  const cmpDef = {
    type,
    label: def?.label || type,
    props: JSON.parse(JSON.stringify(def?.defaultProps || {})),
  }
  editingComp.props.components.push(cmpDef)
}

function removeSectionChildComp(index: number) {
  editingComp.props.components?.splice(index, 1)
}

function moveSectionChildComp(index: number, direction: -1 | 1) {
  const arr = editingComp.props.components
  if (!arr) return
  const target = index + direction
  if (target < 0 || target >= arr.length) return
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
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
      editingComp.props.images.push({ src: url, link: '' })
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

async function handleUploadMediaGridItem() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      editingMediaItem.image = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

async function handleUploadVideoSrc() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'video/*'
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

async function handleUploadVideoPoster() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      editingComp.props.poster = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

async function handleUploadBackground() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      form.config.background!.image = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

async function handleUploadLogo() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      form.config.logo = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

// ===== 菜单项编辑器 =====
function openMenuItemEditor(index: number) {
  editingMenuItemIndex.value = index
  const item = editingComp.props.items[index] || {}
  Object.assign(editingMenuItem, { icon: item.icon || '', text: item.text || '', url: item.url || '', color: item.color || '#005bac', iconImage: item.iconImage || '' })
  menuItemDialogVisible.value = true
}

function addMenuItem() {
  if (!editingComp.props.items) editingComp.props.items = []
  editingMenuItemIndex.value = -1
  Object.assign(editingMenuItem, { icon: '📋', text: '新菜单', url: '', color: '#005bac', iconImage: '' })
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

async function handleUploadMenuItemIcon() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      editingMenuItem.iconImage = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

// ===== 媒体网格项编辑器 =====
function openMediaItemEditor(index: number) {
  editingMediaIndex.value = index
  const item = editingComp.props.items[index] || {}
  Object.assign(editingMediaItem, { image: item.image || '', title: item.title || '', link: item.link || '', borderRadius: item.borderRadius || 8, shadow: item.shadow || false, aspectRatio: item.aspectRatio || '1' })
  mediaItemDialogVisible.value = true
}

function addMediaItem() {
  if (!editingComp.props.items) editingComp.props.items = []
  editingMediaIndex.value = -1
  Object.assign(editingMediaItem, { image: '', title: '新项目', link: '', borderRadius: 8, shadow: false, aspectRatio: '1' })
  mediaItemDialogVisible.value = true
}

function saveMediaItem() {
  const item = { ...editingMediaItem }
  if (editingMediaIndex.value >= 0) {
    editingComp.props.items[editingMediaIndex.value] = item
  } else {
    editingComp.props.items.push(item)
  }
  mediaItemDialogVisible.value = false
}

function removeMediaItem(index: number) {
  editingComp.props.items.splice(index, 1)
}

async function handleUploadColumnImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    try {
      const url = await uploadFile(file)
      editingColumnItem.image = url
    } catch { ElMessage.error('上传失败') }
  }
  input.click()
}

function addColumnChildComp(type: string) {
  if (!editingColumnItem.components) editingColumnItem.components = []
  const def = columnChildTypes.find(c => c.type === type)
  const cmpDef = {
    type,
    label: def?.label || type,
    props: JSON.parse(JSON.stringify(def?.defaultProps || {})),
  }
  editingColumnItem.components.push(cmpDef)
}

function removeColumnChildComp(index: number) {
  editingColumnItem.components?.splice(index, 1)
}

function moveColumnChildComp(index: number, direction: -1 | 1) {
  const arr = editingColumnItem.components
  if (!arr) return
  const target = index + direction
  if (target < 0 || target >= arr.length) return
  ;[arr[index], arr[target]] = [arr[target], arr[index]]
}

function openColumnChildEditor(childIdx: number) {
  const item = editingColumnItem.components?.[childIdx]
  if (!item) return
  // 保存 columns 父级数据和主组件索引，编辑子组件后恢复
  savedColumnParentComp = JSON.parse(JSON.stringify(editingComp))
  savedColumnParentIndex = editingCompIndex.value
  Object.assign(editingComp, JSON.parse(JSON.stringify(item)))
  editingCompIndex.value = childIdx
  compDialogColumnIndex.value = editingColumnIndex.value
  columnItemDialogVisible.value = false
}

// ===== 多列布局项编辑器 =====
function openColumnItemEditor(index: number) {
  editingColumnIndex.value = index
  const item = editingComp.props.items[index] || {}
  Object.assign(editingColumnItem, { image: item.image || '', title: item.title || '', text: item.text || '', link: item.link || '', buttonText: item.buttonText || '', buttonType: item.buttonType || 'primary', type: item.type || 'image_text', components: JSON.parse(JSON.stringify(item.components || [])) })
  columnItemDialogVisible.value = true
}

function addColumnItem() {
  if (!editingComp.props) editingComp.props = {}
  if (!editingComp.props.items) editingComp.props.items = []
  editingColumnIndex.value = -1
  Object.assign(editingColumnItem, { image: '', title: '新列', text: '', link: '', buttonText: '', buttonType: 'primary', type: 'image_text', components: [] })
  columnItemDialogVisible.value = true
}

function saveColumnItem() {
  try {
    const item = JSON.parse(JSON.stringify(editingColumnItem))
    console.log('[saveColumnItem]', { idx: editingColumnIndex.value, hasImg: !!item.image, comps: item.components?.length, imgSrc: item.components?.[0]?.props?.src?.slice(0, 40) })
    if (editingColumnIndex.value >= 0) {
      if (editingComp.props?.items) {
        editingComp.props.items[editingColumnIndex.value] = item
        // 替换数组引用以确保响应式追踪
        editingComp.props.items = [...editingComp.props.items]
      }
    } else {
      if (!editingComp.props) editingComp.props = {}
      if (!editingComp.props.items) editingComp.props.items = []
      editingComp.props.items.push(item)
      editingComp.props.items = [...editingComp.props.items]
    }
  } catch (e) {
    console.error('saveColumnItem 错误', e)
  } finally {
    columnItemDialogVisible.value = false
  }
}

function removeColumnItem(index: number) {
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

          <!-- 页面Logo设置 -->
          <el-collapse class="bg-settings" accordion>
            <el-collapse-item title="🖼️ 页面Logo设置" name="logo">
              <el-form label-width="80px" size="small">
                <el-form-item label="Logo图片">
                  <div style="display:flex;gap:8px;width:100%">
                    <el-input v-model="form.config.logo" placeholder="Logo URL或上传" style="flex:1" />
                    <el-button size="small" @click="handleUploadLogo">上传</el-button>
                    <el-button v-if="form.config.logo" size="small" type="danger" @click="form.config.logo = ''">清除</el-button>
                  </div>
                  <div v-if="form.config.logo" style="margin-top:6px;width:100%;height:60px;border-radius:4px;overflow:hidden;border:1px solid #eee;display:flex;align-items:center;justify-content:center;background:#f5f5f5">
                    <img :src="form.config.logo" style="height:40px;object-fit:contain" />
                  </div>
                </el-form-item>
              </el-form>
            </el-collapse-item>
            <el-collapse-item title="🎨 页面背景设置" name="bg">
              <el-form label-width="80px" size="small">
                <el-form-item label="背景图">
                  <div style="display:flex;gap:8px;width:100%">
                    <el-input v-model="form.config.background!.image" placeholder="图片URL或上传" style="flex:1" />
                    <el-button size="small" @click="handleUploadBackground">上传</el-button>
                  </div>
                  <div v-if="form.config.background!.image" style="margin-top:6px;width:100%;height:60px;border-radius:4px;overflow:hidden;border:1px solid #eee">
                    <img :src="form.config.background!.image" style="width:100%;height:100%;object-fit:cover" />
                  </div>
                </el-form-item>
                <el-form-item label="背景色">
                  <div style="display:flex;gap:8px;align-items:center">
                    <el-input v-model="form.config.background!.color" placeholder="#000000" style="width:120px" />
                    <input type="color" v-model="form.config.background!.color" style="width:32px;height:32px;border:none;cursor:pointer" />
                  </div>
                </el-form-item>
                <el-form-item label="填充模式">
                  <el-select v-model="form.config.background!.size" style="width:160px">
                    <el-option label="铺满 (cover)" value="cover" />
                    <el-option label="完整显示 (contain)" value="contain" />
                    <el-option label="重复平铺 (repeat)" value="repeat" />
                    <el-option label="自动 (auto)" value="auto" />
                  </el-select>
                </el-form-item>
                <el-form-item label="位置">
                  <el-select v-model="form.config.background!.position" style="width:160px">
                    <el-option label="居中" value="center center" />
                    <el-option label="顶部居中" value="center top" />
                    <el-option label="底部居中" value="center bottom" />
                    <el-option label="左上" value="left top" />
                    <el-option label="右上" value="right top" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-collapse-item>
          </el-collapse>

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
                    <img v-for="(img, i) in comp.props.images.slice(0, 3)" :key="i" :src="typeof img === 'string' ? img : img.src" class="mini-swiper-img" />
                    <span v-if="comp.props.images.length > 3" class="mini-swiper-more">+{{ comp.props.images.length - 3 }}</span>
                  </div>
                  <div v-else class="mini-empty">暂无图片</div>
                </div>

                <!-- 功能入口预览 -->
                <div v-else-if="comp.type === 'func_grid'" class="mini-grid">
                  <div v-for="(item, i) in (comp.props.items || []).slice(0, 4)" :key="i" class="mini-grid-item" :style="{ width: (100 / Math.min(comp.props.columns || 3, 4)) + '%' }">
                    <div class="mini-grid-icon" :style="{ background: item.color || '#005bac' }"><img v-if="item.iconImage" :src="item.iconImage" style="width:100%;height:100%;object-fit:cover;border-radius:8px" /><span v-else>{{ item.icon || '📋' }}</span></div>
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

                <!-- 多列布局预览 -->
                <div v-else-if="comp.type === 'columns'" class="mini-columns">
                  <div v-for="(col, i) in (comp.props.items || []).slice(0, comp.props.columns || 2)" :key="i" class="mini-column-cell" :style="{ width: (100 / (comp.props.columns || 2)) + '%' }">
                    <div v-if="col.components?.length" class="mini-column-rows">
                      <span class="mini-column-row-count">{{ col.components.length }}行</span>
                    </div>
                    <div v-else-if="col.image" class="mini-column-img-wrap">
                      <img :src="col.image" class="mini-column-img" />
                    </div>
                    <span v-else-if="col.title" class="mini-column-title">{{ col.title }}</span>
                    <span v-else class="mini-column-empty">空</span>
                  </div>
                </div>

                <!-- 区块包装器预览 -->
                <div v-else-if="comp.type === 'section_wrapper'" class="mini-section-wrap" :style="{ background: comp.props.bgColor || '#1a1a1a' }">
                  <span class="mini-section-wrap-label">{{ comp.props.title || '区块' }}</span>
                  <span class="mini-section-wrap-count">{{ comp.props.components?.length || 0 }} 子组件</span>
                </div>

                <!-- 视频预览 -->
                <div v-else-if="comp.type === 'video'" class="mini-video-preview">
                  <div class="mini-video-icon">▶</div>
                  <div class="mini-video-info">{{ comp.props.src ? '已有视频' : '暂无视频' }}</div>
                </div>

                <!-- 媒体网格预览 -->
                <div v-else-if="comp.type === 'media_grid'" class="mini-media-grid" :style="{ gap: '2px' }">
                  <div v-for="(item, i) in (comp.props.items || []).slice(0, 4)" :key="i" class="mini-media-cell" :style="{ aspectRatio: item.aspectRatio || '1', borderRadius: (item.borderRadius || 8) + 'px' }">
                    <img v-if="item.image" :src="item.image" class="mini-media-img" />
                    <div v-else class="mini-empty" style="font-size:9px">+</div>
                  </div>
                  <div v-if="!comp.props.items?.length" class="mini-empty">暂无内容</div>
                </div>

                <!-- 微信小店预览 -->
                <div v-else-if="comp.type === 'wechat_store'" class="mini-store-preview" :style="{ background: '#07c160', color: '#fff', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', textAlign: 'center' }">
                  🛒 {{ comp.props.appid ? '小店: ' + comp.props.appid : '微信小店（未配置AppID）' }}
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
            <div class="phone-header">
              <div class="ph-left">
                <img v-if="form.config.logo" :src="form.config.logo" class="ph-logo" />
                <span v-else class="ph-logo-placeholder">椰树集团</span>
              </div>
              <div class="ph-right">
                <span class="ph-btn">✕</span>
                <span class="ph-btn">⋯</span>
              </div>
            </div>
            <div class="phone-content" :style="phoneBgStyle">
              <!-- 预览组件列表 -->
              <template v-for="(comp, index) in previewComponents" :key="index">
                <!-- 轮播图 -->
                <div v-if="comp.type === 'swiper'" class="pv-swiper" :style="{ height: (comp.props.height || 180) + 'px', borderRadius: (comp.props.borderRadius || 0) + 'px', paddingLeft: (comp.props.margin ?? 0) + 'px', paddingRight: (comp.props.margin ?? 0) + 'px' }">
                  <div v-if="comp.props.images?.length" class="pv-swiper-track">
                    <div class="pv-swiper-slider" :style="{ transform: 'translateX(-' + (activeSwiperIndex * 100) + '%)' }">
                      <img v-for="(img, i) in comp.props.images" :key="i" :src="typeof img === 'string' ? img : img.src" class="pv-swiper-img" :style="{ objectFit: comp.props.objectFit || 'cover' }" />
                    </div>
                    <!-- 指示点 -->
                    <div v-if="comp.props.images.length > 1" class="pv-swiper-dots">
                      <span v-for="(img, i) in comp.props.images" :key="'dot-'+i" class="pv-swiper-dot" :class="{ active: i === activeSwiperIndex }"></span>
                    </div>
                  </div>
                  <div v-else class="pv-placeholder">轮播图区域</div>
                </div>

                <!-- 功能入口 -->
                <div v-else-if="comp.type === 'func_grid'" class="pv-func-grid">
                  <div v-for="(item, i) in comp.props.items || []" :key="i" class="pv-func-item" :style="{ width: (100 / Math.min(comp.props.columns || 3, 4)) + '%' }">
                    <div class="pv-func-icon" :style="{ background: item.color || '#005bac' }"><img v-if="item.iconImage" :src="item.iconImage" style="width:100%;height:100%;object-fit:cover;border-radius:10px" /><span v-else>{{ item.icon || '📋' }}</span></div>
                    <span class="pv-func-label">{{ item.text || '' }}</span>
                  </div>
                </div>

                <!-- 品牌标语 -->
                <div v-else-if="comp.type === 'slogan'" class="pv-slogan" :style="{ background: comp.props.backgroundColor || '#0a0a0a' }">
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

                <!-- 多列布局 -->
                <div v-else-if="comp.type === 'columns'" class="pv-columns" :style="{ gap: (comp.props.gap || 12) + 'px' }">
                  <div v-for="(col, i) in comp.props.items || []" :key="i" class="pv-column" :style="{ flex: getColumnFlex(comp, i), gap: (comp.props.rowGap ?? 8) + 'px' }">
                    <!-- 有行内容（子组件）时，渲染行内容 -->
                    <template v-if="col.components?.length">
                      <template v-for="(row, ri) in col.components" :key="ri">
                        <div v-if="row.type === 'text_block'" class="pv-column-text" :style="row.props.style">
                          <div v-if="row.props.content" v-html="row.props.content"></div>
                        </div>
                        <div v-else-if="row.type === 'image'" class="pv-column-img-wrap" :style="col.components.length === 1 ? { flex: '1 1 auto', display: 'flex', minHeight: 0 } : {}">
                          <img v-if="row.props.src" :src="row.props.src" class="pv-column-img" :style="col.components.length === 1 ? { width: '100%', height: '100%', objectFit: 'cover' } : { width: '100%', height: 'auto', objectFit: 'contain' }" />
                          <div v-else class="pv-column-placeholder" style="height:60px">图片</div>
                        </div>
                        <div v-else-if="row.type === 'divider'" class="pv-divider-wrap" style="padding:0">
                          <div class="pv-divider" :style="{ margin: row.props.margin || '8px 0', background: row.props.color || '#333' }"></div>
                        </div>
                        <div v-else-if="row.type === 'button'" style="padding:2px 0">
                          <div class="pv-column-btn" :class="'pv-btn-' + (row.props.type || 'primary')">{{ row.props.text || '按钮' }}</div>
                        </div>
                        <div v-else-if="row.type === 'spacer'" class="pv-spacer" :style="{ height: (row.props.height || 12) + 'px' }"></div>
                      </template>
                    </template>
                    <!-- 无行内容时使用简单字段 -->
                    <template v-else>
                      <div v-if="col.type === 'image' || (col.image && !col.title)" class="pv-column-img-wrap">
                        <img v-if="col.image" :src="col.image" class="pv-column-img" style="width:100%;height:auto;object-fit:contain" />
                        <div v-else class="pv-column-placeholder" style="height:60px">图片</div>
                      </div>
                      <div v-if="col.title" class="pv-column-title">{{ col.title }}</div>
                      <div v-if="col.text" class="pv-column-text">{{ col.text }}</div>
                      <div v-if="col.buttonText" class="pv-column-btn" :class="'pv-btn-' + (col.buttonType || 'primary')">{{ col.buttonText }}</div>
                    </template>
                  </div>
                  <div v-if="!comp.props.items?.length" class="pv-columns-hint">添加列内容后显示</div>
                </div>

                <!-- 区块包装器 -->
                <div v-else-if="comp.type === 'section_wrapper'" class="pv-section-wrapper" :style="{ background: comp.props.bgColor || '#1a1a1a', padding: comp.props.padding || '16px', borderRadius: (comp.props.borderRadius || 12) + 'px', margin: comp.props.margin || '0' }">
                  <div v-if="comp.props.title" class="pv-section-wrapper-title">{{ comp.props.title }}</div>
                  <template v-for="(child, ci) in comp.props.components || []" :key="ci">
                    <div v-if="child.type === 'text_block'" class="pv-text" :style="child.props.style">
                      <div v-if="child.props.content" v-html="child.props.content"></div>
                    </div>
                    <div v-else-if="child.type === 'image'" class="pv-image-wrap">
                      <img v-if="child.props.src" :src="child.props.src" class="pv-image" :style="{ width: child.props.width || '100%' }" />
                      <div v-else class="pv-placeholder" style="height:60px">图片</div>
                    </div>
                    <div v-else-if="child.type === 'divider'" class="pv-divider-wrap">
                      <div class="pv-divider" :style="{ margin: child.props.margin || '12px 0', background: child.props.color || '#eee' }"></div>
                    </div>
                    <div v-else-if="child.type === 'button'" class="pv-btn-wrap">
                      <div class="pv-btn" :class="'pv-btn-' + (child.props.type || 'primary')">{{ child.props.text || '按钮' }}</div>
                    </div>
                    <div v-else-if="child.type === 'spacer'" class="pv-spacer" :style="{ height: (child.props.height || 16) + 'px' }"></div>
                    <div v-else-if="child.type === 'notice_bar'" class="pv-notice" :style="{ background: child.props.backgroundColor || '#fff3e0' }">
                      📢 {{ child.props.text || '' }}
                    </div>
                    <div v-else class="pv-section-wrapper-child-hint">{{ child.label || child.type }} 组件</div>
                  </template>
                  <div v-if="!comp.props.components?.length" class="pv-section-wrapper-empty">暂无子组件</div>
                </div>

                <!-- 视频 -->
                <div v-else-if="comp.type === 'video'" class="pv-video-wrap" :style="{ height: (comp.props.height || 220) + 'px' }">
                  <div v-if="comp.props.src" class="pv-video-placeholder">
                    <span class="pv-video-play">▶</span>
                    <span class="pv-video-label">视频播放</span>
                  </div>
                  <div v-else class="pv-placeholder">视频区域</div>
                </div>

                <!-- 媒体网格 -->
                <div v-else-if="comp.type === 'media_grid'" class="pv-media-grid" :style="{ gap: (comp.props.gap || 8) + 'px' }">
                  <div v-for="(item, i) in comp.props.items || []" :key="i" class="pv-media-cell" :style="{ width: (100 / (comp.props.columns || 3)) + '%' }">
                    <div class="pv-media-inner" :style="{ borderRadius: (item.borderRadius || 8) + 'px', boxShadow: item.shadow ? '0 2px 8px rgba(0,0,0,0.3)' : 'none', aspectRatio: item.aspectRatio || '1' }">
                      <img v-if="item.image" :src="item.image" class="pv-media-img" />
                      <div v-else class="pv-media-placeholder">+</div>
                    </div>
                    <div v-if="item.title" class="pv-media-title">{{ item.title }}</div>
                  </div>
                  <div v-if="!comp.props.items?.length" class="pv-media-hint">添加内容后显示</div>
                </div>

                <!-- 底部信息 -->
                <div v-else-if="comp.type === 'footer'" class="pv-footer" :style="{ background: comp.props.backgroundColor || '#000000' }">
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
              <div style="color:#999;font-size:12px;margin-top:2px">建议尺寸 750×350px，2:1比例</div>
              <div v-if="editingComp.props.images?.length" class="swiper-image-list">
                <div v-for="(img, imgIdx) in editingComp.props.images" :key="imgIdx" class="swiper-image-item">
                  <img :src="typeof img === 'string' ? img : img.src" class="swiper-image-preview" />
                  <el-input v-model="img.link" placeholder="跳转链接（可选，如 /pages/activities/index ）" size="small" style="width:220px" />
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
          <el-form-item label="圆角(px)">
            <el-slider v-model="editingComp.props.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
          </el-form-item>
          <el-form-item label="外边距(px)">
            <el-input-number v-model="editingComp.props.margin" :min="0" :max="50" />
          </el-form-item>
          <el-form-item label="图片填充">
            <el-select v-model="editingComp.props.objectFit" style="width:200px">
              <el-option label="铺满(裁剪)" value="cover" />
              <el-option label="完整显示(留白)" value="contain" />
              <el-option label="拉伸" value="fill" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 菜单网格 / 功能入口 -->
        <template v-if="editingComp.type === 'menu_grid' || editingComp.type === 'func_grid'">
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.padding" placeholder="12px 8px" style="width:200px" />
          </el-form-item>
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.backgroundColor" placeholder="transparent" style="width:150px" />
              <input type="color" v-model="editingComp.props.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
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

        <!-- 区块包装器 -->
        <template v-if="editingComp.type === 'section_wrapper'">
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.bgColor" placeholder="#1a1a1a" style="width:150px" />
              <input type="color" v-model="editingComp.props.bgColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.padding" placeholder="16px" style="width:150px" />
          </el-form-item>
          <el-form-item label="圆角(px)">
            <el-slider v-model="editingComp.props.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
          </el-form-item>
          <el-form-item label="外边距">
            <el-input v-model="editingComp.props.margin" placeholder="0" style="width:150px" />
          </el-form-item>
          <el-form-item label="区块标题">
            <el-input v-model="editingComp.props.title" placeholder="可选标题" />
          </el-form-item>
          <el-form-item label="子组件">
            <div style="width:100%">
              <el-dropdown trigger="click" @command="addSectionChildComp">
                <el-button size="small" type="primary">+ 添加子组件</el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="ct in sectionChildTypes" :key="ct.type" :command="ct.type">
                      {{ ct.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <div v-if="editingComp.props.components?.length" style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:300px;overflow-y:auto">
                <div v-for="(child, ci) in editingComp.props.components" :key="ci" class="section-child-card">
                  <div class="section-child-info">
                    <span class="section-child-type">{{ child.label }}</span>
                  </div>
                  <div class="section-child-actions">
                    <el-button size="small" text @click="moveSectionChildComp(ci, -1)" :disabled="ci === 0">↑</el-button>
                    <el-button size="small" text @click="moveSectionChildComp(ci, 1)" :disabled="ci === editingComp.props.components.length - 1">↓</el-button>
                    <el-button size="small" text type="primary" @click="openSectionNestedCompEditor(editingCompIndex, ci)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="removeSectionChildComp(ci)">删除</el-button>
                  </div>
                </div>
              </div>
              <div v-else style="color:#999;font-size:13px;margin-top:8px">暂无子组件，点击添加</div>
            </div>
          </el-form-item>
        </template>

        <!-- 多列布局 -->
        <template v-if="editingComp.type === 'columns'">
          <el-form-item label="列数">
            <el-input-number v-model="editingComp.props.columns" :min="2" :max="4" />
          </el-form-item>
          <el-form-item label="列间距(px)">
            <el-input-number v-model="editingComp.props.gap" :min="0" :max="24" />
          </el-form-item>
          <el-form-item label="行间距(px)">
            <el-input-number v-model="editingComp.props.rowGap" :min="0" :max="24" />
          </el-form-item>
          <el-form-item label="列宽比例">
            <el-select v-model="editingComp.props.columnRatio" style="width:160px">
              <el-option label="等宽 (1:1)" value="1:1" />
              <el-option label="左宽右窄 (2:1)" value="2:1" />
              <el-option label="左宽右窄 (3:1)" value="3:1" />
              <el-option label="左窄右宽 (1:2)" value="1:2" />
              <el-option label="左窄右宽 (1:3)" value="1:3" />
            </el-select>
          </el-form-item>
          <el-form-item label="列内容">
            <div style="width:100%">
              <el-button size="small" type="primary" @click="addColumnItem">+ 添加列</el-button>
              <div v-if="editingComp.props.items?.length" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;max-height:300px;overflow-y:auto">
                <div v-for="(col, i) in editingComp.props.items" :key="i" class="section-child-card">
                  <div class="section-child-info">
                    <span class="section-child-type">{{ col.title || '列 ' + (i+1) }}</span>
                    <span v-if="col.components?.length" style="font-size:11px;color:#999;margin-left:6px">{{ col.components.length }}行</span>
                  </div>
                  <div class="section-child-actions">
                    <el-button size="small" text type="primary" @click="openColumnItemEditor(i)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="removeColumnItem(i)">删除</el-button>
                  </div>
                </div>
              </div>
              <div v-else style="color:#999;font-size:13px;margin-top:8px">暂无列内容，点击添加</div>
            </div>
          </el-form-item>
        </template>

        <!-- 视频 -->
        <template v-if="editingComp.type === 'video'">
          <el-form-item label="视频地址">
            <div style="display:flex;gap:8px;width:100%">
              <el-input v-model="editingComp.props.src" placeholder="视频URL" style="flex:1" />
              <el-button size="small" @click="handleUploadVideoSrc">上传</el-button>
            </div>
          </el-form-item>
          <el-form-item label="封面图">
            <div style="display:flex;gap:8px;width:100%">
              <el-input v-model="editingComp.props.poster" placeholder="封面图片URL" style="flex:1" />
              <el-button size="small" @click="handleUploadVideoPoster">上传</el-button>
            </div>
            <div v-if="editingComp.props.poster" style="margin-top:6px;width:200px;height:100px;border-radius:6px;overflow:hidden;border:1px solid #eee">
              <img :src="editingComp.props.poster" style="width:100%;height:100%;object-fit:cover" />
            </div>
          </el-form-item>
          <el-form-item label="高度(px)">
            <el-input-number v-model="editingComp.props.height" :min="100" :max="500" />
          </el-form-item>
          <el-form-item label="控件">
            <el-switch v-model="editingComp.props.controls" />
          </el-form-item>
          <el-form-item label="自动播放">
            <el-switch v-model="editingComp.props.autoplay" />
          </el-form-item>
          <el-form-item label="循环播放">
            <el-switch v-model="editingComp.props.loop" />
          </el-form-item>
          <el-form-item label="填充模式">
            <el-select v-model="editingComp.props.objectFit" style="width:160px">
              <el-option label="包含 (contain)" value="contain" />
              <el-option label="填充 (fill)" value="fill" />
              <el-option label="覆盖 (cover)" value="cover" />
            </el-select>
          </el-form-item>
        </template>

        <!-- 媒体网格 -->
        <template v-if="editingComp.type === 'media_grid'">
          <el-form-item label="列数">
            <el-input-number v-model="editingComp.props.columns" :min="2" :max="4" />
          </el-form-item>
          <el-form-item label="间距(px)">
            <el-input-number v-model="editingComp.props.gap" :min="0" :max="24" />
          </el-form-item>
          <el-form-item label="内容项">
            <div style="width:100%">
              <el-button size="small" type="primary" @click="addMediaItem">+ 添加内容</el-button>
              <div v-if="editingComp.props.items?.length" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;max-height:300px;overflow-y:auto">
                <div v-for="(item, i) in editingComp.props.items" :key="i" class="media-item-card">
                  <div class="media-item-thumb" v-if="item.image">
                    <img :src="item.image" style="width:100%;height:100%;object-fit:cover" />
                  </div>
                  <div class="media-item-thumb media-item-thumb-empty" v-else>
                    <span>+</span>
                  </div>
                  <div class="media-item-info">
                    <span class="media-item-title">{{ item.title || '未命名' }}</span>
                    <span class="media-item-meta">{{ item.aspectRatio || '1:1' }} | 圆角{{ item.borderRadius || 8 }}</span>
                  </div>
                  <div class="media-item-actions">
                    <el-button size="small" text @click="openMediaItemEditor(i)">编辑</el-button>
                    <el-button size="small" text type="danger" @click="removeMediaItem(i)">删除</el-button>
                  </div>
                </div>
              </div>
              <div v-else style="color:#999;font-size:13px;margin-top:4px">暂无内容项</div>
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
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.backgroundColor" placeholder="#0a0a0a" style="width:150px" />
              <input type="color" v-model="editingComp.props.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
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
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.style.padding" placeholder="12px" style="width:150px" />
          </el-form-item>
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.style.backgroundColor" placeholder="transparent" style="width:150px" />
              <input type="color" v-model="editingComp.props.style.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
          <el-form-item label="圆角(px)">
            <el-slider v-model="editingComp.props.style.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
          </el-form-item>
          <el-form-item label="内容">
            <div style="border:1px solid #dcdfe6;width:100%">
              <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" style="border-bottom:1px solid #dcdfe6" />
              <Editor v-model="editingComp.props.content" :defaultConfig="editorConfig" @onCreated="handleTextBlockCreated" style="height:300px" />
            </div>
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
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.padding" placeholder="0" style="width:150px" />
          </el-form-item>
          <el-form-item label="圆角(px)">
            <el-slider v-model="editingComp.props.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
          </el-form-item>
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
            <el-input v-model="editingComp.props.link" placeholder="/pages/xxx/index " />
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
          <el-form-item label="文字颜色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.textColor" placeholder="#e65100" style="width:150px" />
              <input type="color" v-model="editingComp.props.textColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
          <el-form-item label="字号">
            <el-select v-model="editingComp.props.fontSize" style="width:150px">
              <el-option label="12px" value="12px" />
              <el-option label="13px" value="13px" />
              <el-option label="14px" value="14px" />
              <el-option label="16px" value="16px" />
              <el-option label="18px" value="18px" />
            </el-select>
          </el-form-item>
          <el-form-item label="字重">
            <el-select v-model="editingComp.props.fontWeight" style="width:150px">
              <el-option label="正常" value="normal" />
              <el-option label="加粗" value="bold" />
            </el-select>
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
          <el-form-item label="圆角(px)">
            <el-slider v-model="editingComp.props.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
          </el-form-item>
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.padding" placeholder="10px" style="width:150px" />
          </el-form-item>
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
            <el-input v-model="editingComp.props.link" placeholder="/pages/xxx/index " />
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
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.backgroundColor" placeholder="#000000" style="width:150px" />
              <input type="color" v-model="editingComp.props.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
        </template>

        <!-- 空白间距 -->
        <template v-if="editingComp.type === 'spacer'">
          <el-form-item label="高度(px)">
            <el-input-number v-model="editingComp.props.height" :min="4" :max="200" />
          </el-form-item>
        </template>

        <!-- 微信小店 -->
        <template v-if="editingComp.type === 'wechat_store'">
          <el-form-item label="小店AppID">
            <el-input v-model="editingComp.props.appid" placeholder="微信小店ID（从小店后台获取）" />
            <div style="color:#999;font-size:12px;margin-top:4px">
              获取方式：小店后台 → 店铺管理 → 基础信息 → 账号信息 → 微信小店ID
            </div>
          </el-form-item>
          <el-form-item label="内边距">
            <el-input v-model="editingComp.props.padding" placeholder="0" style="width:150px" />
          </el-form-item>
        </template>
        <template v-if="editingComp.type === 'navigation'">
          <el-form-item label="按钮文字">
            <el-input v-model="editingComp.props.label" placeholder="导航到椰树集团" />
          </el-form-item>
          <el-form-item label="地点名称">
            <el-input v-model="editingComp.props.name" placeholder="椰树集团" />
          </el-form-item>
          <el-form-item label="详细地址">
            <el-input v-model="editingComp.props.address" placeholder="海南省海口市龙华路41号" />
          </el-form-item>
          <el-form-item label="纬度(lat)">
            <el-input-number v-model="editingComp.props.latitude" :min="-90" :max="90" :precision="6" />
          </el-form-item>
          <el-form-item label="经度(lng)">
            <el-input-number v-model="editingComp.props.longitude" :min="-180" :max="180" :precision="6" />
          </el-form-item>
          <el-form-item label="背景色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.backgroundColor" placeholder="#1a3a2a" style="width:150px" />
              <input type="color" v-model="editingComp.props.backgroundColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
          <el-form-item label="文字颜色">
            <div style="display:flex;gap:8px;align-items:center">
              <el-input v-model="editingComp.props.textColor" placeholder="#ffd700" style="width:150px" />
              <input type="color" v-model="editingComp.props.textColor" style="width:36px;height:36px;border:none;cursor:pointer" />
            </div>
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="cancelCompEdit">取消</el-button>
        <el-button type="primary" @click="saveComp">确定</el-button>
      </template>
    </el-dialog>

    <!-- ====== 菜单项编辑弹窗 ====== -->
    <el-dialog v-model="menuItemDialogVisible" :title="editingMenuItemIndex >= 0 ? '编辑菜单项' : '添加菜单项'" width="500px">
      <el-form label-width="80px">
        <el-form-item label="图标(emoji)">
          <el-input v-model="editingMenuItem.icon" placeholder="emoji图标，如 📋 📅 👥" />
        </el-form-item>
        <el-form-item label="自定义图标">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="editingMenuItem.iconImage" placeholder="图片URL或上传" style="flex:1" />
            <el-button size="small" @click="handleUploadMenuItemIcon">上传</el-button>
            <el-button v-if="editingMenuItem.iconImage" size="small" type="danger" @click="editingMenuItem.iconImage = ''">清除</el-button>
          </div>
          <div v-if="editingMenuItem.iconImage" style="margin-top:8px;width:60px;height:60px;border-radius:8px;overflow:hidden;border:1px solid #eee">
            <img :src="editingMenuItem.iconImage" style="width:100%;height:100%;object-fit:cover" />
          </div>
        </el-form-item>
        <el-form-item label="文字">
          <el-input v-model="editingMenuItem.text" placeholder="菜单文字" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="editingMenuItem.url" placeholder="/pages/xxx/index " />
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

    <!-- ====== 媒体项编辑弹窗 ====== -->
    <el-dialog v-model="mediaItemDialogVisible" :title="editingMediaIndex >= 0 ? '编辑媒体项' : '添加媒体项'" width="550px">
      <el-form label-width="100px">
        <el-form-item label="图片">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="editingMediaItem.image" placeholder="图片URL或上传" style="flex:1" />
            <el-button size="small" @click="handleUploadMediaGridItem">上传</el-button>
          </div>
          <div v-if="editingMediaItem.image" style="margin-top:8px;width:120px;height:120px;border-radius:8px;overflow:hidden;border:1px solid #eee">
            <img :src="editingMediaItem.image" style="width:100%;height:100%;object-fit:cover" />
          </div>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="editingMediaItem.title" placeholder="标题文字" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="editingMediaItem.link" placeholder="/pages/xxx/index  或 https://..." />
        </el-form-item>
        <el-form-item label="圆角(px)">
          <el-slider v-model="editingMediaItem.borderRadius" :min="0" :max="24" :step="2" style="width:200px" />
        </el-form-item>
        <el-form-item label="阴影">
          <el-switch v-model="editingMediaItem.shadow" />
        </el-form-item>
        <el-form-item label="宽高比">
          <el-select v-model="editingMediaItem.aspectRatio" style="width:160px">
            <el-option label="正方形 (1:1)" value="1" />
            <el-option label="横图 (4:3)" value="4/3" />
            <el-option label="横图 (16:9)" value="16/9" />
            <el-option label="竖图 (3:4)" value="3/4" />
            <el-option label="自由 (auto)" value="auto" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="mediaItemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveMediaItem">确定</el-button>
      </template>
    </el-dialog>

    <!-- ====== 列项编辑弹窗 ====== -->
    <el-dialog v-model="columnItemDialogVisible" :title="editingColumnIndex >= 0 ? '编辑列' : '添加列'" width="550px">
      <el-form label-width="100px">
        <el-form-item label="图片">
          <div style="display:flex;gap:8px;width:100%">
            <el-input v-model="editingColumnItem.image" placeholder="图片URL" style="flex:1" />
            <el-button size="small" @click="handleUploadColumnImage">上传</el-button>
          </div>
          <div v-if="editingColumnItem.image" style="margin-top:6px;width:100px;height:100px;border-radius:6px;overflow:hidden;border:1px solid #eee">
            <img :src="editingColumnItem.image" style="width:100%;height:100%;object-fit:cover" />
          </div>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="editingColumnItem.title" placeholder="标题文字" />
        </el-form-item>
        <el-form-item label="描述文字">
          <el-input v-model="editingColumnItem.text" type="textarea" :rows="3" placeholder="描述文字" />
        </el-form-item>
        <el-form-item label="按钮文字">
          <el-input v-model="editingColumnItem.buttonText" placeholder="按钮文字（可选）" />
        </el-form-item>
        <el-form-item label="按钮样式" v-if="editingColumnItem.buttonText">
          <el-select v-model="editingColumnItem.buttonType" style="width:160px">
            <el-option label="主要 (primary)" value="primary" />
            <el-option label="成功 (success)" value="success" />
            <el-option label="警告 (warning)" value="warning" />
            <el-option label="危险 (danger)" value="danger" />
            <el-option label="默认 (default)" value="default" />
          </el-select>
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="editingColumnItem.link" placeholder="/pages/xxx/index " />
        </el-form-item>
        <el-form-item label="行内容">
          <div style="width:100%">
            <el-dropdown trigger="click" @command="addColumnChildComp">
              <el-button size="small" type="primary">+ 添加行</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-for="ct in columnChildTypes" :key="ct.type" :command="ct.type">
                    {{ ct.label }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <div v-if="editingColumnItem.components?.length" style="display:flex;flex-direction:column;gap:6px;margin-top:8px;max-height:240px;overflow-y:auto">
              <div v-for="(child, ci) in editingColumnItem.components" :key="ci" class="section-child-card">
                <div class="section-child-info">
                  <span class="section-child-type">{{ child.label }}</span>
                </div>
                <div class="section-child-actions">
                  <el-button size="small" text @click="moveColumnChildComp(ci, -1)" :disabled="ci === 0">↑</el-button>
                  <el-button size="small" text @click="moveColumnChildComp(ci, 1)" :disabled="ci === editingColumnItem.components.length - 1">↓</el-button>
                  <el-button size="small" text type="primary" @click="openColumnChildEditor(ci)">编辑</el-button>
                  <el-button size="small" text type="danger" @click="removeColumnChildComp(ci)">删除</el-button>
                </div>
              </div>
            </div>
            <div v-else style="color:#999;font-size:13px;margin-top:8px">在此列中添加横向行内容（文本、图片、按钮等）</div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="columnItemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveColumnItem">确定</el-button>
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
.phone-header {
  height: 44px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
}
.ph-left {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 60%;
}
.ph-logo {
  height: 28px;
  max-width: 140px;
  object-fit: contain;
}
.ph-logo-placeholder {
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
}
.ph-right {
  display: flex;
  align-items: center;
  gap: 4px;
}
.ph-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1a1a1a;
  color: rgba(255,255,255,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  cursor: default;
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
  position: relative;
  box-sizing: border-box;
}
.pv-swiper-track {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.pv-swiper-slider {
  display: flex;
  height: 100%;
  width: 100%;
  transition: transform 0.5s ease;
}
.pv-swiper-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  flex-shrink: 0;
}
.pv-swiper-dots {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  z-index: 2;
}
.pv-swiper-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,0.4);
  transition: background 0.3s;
}
.pv-swiper-dot.active {
  background: #fff;
  width: 16px;
  border-radius: 3px;
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
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 4px;
  border: 1px solid #eee;
  border-radius: 6px;
}
.swiper-image-preview {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 4px;
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

/* ===== 媒体项卡片 ===== */
.media-item-card {
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
.media-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #e8e8e8;
}
.media-item-thumb-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ccc;
  font-size: 18px;
}
.media-item-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.media-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.media-item-meta {
  font-size: 11px;
  color: #999;
  margin-top: 2px;
}
.media-item-actions {
  flex-shrink: 0;
}

/* ===== 媒体网格预览 ===== */
.mini-media-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 6px;
  gap: 2px;
}
.mini-media-cell {
  width: 45%;
  overflow: hidden;
  border: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
}
.mini-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.pv-media-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 12px;
}
.pv-media-cell {
  padding: 4px;
  box-sizing: border-box;
}
.pv-media-inner {
  width: 100%;
  overflow: hidden;
  background: #2a2a2a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pv-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pv-media-placeholder {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 24px;
}
.pv-media-title {
  font-size: 12px;
  color: #e0e0e0;
  text-align: center;
  margin-top: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pv-media-hint {
  width: 100%;
  text-align: center;
  color: #555;
  font-size: 13px;
  padding: 20px 0;
}

/* ===== 多列布局预览 ===== */
.mini-columns {
  display: flex;
  width: 100%;
  height: 70px;
  gap: 2px;
  padding: 4px;
}
.mini-column-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}
.mini-column-img-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.mini-column-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.mini-column-title {
  font-size: 9px;
  color: #666;
  text-align: center;
}
.mini-column-empty {
  font-size: 10px;
  color: #ccc;
}
.mini-column-rows {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #e8f4ff;
}
.mini-column-row-count {
  font-size: 10px;
  color: #409eff;
  font-weight: 500;
}
.pv-columns {
  display: flex;
  padding: 12px;
}
.pv-column {
  padding: 4px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.pv-column-img-wrap {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #2a2a2a;
}
.pv-column-img {
  width: 100%;
  display: block;
  object-fit: cover;
}
.pv-column-placeholder {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #555;
  font-size: 12px;
}
.pv-column-title {
  font-size: 13px;
  font-weight: 500;
  color: #fff;
}
.pv-column-text {
  font-size: 11px;
  color: #aaa;
  line-height: 1.4;
}
.pv-column-btn {
  text-align: center;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
}
.pv-columns-hint {
  width: 100%;
  text-align: center;
  color: #555;
  font-size: 13px;
  padding: 20px 0;
}

/* ===== 区块包装器预览 ===== */
.mini-section-wrap {
  width: 100%;
  height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 4px;
}
.mini-section-wrap-label {
  font-size: 12px;
  font-weight: 500;
  color: #fff;
}
.mini-section-wrap-count {
  font-size: 10px;
  color: rgba(255,255,255,0.5);
}
.pv-section-wrapper {
  position: relative;
}
.pv-section-wrapper-title {
  font-size: 15px;
  font-weight: bold;
  color: #fff;
  margin-bottom: 10px;
  padding-left: 8px;
  border-left: 3px solid #ffd700;
}
.pv-section-wrapper-empty {
  text-align: center;
  color: #555;
  padding: 16px;
  font-size: 13px;
}
.pv-section-wrapper-child-hint {
  padding: 8px;
  text-align: center;
  color: #888;
  font-size: 12px;
  border: 1px dashed #444;
  border-radius: 6px;
}

/* ===== 区块包装器子组件卡片 ===== */
.section-child-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}
.section-child-info {
  flex: 1;
}
.section-child-type {
  font-size: 13px;
  color: #333;
}
.section-child-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

/* ===== 视频预览 ===== */
.mini-video-preview {
  width: 100%;
  height: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  gap: 4px;
}
.mini-video-icon {
  width: 24px;
  height: 24px;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
}
.mini-video-info {
  font-size: 10px;
  color: #888;
}
.pv-video-wrap {
  width: 100%;
  overflow: hidden;
  background: #000;
  position: relative;
}
.pv-video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0a0a1a;
  gap: 8px;
}
.pv-video-play {
  width: 48px;
  height: 48px;
  background: rgba(255,255,255,0.15);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
}
.pv-video-label {
  font-size: 12px;
  color: #666;
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

/* ===== 背景设置面板 ===== */
.bg-settings {
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
}
.bg-settings :deep(.el-collapse-item__header) {
  font-size: 14px;
  font-weight: 500;
  padding-left: 4px;
}
.bg-settings :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}
</style>

<style src="@wangeditor/editor/dist/css/style.css"></style>
