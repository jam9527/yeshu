<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Delete, Back } from '@element-plus/icons-vue'
import request from '../../api/request'

// ==================== Types ====================

interface Layer {
  id: string
  type: 'text' | 'qr'
  content: string
  x: number
  y: number
  fontSize: number
  color: string
  fontWeight: string
  textAlign: string
  size: number // QR only
}

interface Poster {
  id: number
  name: string
  backgroundUrl: string
  textConfig: string
  qrConfig: string
  isActive: boolean
  createdAt: string
}

// ==================== State ====================

const posters = ref<Poster[]>([])
const loading = ref(false)
const saving = ref(false)

// Editor
const editing = ref(false)
const isEdit = ref(false)
const editId = ref<number | null>(null)

const form = reactive({
  name: '',
  backgroundUrl: '',
})

const layers = ref<Layer[]>([])
const selectedLayerId = ref<string | null>(null)
const selectedLayer = computed(() =>
  layers.value.find((l) => l.id === selectedLayerId.value) || null,
)

// Canvas
const canvasContainerRef = ref<HTMLElement | null>(null)
const bgNaturalSize = ref({ width: 0, height: 0 })
const displayScale = ref(1)
const draggingLayerId = ref<string | null>(null)
const dragStartMouse = ref({ x: 0, y: 0 })
const dragStartLayerPos = ref({ x: 0, y: 0 })

const baseUrl = computed(() => import.meta.env.VITE_API_BASE_URL || '')

const uploadHeaders = computed(() => ({
  Authorization: 'Bearer ' + (localStorage.getItem('admin_token') || ''),
}))

let uidCounter = 0
function uid() {
  return `ly_${++uidCounter}`
}

// ==================== Canvas ====================

const canvasStageStyle = computed(() => {
  const { width, height } = bgNaturalSize.value
  if (!width || !height) return { width: '100%', height: '100%' }

  const container = canvasContainerRef.value
  if (!container) return {}

  const cw = container.clientWidth - 16
  const ch = container.clientHeight - 16
  const ar = width / height

  let sw: number, sh: number
  if (cw / ch > ar) {
    sh = ch
    sw = ch * ar
  } else {
    sw = cw
    sh = cw / ar
  }

  displayScale.value = sw / width
  return { width: `${sw}px`, height: `${sh}px` }
})

function overlayStyle(item: Layer) {
  const s = displayScale.value
  const align = (
    item.textAlign === 'center' ? 'center' :
    item.textAlign === 'right' ? 'right' :
    'left'
  ) as 'left' | 'center' | 'right'

  if (item.type === 'qr') {
    const sz = (item.size || 200) * s
    return {
      left: `${item.x * s}px`,
      top: `${item.y * s}px`,
      width: `${sz}px`,
      height: `${sz}px`,
    }
  }
  return {
    left: `${item.x * s}px`,
    top: `${item.y * s}px`,
    fontSize: `${(item.fontSize || 32) * s}px`,
    color: item.color,
    fontWeight: item.fontWeight || 'normal',
    textAlign: align,
    whiteSpace: 'nowrap' as const,
  }
}

function onBgLoad(e: Event) {
  const img = e.target as HTMLImageElement
  bgNaturalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
}

// ==================== Drag: Panel → Canvas ====================

let pendingDragType: 'text' | 'qr' | null = null

