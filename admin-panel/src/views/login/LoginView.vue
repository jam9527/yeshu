<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import request from '../../api/request'

const router = useRouter()
const username = ref('')
const password = ref('')
const loading = ref(false)

async function handleLogin() {
  if (!username.value || !password.value) return
  loading.value = true
  try {
    const res: any = await request.post('/admin/auth/login', {
      username: username.value,
      password: password.value,
    })
    if (res.data?.token) {
      localStorage.setItem('admin_token', res.data.token)
      router.push('/dashboard')
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 style="color: #ffd700; font-size: 28px; margin-bottom: 4px;">椰树集团</h1>
        <p style="color: #999; font-size: 14px;">参观预约管理系统</p>
      </div>

      <el-form @submit.prevent="handleLogin" style="margin-top: 30px;">
        <el-form-item>
          <el-input v-model="username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" type="password" placeholder="密码" size="large" show-password />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            style="width: 100%; background: #e60012; border-color: #e60012;"
            :loading="loading"
            @click="handleLogin"
          >
            登 录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #000 0%, #1a1a2e 50%, #000 100%);
}
.login-card {
  width: 400px;
  padding: 40px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.login-header {
  text-align: center;
  padding-bottom: 20px;
  border-bottom: 2px solid #ffd700;
}
</style>
