<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '../../api/request'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { const d = new Date(iso); if (isNaN(d.getTime())) return iso; const p = (n: number) => n.toString().padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}` } catch { return iso }
}

const list = ref([]); const total = ref(0); const page = ref(1); const loading = ref(false)
const detailVisible = ref(false); const currentDetail = ref<any>(null)

function parseImages(images: any): string[] {
  if (!images) return []
  try { return typeof images === 'string' ? JSON.parse(images) : images } catch { return [] }
}

async function fetchData() {
  loading.value = true
  try { const res: any = await request.get('/admin/feedbacks', { params: { page: page.value, pageSize: 10 } }); if (res.data) { list.value = res.data.records || []; total.value = res.data.total || 0 } } finally { loading.value = false }
}

function showDetail(row: any) {
  currentDetail.value = row
  detailVisible.value = true
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>用户反馈</h3></div>
    <el-card>
      <el-table :data="list" v-loading="loading" stripe>
        <el-table-column prop="content" label="反馈内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="contact" label="联系方式" width="140" />
        <el-table-column label="反馈时间" width="160">
          <template #default="{ row }">{{ fmtDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'PENDING' ? 'warning' : 'success'" size="small">{{ row.status === 'PENDING' ? '待处理' : '已处理' }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="80">
          <template #default="{ row }">
            <el-button size="small" @click="showDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-pagination v-model:current-page="page" :total="total" :page-size="10" layout="prev, pager, next" @current-change="fetchData" style="margin-top:16px;text-align:right" />
    </el-card>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="反馈详情" width="600px">
      <template v-if="currentDetail">
        <el-descriptions :column="1" border style="margin-bottom:16px">
          <el-descriptions-item label="联系方式">{{ currentDetail.contact || '未填写' }}</el-descriptions-item>
          <el-descriptions-item label="反馈时间">{{ fmtDate(currentDetail.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentDetail.status === 'PENDING' ? 'warning' : 'success'" size="small">
              {{ currentDetail.status === 'PENDING' ? '待处理' : '已处理' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 12px 0 8px; color: #333">反馈内容</h4>
        <div style="padding:12px;background:#f5f7fa;border-radius:4px;white-space:pre-wrap;line-height:1.7;color:#333;margin-bottom:16px">{{ currentDetail.content }}</div>

        <h4 style="margin: 12px 0 8px; color: #333">上传截图</h4>
        <div v-if="parseImages(currentDetail.images).length" style="display:flex;flex-wrap:wrap;gap:8px">
          <img v-for="(img, i) in parseImages(currentDetail.images)" :key="i" :src="img" style="width:120px;height:120px;object-fit:cover;border-radius:4px;border:1px solid #eee" />
        </div>
        <el-empty v-else description="未上传截图" :image-size="60" />
      </template>
    </el-dialog>
  </div>
</template>