function onPanelDragStart(type: 'text' | 'qr', e: DragEvent) {
  pendingDragType = type
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'copy'
  }
}

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  if (!pendingDragType) return
  if (!form.backgroundUrl) {
    ElMessage.warning('请先上传背景图')
    return
  }

  const container = canvasContainerRef.value
  if (!container) return

  const rect = container.getBoundingClientRect()
  const displayX = e.clientX - rect.left
  const displayY = e.clientY - rect.top
  const s = displayScale.value || 1
  const ox = Math.round(displayX / s)
  const oy = Math.round(displayY / s)

  if (pendingDragType === 'text') {
    const layer: Layer = {
      id: uid(),
      type: 'text',
      content: '双击编辑文字',
      x: Math.max(0, ox),
      y: Math.max(0, oy),
      fontSize: 32,
      color: '#ffffff',
      fontWeight: 'normal',
      textAlign: 'left',
      size: 0,
    }
    layers.value.push(layer)
    selectedLayerId.value = layer.id
  } else if (pendingDragType === 'qr') {
    if (layers.value.some((l) => l.type === 'qr')) {
      ElMessage.warning('只能添加一个二维码')
      return
    }
    const sz = 200
    const layer: Layer = {
      id: uid(),
      type: 'qr',
      content: '',
      x: Math.max(0, ox - sz / 2 / (s || 1)),
      y: Math.max(0, oy - sz / 2 / (s || 1)),
      fontSize: 0,
      color: '',
      fontWeight: 'normal',
      textAlign: 'left',
      size: sz,
    }
    layers.value.push(layer)
    selectedLayerId.value = layer.id
  }
  pendingDragType = null
}

// ==================== Drag: Reposition on Canvas ====================

function onLayerMouseDown(e: MouseEvent, layerId: string) {
  selectedLayerId.value = layerId
  draggingLayerId.value = layerId
  dragStartMouse.value = { x: e.clientX, y: e.clientY }
  const layer = layers.value.find((l) => l.id === layerId)
  if (layer) {
    dragStartLayerPos.value = { x: layer.x, y: layer.y }
  }
  e.stopPropagation()
  e.preventDefault()
}

function onCanvasMouseMove(e: MouseEvent) {
  if (!draggingLayerId.value) return
  const s = displayScale.value || 1
  const dx = (e.clientX - dragStartMouse.value.x) / s
  const dy = (e.clientY - dragStartMouse.value.y) / s
  const layer = layers.value.find((l) => l.id === draggingLayerId.value)
  if (layer) {
    layer.x = Math.round(Math.max(0, dragStartLayerPos.value.x + dx))
    layer.y = Math.round(Math.max(0, dragStartLayerPos.value.y + dy))
  }
}

function onCanvasMouseUp() {
  draggingLayerId.value = null
}

// Global mouseup to catch releases outside canvas
function onWindowMouseUp() {
  draggingLayerId.value = null
}

// ==================== Layer Ops ====================

function selectLayer(id: string) {
  selectedLayerId.value = id
}

function deleteLayer(id: string) {
  layers.value = layers.value.filter((l) => l.id !== id)
  if (selectedLayerId.value === id) selectedLayerId.value = null
}

function onKeydown(e: KeyboardEvent) {
  if (!editing.value) return
  if (e.key === 'Delete' || e.key === 'Backspace') {
    // Don't delete if editing an input
    const tag = (e.target as HTMLElement).tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA') return
    if (selectedLayerId.value) {
      deleteLayer(selectedLayerId.value)
    }
  }
  if (e.key === 'Escape') {
    selectedLayerId.value = null
  }
}

// ==================== Upload ====================

function handleBgUpload(res: any) {
  const url = res?.data?.url || res?.url || res
  form.backgroundUrl = url
}

// ==================== Editor Lifecycle ====================

function resetEditor() {
  form.name = ''
  form.backgroundUrl = ''
  layers.value = []
  selectedLayerId.value = null
  bgNaturalSize.value = { width: 0, height: 0 }
  displayScale.value = 1
  isEdit.value = false
  editId.value = null
}

function openCreate() {
  resetEditor()
  editing.value = true
}

function openEdit(row: Poster) {
  resetEditor()
  isEdit.value = true
  editId.value = row.id
  form.name = row.name
  form.backgroundUrl = row.backgroundUrl

  try {
    const textConfig: any[] = JSON.parse(row.textConfig || '[]')
    textConfig.forEach((t) => {
      layers.value.push({
        id: uid(),
        type: 'text',
        content: t.content || '',
        x: t.x || 0,
        y: t.y || 0,
        fontSize: t.fontSize || 32,
        color: t.color || '#ffffff',
        fontWeight: t.fontWeight || 'normal',
        textAlign: t.textAlign || 'left',
        size: 0,
      })
    })
  } catch {
    /* ignore */
  }

  try {
    const qr: any = JSON.parse(row.qrConfig || '{}')
    if (qr && Object.keys(qr).length > 0) {
      layers.value.push({
        id: uid(),
        type: 'qr',
        content: '',
        x: qr.x || 0,
        y: qr.y || 0,
        fontSize: 0,
        color: '',
        fontWeight: 'normal',
        textAlign: 'left',
        size: qr.size || 200,
      })
    }
  } catch {
    /* ignore */
  }

  editing.value = true
}

