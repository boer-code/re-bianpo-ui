<!-- 执行器配置组件 -->
<script setup lang="ts">
import type { Action } from '#/api/iot/rule/scene';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import { Button, Card, Empty, Form, Select, Tag } from 'ant-design-vue';

import {
  getActionTypeLabel,
  getActionTypeOptions,
  IotRuleSceneActionTypeEnum,
} from '#/views/iot/utils/constants';

import AlertConfig from '../configs/alert-config.vue';
import DeviceControlConfig from '../configs/device-control-config.vue';

/** 执行器配置组件 */
defineOptions({ name: 'ActionSection' });

const props = defineProps<{
  actions: Action[];
}>();

const emit = defineEmits<{
  (e: 'update:actions', value: Action[]): void;
}>();

const actions = useVModel(props, 'actions', emit);

/** 判断是否为设备执行器类型 */
function isDeviceAction(type: number): boolean {
  const deviceActionTypes = [
    IotRuleSceneActionTypeEnum.DEVICE_PROPERTY_SET,
    IotRuleSceneActionTypeEnum.DEVICE_SERVICE_INVOKE,
  ] as number[];
  return deviceActionTypes.includes(type);
}

/** 判断是否为告警执行器类型 */
function isAlertAction(type: number | string): boolean {
  const alertActionTypes = [
    IotRuleSceneActionTypeEnum.ALERT_TRIGGER,
    IotRuleSceneActionTypeEnum.ALERT_RECOVER,
  ] as number[];
  return alertActionTypes.includes(type as number);
}

/** 获取执行器标签颜色（用于 Tag 的 color 属性） */
function getActionTagColor(type: number | string) {
  const actionTypeTags: Record<string, string> = {
    [IotRuleSceneActionTypeEnum.DEVICE_PROPERTY_SET]: 'blue',
    [IotRuleSceneActionTypeEnum.DEVICE_SERVICE_INVOKE]: 'green',
    [IotRuleSceneActionTypeEnum.ALERT_TRIGGER]: 'red',
    [IotRuleSceneActionTypeEnum.ALERT_RECOVER]: 'orange'
  };
  return actionTypeTags[type as string] || 'default';
}

function normalizeActionType(type?: number | string): number {
  return Number(type || 0);
}

/**
 * 创建默认的执行器数据
 * @returns 默认执行器对象
 */
function createDefaultActionData(): Action {
  return {
    type: IotRuleSceneActionTypeEnum.DEVICE_PROPERTY_SET, // 默认为设备属性设置
    productId: undefined,
    deviceId: undefined,
    identifier: undefined, // 物模型标识符（服务调用时使用）
    params: undefined,
    alertConfigId: undefined,
  };
}

/**
 * 添加执行器
 */
function addAction() {
  const newAction = createDefaultActionData();
  actions.value.push(newAction);
}

/**
 * 删除执行器
 * @param index 执行器索引
 */
function removeAction(index: number) {
  actions.value.splice(index, 1);
}

/**
 * 更新执行器类型
 * @param index 执行器索引
 * @param type 执行器类型
 */
function updateActionType(index: number, type: number) {
  const action = actions.value[index];
  if (!action) {
    return;
  }
  action.type = type;
  onActionTypeChange(action, type);
}

/**
 * 更新执行器
 * @param index 执行器索引
 * @param action 执行器对象
 */
function updateAction(index: number, action: Action) {
  actions.value[index] = action;
}

/**
 * 更新告警配置
 * @param index 执行器索引
 * @param alertConfigId 告警配置ID
 */
function updateActionAlertConfig(index: number, alertConfigId?: number) {
  if (actions.value[index]) {
    actions.value[index].alertConfigId = alertConfigId;
  }
}

/**
 * 监听执行器类型变化
 * @param action 执行器对象
 * @param type 执行器类型
 */
function onActionTypeChange(action: Action, type: number) {
  // 清理不相关的配置，确保数据结构干净
  if (isDeviceAction(type)) {
    // 设备控制类型：清理告警配置，确保设备参数存在
    action.alertConfigId = undefined;
    if (!action.params) {
      action.params = '';
    }
  } else if (isAlertAction(type)) {
    action.productId = undefined;
    action.deviceId = undefined;
    action.identifier = undefined; // 清理服务标识符
    action.params = undefined;
    action.alertConfigId = undefined;
  }
}
</script>

