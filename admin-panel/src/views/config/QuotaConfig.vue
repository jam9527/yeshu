<script setup lang="ts">
/**
 * 名额设置已合并到"可预约日期管理"页面（日历视图）
 * 请前往 DateConfig 进行日期和名额的统一配置
 */
</script>

<template>
  <div>
    <div class="page-header"><h3>名额设置</h3></div>
    <el-card>
      <el-result icon="info" title="名额设置已合并" sub-title="请前往「可预约日期管理」页面，通过日历视图进行日期和名额的统一配置">
        <template #extra>
          <el-button type="primary" @click="$router.push('/config/date')">前往日期管理</el-button>
        </template>
      </el-result>
    </el-card>
  </div>
</template>
