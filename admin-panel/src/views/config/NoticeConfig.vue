<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const personalNotice = ref('')
const teamNotice = ref('')
const ticketingNotice = ref('')
const invitePopupTitle = ref('')
const invitePopupContent = ref('')
const saving = ref(false)
const inviteSaving = ref(false)

async function fetchData() {
  try {
    const [pRes, tRes, tkRes, inviteRes] = await Promise.all([
      request.get('/notices/PERSONAL'),
      request.get('/notices/TEAM'),
      request.get('/notices/TICKETING'),
      request.get('/notices/INVITE_CODE_CONTACT'),
    ])
    if ((pRes as any).data) personalNotice.value = (pRes as any).data.content || ''
    if ((tRes as any).data) teamNotice.value = (tRes as any).data.content || ''
    if ((tkRes as any).data) ticketingNotice.value = (tkRes as any).data.content || ''
    if ((inviteRes as any).data?.content) {
      try {
        const data = JSON.parse((inviteRes as any).data.content)
        invitePopupTitle.value = data.title || ''
        invitePopupContent.value = data.content || ''
      } catch { /* ignore parse error */ }
    }
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

async function saveInviteContact() {
  inviteSaving.value = true
  try {
    const content = JSON.stringify({ title: invitePopupTitle.value, content: invitePopupContent.value })
    await request.put('/admin/config/notices/INVITE_CODE_CONTACT', { content })
    ElMessage.success('保存成功')
  } catch {
    // 错误已在请求拦截器中统一处理
  } finally { inviteSaving.value = false }
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
    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="24">
        <el-card>
          <template #header>购票须知（显示在个人预约日历下方）</template>
          <el-input v-model="ticketingNotice" type="textarea" :rows="12" />
          <el-button type="primary" style="margin-top:12px" :loading="saving" @click="save('TICKETING', ticketingNotice)">保存</el-button>
        </el-card>
      </el-col>
    </el-row>
    <el-row :gutter="20" style="margin-top:20px">
      <el-col :span="24">
        <el-card>
          <template #header>邀请码联系弹窗（预约页点击"点击这里"显示的弹窗）</template>
          <div style="margin-bottom:12px">
            <div style="margin-bottom:4px;font-size:14px;color:#606266">弹窗标题</div>
            <el-input v-model="invitePopupTitle" placeholder="例如：联系我们" />
          </div>
          <div style="margin-bottom:12px">
            <div style="margin-bottom:4px;font-size:14px;color:#606266">弹窗内容</div>
            <el-input v-model="invitePopupContent" type="textarea" :rows="8" placeholder="例如：请通过以下方式联系客服..." />
          </div>
          <el-button type="primary" :loading="inviteSaving" @click="saveInviteContact">保存</el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>
