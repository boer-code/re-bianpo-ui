<!-- 设备触发配置组件 -->
<script setup lang="ts">
import type { RuleSceneApi } from '#/api/iot/rule/scene';

import { nextTick } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import { Button, Tag } from 'ant-design-vue';

import MainConditionInnerConfig from './main-condition-inner-config.vue';
import SubConditionGroupConfig from './sub-condition-group-config.vue';

/** 设备触发配置组件 */
defineOptions({ name: 'DeviceTriggerConfig' });

const props = defineProps<{
  index: number;
  modelValue: RuleSceneApi.Trigger;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: RuleSceneApi.Trigger): void;
  (e: 'triggerTypeChange', type: number): void;
}>();

const trigger = useVModel(props, 'modelValue', emit);

const maxSubGroups = 3; // 最多 3 个子条件组
const maxConditionsPerGroup = 3; // 每组最多 3 个条件

/**
 * 更新条件
 * @param condition 条件对象
 */
function updateCondition(condition: RuleSceneApi.Trigger) {
  trigger.value = condition;
}

/**
 * 处理触发器类型变化事件
 * @param type 触发器类型
 */
function handleTriggerTypeChange(type: number) {
  trigger.value.type = type;
  emit('triggerTypeChange', type);
}

/** 添加子条件组 */
async function addSubGroup() {
  if (!trigger.value.conditionGroups) {
    trigger.value.conditionGroups = [];
  }

  // 检查是否达到最大子组数量限制
  if (trigger.value.conditionGroups?.length >= maxSubGroups) {
    return;
  }

  // 使用 nextTick 确保响应式更新完成后再添加新的子组
  await nextTick();
  if (trigger.value.conditionGroups) {
    trigger.value.conditionGroups.push([] as any);
  }
}

/**
 * 移除子条件组
 * @param index 子条件组索引
 */
function removeSubGroup(index: number) {
  if (trigger.value.conditionGroups) {
    trigger.value.conditionGroups.splice(index, 1);
  }
}

/**
 * 更新子条件组
 * @param index 子条件组索引
 * @param subGroup 子条件组数据
 */
function updateSubGroup(index: number, subGroup: any) {
  if (trigger.value.conditionGroups) {
    trigger.value.conditionGroups[index] = subGroup;
  }
}

/** 移除整个条件组 */
function removeConditionGroup() {
  trigger.value.conditionGroups = undefined;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- 主条件配置 - 默认直接展示 -->
    <div class="flex flex-col gap-4">
      <!-- 主条件配置 -->
      <div class="space-y-4">
        <!-- 主条件头部 -->
        <div
          class="flex items-center justify-between rounded-lg border border-border bg-primary/5 p-4"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex items-center gap-2 text-base font-semibold text-primary"
            >
              <div
                class="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
              >
                主
              </div>
              <span>主条件</span>
            </div>
            <Tag color="success">必须满足</Tag>
          </div>
        </div>

        <!-- 主条件内容配置 -->
        <MainConditionInnerConfig
          :model-value="trigger"
          @update:model-value="updateCondition"
          :trigger-type="trigger.type as any"
          @trigger-type-change="handleTriggerTypeChange"
        />
      </div>
    </div>

    <!-- 条件组配置 -->
    <div class="flex flex-col gap-4">
      <!-- 条件组容器头部 -->
      <div
        class="flex items-center justify-between rounded-lg border border-border bg-primary/5 p-4"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex items-center gap-2 text-base font-semibold text-primary"
          >
            <div
              class="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white"
            >
              组
            </div>
            <span>附加条件组</span>
          </div>
          <Tag color="success">与"主条件"为且关系</Tag>
          <Tag size="small" type="info" class="ml-2">
            {{ trigger.conditionGroups?.length || 0 }} 个子条件组
          </Tag>
        </div>
        <div class="gap-8px flex items-center">
          <Button
            type="primary"
            size="small"
            @click="addSubGroup"
            :disabled="(trigger.conditionGroups?.length || 0) >= maxSubGroups"
          >
            <IconifyIcon icon="lucide:plus" />
            添加子条件组
          </Button>
          <Button danger size="small" type="text" @click="removeConditionGroup">
            <IconifyIcon icon="lucide:trash-2" />
            删除条件组
          </Button>
        </div>
      </div>

      <!-- 子条件组列表 -->
      <div
        v-if="trigger.conditionGroups && trigger.conditionGroups.length > 0"
        class="space-y-4"
      >
        <!-- 逻辑关系说明 -->
        <div class="relative">
          <div
            v-for="(subGroup, subGroupIndex) in trigger.conditionGroups"
            :key="`sub-group-${subGroupIndex}`"
            class="relative"
          >
            <!-- 子条件组容器 -->
            <div
              class="rounded-lg border border-border bg-background shadow-sm transition-shadow hover:shadow-md"
            >
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
                      {{ subGroupIndex + 1 }}
                    </div>
                    <span>子条件组 {{ subGroupIndex + 1 }}</span>
                  </div>
                  <Tag size="small" type="warning" class="font-500">
                    组内条件为"且"关系
                  </Tag>
                  <Tag size="small" type="info">
                    {{ (subGroup as any)?.length || 0 }}个条件
                  </Tag>
                </div>
                <Button
                  danger
                  size="small"
                  type="text"
                  @click="removeSubGroup(subGroupIndex)"
                >
                  <IconifyIcon icon="lucide:trash-2" />
                  删除组
                </Button>
              </div>

              <SubConditionGroupConfig
                :model-value="subGroup as any"
                @update:model-value="
                  (value) => updateSubGroup(subGroupIndex, value)
                "
                :trigger-type="trigger.type as any"
                :max-conditions="maxConditionsPerGroup"
              />
            </div>

            <!-- 子条件组间的'或'连接符 -->
            <div
              v-if="subGroupIndex < trigger.conditionGroups!.length - 1"
              class="flex items-center justify-center py-3"
            >
              <div class="flex items-center gap-2">
                <!-- 连接线 -->
                <div class="h-[1px] w-8 bg-border"></div>
                <!-- 或标签 -->
                <div
                  class="rounded-full border border-border bg-muted px-4 py-1.5"
                >
                  <span class="text-sm font-semibold text-muted-foreground"
                    >或</span
                  >
                </div>
                <!-- 连接线 -->
                <div class="h-[1px] w-8 bg-border"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-else
        class="rounded-lg border border-dashed border-border bg-background p-6 text-center"
      >
        <div class="flex flex-col items-center gap-3">
          <IconifyIcon
            icon="lucide:plus"
            class="text-[32px] text-muted-foreground"
          />
          <div class="text-muted-foreground">
            <p class="mb-1 text-sm font-medium">暂无子条件组</p>
            <p class="text-xs">点击上方"添加子条件组"按钮开始配置</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