<template>
  <Card class="mb-4">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="gap-8px flex items-center">
          <IconifyIcon icon="ep:setting" class="text-18px text-primary" />
          <span class="text-16px font-600 text-primary"> 执行器配置 </span>
            <Tag size="small" type="info" class="ml-2">
            {{ actions.length }} 个执行器
          </Tag>
        </div>
        <div class="gap-8px flex items-center">
          <Button type="primary" size="small" @click="addAction">
            <IconifyIcon icon="ep:plus" />
            添加执行器
          </Button>
        </div>
      </div>
    </template>

    <div class="p-0">
      <!-- 空状态 -->
      <div v-if="actions.length === 0">
        <Empty description="暂无执行器配置">
          <Button type="primary" @click="addAction">
            <IconifyIcon icon="ep:plus" />
            添加第一个执行器
          </Button>
        </Empty>
      </div>

      <!-- 执行器列表 -->
      <div v-else class="space-y-4">
        <div
          v-for="(action, index) in actions"
          :key="`action-${index}`"
          class="rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
        >
          <!-- 执行器头部 -->
          <div
            class="flex items-center justify-between rounded-t-lg border-b border-border bg-primary/5 p-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center gap-2 text-base font-semibold text-primary"
              >
                <div
                  class="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
                >
                  {{ index + 1 }}
                </div>
                <span>执行器 {{ index + 1 }}</span>
              </div>
              <Tag :color="getActionTagColor(normalizeActionType(action.type))" class="font-medium">
                {{ getActionTypeLabel(normalizeActionType(action.type)) }}
              </Tag>
            </div>
            <div class="gap-8px flex items-center">
              <Button
                v-if="actions.length > 1"
                danger
                size="small"
                type="text"
                @click="removeAction(index)"
              >
                <IconifyIcon icon="lucide:trash-2" />
                删除
              </Button>
            </div>
          </div>

          <!-- 执行器内容区域 -->
          <div class="space-y-4 p-4">
            <!-- 执行类型选择 -->
            <div class="w-full">
              <Form.Item label="执行类型" required>
                <Select
                  :value="action.type"
                  @change="(value) => updateActionType(index, Number(value))"
                  :options="getActionTypeOptions()"
                  placeholder="请选择执行类型"
                  class="w-full"
                />
              </Form.Item>
            </div>

            <!-- 设备控制配置 -->
            <DeviceControlConfig
              v-if="isDeviceAction(normalizeActionType(action.type))"
              :model-value="action"
              @update:model-value="(value) => updateAction(index, value)"
            />

            <!-- 告警配置 - 只有恢复告警时才显示 -->
            <AlertConfig
              v-if="
                action.type ===
                IotRuleSceneActionTypeEnum.ALERT_RECOVER
              "
              :model-value="action.alertConfigId"
              @update:model-value="
                (value) => updateActionAlertConfig(index, value)
              "
            />

            <!-- 触发告警提示 - 触发告警时显示 -->
            <div
              v-if="
                action.type ===
                IotRuleSceneActionTypeEnum.ALERT_TRIGGER
              "
              class="rounded-lg border border-border bg-background p-4"
            >
              <div class="mb-2 flex items-center gap-2">
                <IconifyIcon icon="ep:warning" class="text-base text-warning" />
                <span class="text-sm font-semibold text-primary">触发告警</span>
                <Tag size="small" color="warning">自动执行</Tag>
              </div>
              <div class="text-xs leading-relaxed text-muted-foreground">
                当触发条件满足时，系统将自动发送告警通知，可在菜单 [告警中心 ->
                告警配置] 管理。
              </div>
            </div>
          </div>
        </div>

        <!-- 添加提示 -->
        <div class="py-4 text-center">
          <Button type="primary" plain @click="addAction">
            <IconifyIcon icon="ep:plus" />
            继续添加执行器
          </Button>
        </div>
      </div>
    </div>
  </Card>
</template>
