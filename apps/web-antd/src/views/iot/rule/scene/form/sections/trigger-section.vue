<script setup lang="ts">
import type { Trigger, TriggerCondition } from '#/api/iot/rule/scene';

import { onMounted } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import { Button, Card, Empty, Form, Tag } from 'ant-design-vue';

import { CronTab } from '#/components/cron-tab';
import {
  getTriggerTypeLabel,
  IotRuleSceneTriggerTypeEnum,
  isDeviceTrigger,
} from '#/views/iot/utils/constants';

import DeviceTriggerConfig from '../configs/device-trigger-config.vue';
import TimerConditionGroupConfig from '../configs/timer-condition-group-config.vue';

/** 触发器配置组件 */
defineOptions({ name: 'TriggerSection' });

const props = defineProps<{
  triggers: Trigger[];
}>();

const emit = defineEmits<{
  (e: 'update:triggers', value: Trigger[]): void;
}>();

const triggers = useVModel(props, 'triggers', emit);

/** 添加触发器 */
function addTrigger() {
  const newTrigger: Trigger = {
    type: IotRuleSceneTriggerTypeEnum.DEVICE_STATE_UPDATE,
    productId: undefined,
    deviceId: undefined,
    identifier: undefined,
    operator: undefined,
    value: undefined,
    cronExpression: undefined,
    conditionGroups: [] as TriggerCondition[][], // 空的条件组数组
  };
  triggers.value.push(newTrigger);
}

/**
 * 删除触发器
 * @param index 触发器索引
 */
function removeTrigger(index: number) {
  if (triggers.value.length > 1) {
    triggers.value.splice(index, 1);
  }
}

/**
 * 更新触发器类型
 * @param index 触发器索引
 * @param type 触发器类型
 */
function updateTriggerType(index: number, type: number) {
  triggers.value[index]!.type = type;
  onTriggerTypeChange(index, type);
}

/**
 * 更新触发器设备配置
 * @param index 触发器索引
 * @param newTrigger 新的触发器对象
 */
function updateTriggerDeviceConfig(index: number, newTrigger: Trigger) {
  triggers.value[index] = newTrigger;
}

/**
 * 更新触发器 CRON 配置
 * @param index 触发器索引
 * @param cronExpression CRON 表达式
 */
function updateTriggerCronConfig(index: number, cronExpression?: string) {
  triggers.value[index]!.cronExpression = cronExpression;
}

/**
 * 更新触发器条件组配置
 * @param index 触发器索引
 * @param conditionGroups 条件组数组
 */
function updateTriggerConditionGroups(index: number, conditionGroups: TriggerCondition[][]) {
  triggers.value[index]!.conditionGroups = conditionGroups;
}

/** 获取触发器标签颜色（用于 Tag 的 color 属性） */
function getTriggerTagColor(type: number | string) {
  if (type === IotRuleSceneTriggerTypeEnum.TIMER) {
    return 'orange';
  }
  return isDeviceTrigger(type as any) ? 'green' : 'blue';
}

/**
 * 处理触发器类型变化事件
 * @param index 触发器索引
 * @param _ 触发器类型（未使用）
 */
function onTriggerTypeChange(index: number, _: number) {
  const triggerItem = triggers.value[index]!;
  triggerItem.productId = undefined;
  triggerItem.deviceId = undefined;
  triggerItem.identifier = undefined;
  triggerItem.operator = undefined;
  triggerItem.value = undefined;
  triggerItem.cronExpression = undefined;
  triggerItem.conditionGroups = [] as TriggerCondition[][];
}

/** 初始化：确保至少有一个触发器 */
onMounted(() => {
  if (triggers.value.length === 0) {
    addTrigger();
  }
});
</script>

<template>
  <Card class="mb-4">
    <template #title>
      <div class="flex items-center justify-between">
        <div class="gap-8px flex items-center">
          <IconifyIcon icon="ep:lightning" class="text-18px text-primary" />
          <span class="text-16px font-600 text-primary">触发器配置</span>
          <Tag size="small" type="info" class="ml-2">
            {{ triggers.length }} 个触发器
          </Tag>
        </div>
        <Button type="primary" size="small" @click="addTrigger">
          <IconifyIcon icon="lucide:plus" />
          添加触发器
        </Button>
      </div>
    </template>

    <div class="space-y-4 p-4">
      <!-- 触发器列表 -->
      <div v-if="triggers.length > 0" class="space-y-4">
        <div
          v-for="(triggerItem, index) in triggers"
          :key="`trigger-${index}`"
          class="rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
        >
          <!-- 触发器头部 -->
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
                <span>触发器 {{ index + 1 }}</span>
              </div>
              <Tag :color="getTriggerTagColor(triggerItem.type as any)" class="font-medium">
                {{ getTriggerTypeLabel(triggerItem.type as any) }}
              </Tag>
            </div>
            <div class="gap-8px flex items-center">
              <Button
                v-if="triggers.length > 1"
                danger
                size="small"
                type="text"
                @click="removeTrigger(index)"
              >
                <IconifyIcon icon="lucide:trash-2" />
                删除
              </Button>
            </div>
          </div>

          <!-- 触发器内容区域 -->
          <div class="space-y-4 p-4">
            <!-- 设备触发配置 -->
            <DeviceTriggerConfig
              v-if="isDeviceTrigger(triggerItem.type as any)"
              :model-value="triggerItem"
              :index="index"
              @update:model-value="
                (value) => updateTriggerDeviceConfig(index, value)
              "
              @trigger-type-change="(type) => updateTriggerType(index, type)"
            />

            <!-- 定时触发配置 -->
            <div
              v-else-if="
                triggerItem.type ===
                IotRuleSceneTriggerTypeEnum.TIMER || triggerItem.type === String(IotRuleSceneTriggerTypeEnum.TIMER)
              "
              class="flex flex-col gap-4"
            >
              <div
                class="flex items-center gap-2 rounded-md border border-primary bg-background px-4 py-3"
              >
                <IconifyIcon
                  icon="lucide:timer"
                  class="text-18px text-danger"
                />
                <span class="text-14px font-500 text-primary">
                  定时触发配置
                </span>
              </div>

              <!-- CRON 表达式配置 -->
              <div
                class="rounded-md border border-primary bg-background p-4"
              >
                <Form.Item label="CRON表达式" required>
                  <CronTab
                    :model-value="triggerItem.cronExpression || '0 0 12 * * ?'"
                    @update:model-value="
                      (value) => updateTriggerCronConfig(index, value)
                    "
                  />
                </Form.Item>
              </div>

              <!-- 附加条件组配置 -->
              <TimerConditionGroupConfig
                :model-value="triggerItem.conditionGroups as any"
                @update:model-value="
                  (value) => updateTriggerConditionGroups(index, value)
                "
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="py-40px text-center">
        <Empty description="暂无触发器">
          <template #description>
            <div class="space-y-8px">
              <p class="text-secondary">暂无触发器配置</p>
              <p class="text-12px text-primary">
                请使用上方的"添加触发器"按钮来设置触发规则
              </p>
            </div>
          </template>
        </Empty>
      </div>
    </div>
  </Card>
</template>