function closeEditor() {
  editing.value = false
  resetEditor()
}

async function handleSave() {
  if (!form.name.trim()) {
    ElMessage.warning('请输入海报名称')
    return
  }
  if (!form.backgroundUrl.trim()) {
    ElMessage.warning('请上传背景图')
    return
  }

  saving.value = true
  try {
    const textItems = layers.value
      .filter((l) => l.type === 'text')
      .map((l) => ({
        content: l.content,
        x: l.x,
        y: l.y,
        fontSize: l.fontSize,
        color: l.color,
        fontWeight: l.fontWeight,
        textAlign: l.textAlign,
      }))

    const qrLayer = layers.value.find((l) => l.type === 'qr')
    const qrConfig = qrLayer
      ? { x: qrLayer.x, y: qrLayer.y, size: qrLayer.size }
      : { x: 0, y: 0, size: 200 }

    const data = {
      name: form.name,
      backgroundUrl: form.backgroundUrl,
      textConfig: JSON.stringify(textItems),
      qrConfig: JSON.stringify(qrConfig),
    }

    if (isEdit.value) {
      await request.put(`/admin/promotion-poster/${editId.value}`, data)
      ElMessage.success('更新成功')
    } else {
      await request.post('/admin/promotion-poster', data)
      ElMessage.success('创建成功')
    }
    closeEditor()
    fetchPosters()
  } finally {
    saving.value = false
  }
}

// ==================== List Ops ====================

async function fetchPosters() {
  loading.value = true
  try {
    const res = (await request.get('/admin/promotion-poster')) as any
    posters.value = res.data || res || []
  } finally {
    loading.value = false
  }
}

async function handleActivate(row: Poster) {
  try {
    await request.put(`/admin/promotion-poster/${row.id}/activate`)
    ElMessage.success('已启用')
    fetchPosters()
  } catch {
    /* ignore */
  }
}

async function handleDelete(row: Poster) {
  try {
    await ElMessageBox.confirm(`确定删除海报「${row.name}」？`, '确认删除', {
      type: 'warning',
    })
    await request.delete(`/admin/promotion-poster/${row.id}`)
    ElMessage.success('已删除')
    fetchPosters()
  } catch {
    /* ignore */
  }
}

// ==================== Lifecycle ====================

onMounted(() => {
  fetchPosters()
  window.addEventListener('mouseup', onWindowMouseUp)
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('mouseup', onWindowMouseUp)
  window.removeEventListener('keydown', onKeydown)
})

// Recalc canvas when bg changes
watch(
  () => form.backgroundUrl,
  () => {
    bgNaturalSize.value = { width: 0, height: 0 }
    displayScale.value = 1
  },
)
</script>

