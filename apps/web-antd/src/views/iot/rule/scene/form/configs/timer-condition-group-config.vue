<!-- 定时触发器条件组配置组件 -->
<script setup lang="ts">
import type { TriggerCondition } from '#/api/iot/rule/scene';

import { nextTick } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import { Button, Tag } from 'ant-design-vue';

import { IotRuleSceneTriggerTypeEnum } from '#/views/iot/utils/constants';

import SubConditionGroupConfig from './sub-condition-group-config.vue';

/** 定时触发器条件组配置组件 */
defineOptions({ name: 'TimerConditionGroupConfig' });

const props = defineProps<{
  modelValue?: TriggerCondition[][];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: TriggerCondition[][]): void;
}>();

const conditionGroups = useVModel(props, 'modelValue', emit);

const maxGroups = 3; // 最多 3 个条件组
const maxConditionsPerGroup = 3; // 每组最多 3 个条件

/** 添加条件组 */
async function addConditionGroup() {
  if (!conditionGroups.value) {
    conditionGroups.value = [];
  }
  // 检查是否达到最大条件组数量限制
  if (conditionGroups.value.length >= maxGroups) {
    return;
  }
  // 使用 nextTick 确保响应式更新完成后再添加新的条件组
  await nextTick();
  if (conditionGroups.value) {
    conditionGroups.value.push([]);
  }
}

/** 移除条件组 */
function removeConditionGroup(index: number) {
  if (conditionGroups.value) {
    conditionGroups.value.splice(index, 1);
  }
}

/** 更新条件组 */
function updateConditionGroup(index: number, group: TriggerCondition[]) {
  if (conditionGroups.value) {
    conditionGroups.value[index] = group;
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 条件组容器头部 -->
    <div
      class="flex items-center justify-between rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-cyan-50 p-4"
    >
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2 text-base font-bold text-blue-700">
          <div
            class="flex size-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white"
          >
            组
          </div>
          <span>附加条件组</span>
        </div>
        <Tag color="cyan">定时触发时需满足以下条件</Tag>
        <Tag color="orange">
          {{ conditionGroups?.length || 0 }} 个子条件组
        </Tag>
      </div>
      <Button
        type="primary"
        size="small"
        @click="addConditionGroup"
        :disabled="(conditionGroups?.length || 0) >= maxGroups"
      >
        <IconifyIcon icon="lucide:plus" />
        添加条件组
      </Button>
    </div>

    <!-- 条件组列表 -->
    <div
      v-if="conditionGroups && conditionGroups.length > 0"
      class="space-y-4"
    >
      <div
        v-for="(group, groupIndex) in conditionGroups"
        :key="`group-${groupIndex}`"
        class="relative"
      >
        <!-- 条件组容器 -->
        <div
          class="rounded-lg border-2 border-orange-200 bg-orange-50 shadow-sm transition-shadow hover:shadow-md"
        >
          <div
            class="flex items-center justify-between rounded-t-md border-b border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 p-4"
          >
            <div class="flex items-center gap-3">
              <div
                class="flex items-center gap-2 text-base font-bold text-orange-700"
              >
                <div
                  class="flex size-6 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white"
                >
                  {{ groupIndex + 1 }}
                </div>
                <span>子条件组 {{ groupIndex + 1 }}</span>
              </div>
              <Tag color="orange" class="font-medium">组内条件为"且"关系</Tag>
              <Tag color="cyan">{{ group?.length || 0 }}个条件</Tag>
            </div>
            <Button
              danger
              size="small"
              type="text"
              @click="removeConditionGroup(groupIndex)"
              class="hover:bg-red-50"
            >
              <IconifyIcon icon="lucide:trash-2" />
              删除组
            </Button>
          </div>

          <SubConditionGroupConfig
            :model-value="group"
            @update:model-value="
              (value) => updateConditionGroup(groupIndex, value)
            "
            :trigger-type="IotRuleSceneTriggerTypeEnum.TIMER"
            :max-conditions="maxConditionsPerGroup"
          />
        </div>

        <!-- 条件组间的"或"连接符 -->
        <div
          v-if="groupIndex < conditionGroups.length - 1"
          class="flex items-center justify-center py-3"
        >
          <div class="flex items-center gap-2">
            <!-- 连接线 -->
            <div class="h-px w-8 bg-orange-300"></div>
            <!-- 或标签 -->
            <div
              class="rounded-full border-2 border-orange-300 bg-orange-100 px-4 py-1.5"
            >
              <span class="text-sm font-bold text-orange-600">或</span>
            </div>
            <!-- 连接线 -->
            <div class="h-px w-8 bg-orange-300"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else
      class="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-6 text-center"
    >
      <div class="flex flex-col items-center gap-3">
        <IconifyIcon icon="lucide:plus" class="text-[32px] text-blue-400" />
        <div class="text-blue-600">
          <p class="mb-1 text-sm font-medium">暂无附加条件</p>
          <p class="text-xs">定时触发时将直接执行动作</p>
        </div>
      </div>
    </div>
  </div>
</template>
