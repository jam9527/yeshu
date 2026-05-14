<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const enabled = ref(false)
const loading = ref(false)

async function fetchConfig() {
  loading.value = true
  try {
    const res: any = await request.get('/admin/config/require-real-name')
    if (res.data) {
      enabled.value = res.data.enabled
    }
  } finally {
    loading.value = false
  }
}

async function toggle(val: boolean) {
  try {
    await request.put('/admin/config/require-real-name', { enabled: val })
    enabled.value = val
    ElMessage.success(val ? '已开启实名预约' : '已关闭实名预约')
  } catch {
    // 错误已在拦截器中处理
  }
}

onMounted(fetchConfig)
</script>

<template>
  <div>
    <div class="page-header"><h3>实名预约开关</h3></div>
    <el-card>
      <el-form label-width="120px">
        <el-form-item label="个人实名预约">
          <el-switch
            :model-value="enabled"
            :loading="loading"
            @change="toggle"
          />
          <span style="margin-left: 12px; color: #909399; font-size: 13px;">
            开启后，用户必须先完成实名核验才能提交个人预约
          </span>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