<template>
  <div>
    <!-- ==================== List View ==================== -->
    <template v-if="!editing">
      <div class="page-header">
        <h3>推广海报管理</h3>
        <el-button type="primary" :icon="Plus" @click="openCreate">
          新增海报
        </el-button>
      </div>

      <el-table :data="posters" v-loading="loading" border stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="name" label="海报名称" min-width="140" />
        <el-table-column label="背景图" width="120">
          <template #default="{ row }">
            <el-image
              v-if="row.backgroundUrl"
              :src="row.backgroundUrl"
              style="width: 80px; height: 60px; object-fit: cover; border-radius: 4px"
              fit="cover"
              :preview-src-list="[row.backgroundUrl]"
            />
            <span v-else style="color: #999">未设置</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'">
              {{ row.isActive ? '已启用' : '未启用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ row.createdAt ? row.createdAt.slice(0, 19).replace('T', ' ') : '' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="!row.isActive"
              size="small"
              type="success"
              @click="handleActivate(row)"
            >
              启用
            </el-button>
            <el-button
              v-if="!row.isActive"
              size="small"
              type="danger"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </template>

    <!-- ==================== Editor View ==================== -->
    <div v-else class="poster-editor">
      <!-- Header -->
      <div class="editor-header">
        <el-button :icon="Back" @click="closeEditor">返回列表</el-button>
        <span class="editor-title">{{
          isEdit ? '编辑海报' : '新建海报'
        }}</span>
        <div class="editor-header-right">
          <el-input
            v-model="form.name"
            placeholder="输入海报名称"
            style="width: 220px"
            size="default"
          />
          <el-button
            type="primary"
            :loading="saving"
            @click="handleSave"
            style="margin-left: 12px"
          >
            保存
          </el-button>
        </div>
      </div>

      <!-- Body: 3 panels -->
      <div class="editor-body">
        <!-- Left Panel: Component Library + Layers -->
        <div class="editor-left">
          <div class="panel-section">
            <h4 class="panel-title">背景图</h4>
            <div class="bg-upload-area">
              <template v-if="form.backgroundUrl">
                <el-image
                  :src="form.backgroundUrl"
                  style="
                    width: 100%;
                    height: 120px;
                    object-fit: cover;
                    border-radius: 6px;
                  "
                  fit="cover"
                />
                <el-button
                  size="small"
                  style="width: 100%; margin-top: 8px"
                  @click="form.backgroundUrl = ''"
                >
                  更换背景图
                </el-button>
              </template>
              <el-upload
                v-else
                :action="baseUrl + '/files/upload'"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleBgUpload"
                accept="image/*"
                drag
                style="width: 100%"
              >
                <el-icon style="font-size: 32px; color: #c0c4cc"><Upload /></el-icon>
                <div style="color: #999; font-size: 13px; margin-top: 4px">
                  点击或拖拽上传
                </div>
              </el-upload>
            </div>
          </div>

          <div class="panel-section">
            <h4 class="panel-title">组件库</h4>
            <div class="comp-list">
              <div
                class="comp-item"
                draggable="true"
                @dragstart="onPanelDragStart('text', $event)"
              >
                <span class="comp-icon">📝</span>
                <span>文字</span>
                <span class="comp-hint">拖入画布</span>
              </div>
              <div
                class="comp-item"
                draggable="true"
                @dragstart="onPanelDragStart('qr', $event)"
              >
                <span class="comp-icon">📱</span>
                <span>小程序码</span>
                <span class="comp-hint">拖入画布</span>
              </div>
            </div>
          </div>

          <div class="panel-section">
            <h4 class="panel-title">
              图层
              <span style="font-weight: normal; color: #999; font-size: 12px"
                >（{{ layers.length }}）</span
              >
            </h4>
            <div v-if="layers.length === 0" class="layer-empty">
              拖入组件开始设计
            </div>
            <div
              v-for="(item, idx) in layers"
              :key="item.id"
              class="layer-item"
              :class="{ active: item.id === selectedLayerId }"
              @click="selectLayer(item.id)"
            >
              <span class="layer-icon">{{
                item.type === 'qr' ? '📱' : '📝'
              }}</span>
              <span class="layer-label">{{
                item.type === 'qr'
                  ? '小程序码'
                  : item.content?.slice(0, 10) || '文字 ' + (idx + 1)
              }}</span>
              <el-button
                type="danger"
                size="small"
                :icon="Delete"
                circle
                style="margin-left: auto"
                @click.stop="deleteLayer(item.id)"
              />
            </div>
          </div>

          <div class="panel-tips">
            <p>💡 提示：</p>
            <p>· 从组件库拖入画布添加元素</p>
            <p>· 在画布上拖动元素调整位置</p>
            <p>· 选中元素后在右侧编辑属性</p>
            <p>· 选中后按 Delete 键删除</p>
          </div>
        </div>

        <!-- Center: Canvas -->
        <div
          class="editor-center"
          ref="canvasContainerRef"
          @drop="onCanvasDrop"
          @dragover.prevent
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @click="selectedLayerId = null"
        >
          <div class="canvas-stage" :style="canvasStageStyle">
            <!-- Background -->
            <img
              v-if="form.backgroundUrl"
              :src="form.backgroundUrl"
              class="canvas-bg"
              @load="onBgLoad"
              @dragstart.prevent
            />

            <!-- Empty state -->
            <div v-else class="canvas-empty">
              <el-icon style="font-size: 48px; color: #c0c4cc"><Upload /></el-icon>
              <p style="color: #999; margin-top: 12px">
                请先在左侧上传背景图
              </p>
            </div>

            <!-- Component overlays -->
            <div
              v-for="item in layers"
              :key="item.id"
              class="canvas-overlay"
              :class="{
                selected: item.id === selectedLayerId,
                dragging: item.id === draggingLayerId,
              }"
              :style="overlayStyle(item)"
              @mousedown.stop="onLayerMouseDown($event, item.id)"
              @click.stop
            >
              <template v-if="item.type === 'text'">
                {{ item.content || '文字' }}
              </template>
              <template v-else>
                <div class="qr-placeholder">
                  <span style="font-size: 24px">📱</span>
                  <span style="font-size: 10px">小程序码</span>
                </div>
              </template>

              <!-- Resize handle for QR -->
              <div
                v-if="item.type === 'qr' && item.id === selectedLayerId"
                class="resize-handle"
                @mousedown.stop="() => {}"
              />
            </div>
          </div>

          <!-- Zoom indicator -->
          <div class="canvas-zoom">
            {{ Math.round(displayScale * 100) }}%
          </div>
        </div>

        <!-- Right Panel: Properties -->
        <div class="editor-right">
          <h4 class="panel-title">属性面板</h4>

          <template v-if="!selectedLayer">
            <div class="props-empty">
              <p>👆 点击画布上的元素</p>
              <p>编辑其属性</p>
            </div>
          </template>

          <template v-else>
            <!-- Text properties -->
            <template v-if="selectedLayer.type === 'text'">
              <div class="prop-group">
                <label>文字内容</label>
                <el-input
                  v-model="selectedLayer.content"
                  type="textarea"
                  :rows="2"
                  placeholder="输入文字内容"
                />
              </div>

              <div class="prop-row">
                <div class="prop-group">
                  <label>X 坐标</label>
                  <el-input-number
                    v-model="selectedLayer.x"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                </div>
                <div class="prop-group">
                  <label>Y 坐标</label>
                  <el-input-number
                    v-model="selectedLayer.y"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                </div>
              </div>

              <div class="prop-group">
                <label>字号</label>
                <el-input-number
                  v-model="selectedLayer.fontSize"
                  :min="8"
                  :max="200"
                  size="small"
                  controls-position="right"
                />
              </div>

              <div class="prop-group">
                <label>文字颜色</label>
                <el-color-picker
                  v-model="selectedLayer.color"
                  show-alpha
                  size="default"
                  style="display: block"
                />
              </div>

              <div class="prop-row">
                <div class="prop-group">
                  <label>粗细</label>
                  <el-select
                    v-model="selectedLayer.fontWeight"
                    size="small"
                    style="width: 100%"
                  >
                    <el-option label="正常" value="normal" />
                    <el-option label="粗体" value="bold" />
                  </el-select>
                </div>
                <div class="prop-group">
                  <label>对齐</label>
                  <el-select
                    v-model="selectedLayer.textAlign"
                    size="small"
                    style="width: 100%"
                  >
                    <el-option label="左对齐" value="left" />
                    <el-option label="居中" value="center" />
                    <el-option label="右对齐" value="right" />
                  </el-select>
                </div>
              </div>
            </template>

            <!-- QR properties -->
            <template v-else>
              <div class="prop-row">
                <div class="prop-group">
                  <label>X 坐标</label>
                  <el-input-number
                    v-model="selectedLayer.x"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                </div>
                <div class="prop-group">
                  <label>Y 坐标</label>
                  <el-input-number
                    v-model="selectedLayer.y"
                    :min="0"
                    size="small"
                    controls-position="right"
                  />
                </div>
              </div>

              <div class="prop-group">
                <label>二维码大小</label>
                <el-input-number
                  v-model="selectedLayer.size"
                  :min="80"
                  :max="500"
                  size="small"
                  controls-position="right"
                />
              </div>

              <div class="prop-hint">
                小程序码将在实际生成时替换此占位区域
              </div>
            </template>

            <!-- Delete -->
            <el-button
              type="danger"
              plain
              style="width: 100%; margin-top: 20px"
              @click="deleteLayer(selectedLayerId!)"
            >
              删除此元素
            </el-button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ==================== List View ==================== */

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.page-header h3 {
  margin: 0;
}

/* ==================== Editor ==================== */

.poster-editor {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  background: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.editor-header {
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
  flex-shrink: 0;
}

.editor-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.editor-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
}

/* ==================== 3-Panel Body ==================== */

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* --- Left Panel --- */

.editor-left {
  width: 250px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;
}

.panel-section {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: #666;
  margin: 0 0 10px 0;
  text-transform: uppercase;
}

.bg-upload-area {
  min-height: 80px;
}

.comp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
  user-select: none;
  font-size: 13px;
}
.comp-item:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.comp-item:active {
  cursor: grabbing;
}
.comp-icon {
  font-size: 18px;
}
.comp-hint {
  margin-left: auto;
  font-size: 11px;
  color: #bbb;
}

