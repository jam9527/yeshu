<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const personalNotice = ref('')
const teamNotice = ref('')
const saving = ref(false)

async function fetchData() {
  try {
    const [pRes, tRes] = await Promise.all([request.get('/notices/PERSONAL'), request.get('/notices/TEAM')])
    if ((pRes as any).data) personalNotice.value = (pRes as any).data.content || ''
    if ((tRes as any).data) teamNotice.value = (tRes as any).data.content || ''
  } catch { /* ignore */ }
}

async function save(type: string, content: string) {
  saving.value = true
  try {
    await request.put(`/admin/config/notices/${type}`, { content })
    ElMessage.success('保存成功')
  } catch {
    // 错误已在请求拦截器中统一处理
  } finally { saving.value = false }
}

onMounted(fetchData)
</script>

<template>
  <div>
    <div class="page-header"><h3>预约须知设置</h3></div>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-card>
          <template #header>个人预约须知</template>
          <el-input v-model="personalNotice" type="textarea" :rows="12" />
          <el-button type="primary" style="margin-top:12px" :loading="saving" @click="save('PERSONAL', personalNotice)">保存</el-button>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>团队预约须知</template>
          <el-input v-model="teamNotice" type="textarea" :rows="12" />
          <el-button type="primary" style="margin-top:12px" :loading="saving" @click="save('TEAM', teamNotice)">保存</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