.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 4px;
  font-size: 13px;
  transition: background 0.15s;
}
.layer-item:hover {
  background: #f5f5f5;
}
.layer-item.active {
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
}
.layer-icon {
  font-size: 14px;
}
.layer-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.layer-empty {
  color: #ccc;
  font-size: 13px;
  text-align: center;
  padding: 20px 0;
}

.panel-tips {
  padding: 16px;
  font-size: 12px;
  color: #999;
  line-height: 1.8;
}
.panel-tips p:first-child {
  color: #666;
  font-weight: 500;
}
.panel-tips p {
  margin: 0;
}

/* --- Center Canvas --- */

.editor-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #dce1e8;
  /* Grid pattern */
  background-image: linear-gradient(45deg, #cfd4db 25%, transparent 25%),
    linear-gradient(-45deg, #cfd4db 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cfd4db 75%),
    linear-gradient(-45deg, transparent 75%, #cfd4db 75%);
  background-size: 20px 20px;
  background-position:
    0 0,
    0 10px,
    10px -10px,
    -10px 0px;
  overflow: hidden;
  position: relative;
}

.canvas-stage {
  position: relative;
  background: #fff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.canvas-bg {
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
}

.canvas-empty {
  width: 100%;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fff;
}

/* Component overlays */
.canvas-overlay {
  position: absolute;
  cursor: move;
  user-select: none;
  transition: box-shadow 0.15s;
  box-sizing: border-box;
}
.canvas-overlay:hover {
  outline: 1px dashed #409eff;
}
.canvas-overlay.selected {
  outline: 2px solid #409eff;
  outline-offset: -1px;
}
.canvas-overlay.dragging {
  outline: 2px solid #409eff;
  opacity: 0.8;
}

.qr-placeholder {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.9);
  border: 2px dashed #bbb;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}

.resize-handle {
  position: absolute;
  right: -6px;
  bottom: -6px;
  width: 14px;
  height: 14px;
  background: #409eff;
  border-radius: 50%;
  border: 2px solid #fff;
  cursor: nwse-resize;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.canvas-zoom {
  position: absolute;
  right: 12px;
  bottom: 12px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  pointer-events: none;
}

/* --- Right Panel --- */

.editor-right {
  width: 280px;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  padding: 16px;
  overflow-y: auto;
  flex-shrink: 0;
}

.props-empty {
  text-align: center;
  color: #ccc;
  margin-top: 80px;
  font-size: 14px;
  line-height: 2;
}

.prop-group {
  margin-bottom: 12px;
}
.prop-group label {
  display: block;
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  font-weight: 500;
}
.prop-group :deep(.el-input-number) {
  width: 100%;
}

.prop-row {
  display: flex;
  gap: 10px;
}
.prop-row .prop-group {
  flex: 1;
}

.prop-hint {
  font-size: 12px;
  color: #bbb;
  margin-top: 8px;
  line-height: 1.6;
}
</style>
