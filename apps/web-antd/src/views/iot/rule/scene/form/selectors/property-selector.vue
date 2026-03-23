<!-- 属性选择器组件 -->
<script setup lang="ts">
import type {
  IotThingModelTSLResp,
  ThingModelEvent,
  ThingModelProperty,
  ThingModelService,
} from '#/api/iot/thingmodel';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { useVModel } from '@vueuse/core';
import { Button, Popover, Select, Tag } from 'ant-design-vue';

import { getThingModelTSL } from '#/api/iot/thingmodel';
import {
  getAccessModeLabel,
  getDataTypeName,
  getDataTypeTagType,
  getEventTypeLabel,
  getThingModelServiceCallTypeLabel,
  IotRuleSceneTriggerTypeEnum,
  IoTThingModelTypeEnum,
  THING_MODEL_GROUP_LABELS,
} from '#/views/iot/utils/constants';

/** 属性选择器组件 */
defineOptions({ name: 'PropertySelector' });

const props = defineProps<{
  deviceId?: number;
  modelValue?: string;
  productId?: number;
  triggerType: number;
  isCondition?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value?: string): void;
  (e: 'change', value?: { config: any; type: string }): void;
}>();

/** 属性选择器内部使用的统一数据结构 */
export interface PropertySelectorItem {
  identifier: string;
  name: string;
  description?: string;
  dataType: string;
  type: number; // IoTThingModelTypeEnum
  accessMode?: string;
  required?: boolean;
  unit?: string;
  range?: string;
  eventType?: string;
  callType?: string;
  inputParams?: any[];
  outputParams?: any[];
  property?: ThingModelProperty;
  event?: ThingModelEvent;
  service?: ThingModelService;
}

const loading = ref(false); // 加载状态
const propertyList = ref<PropertySelectorItem[]>([]); // 属性列表
const thingModelTSL = ref<null | IotThingModelTSLResp>(null); // 物模型TSL数据

// 计算属性：属性分组
const propertyGroups = computed(() => {
  const groups: { label: string; options: any[] }[] = [];
  
  if (!propertyList.value || propertyList.value.length === 0) {
    return groups;
  }

  if (
    props.isCondition ||
    props.triggerType === IotRuleSceneTriggerTypeEnum.DEVICE_PROPERTY_POST ||
    props.triggerType === IotRuleSceneTriggerTypeEnum.TIMER
  ) {
    const propsList = propertyList.value.filter(
      (p) => p.type === IoTThingModelTypeEnum.PROPERTY,
    );
    if (propsList.length > 0) {
      groups.push({
        label: THING_MODEL_GROUP_LABELS.PROPERTY,
        options: propsList,
      });
    }
  }

  if (props.triggerType === IotRuleSceneTriggerTypeEnum.DEVICE_EVENT_POST) {
    const eventList = propertyList.value.filter(
      (p) => p.type === IoTThingModelTypeEnum.EVENT,
    );
    if (eventList.length > 0) {
      groups.push({
        label: THING_MODEL_GROUP_LABELS.EVENT,
        options: eventList,
      });
    }
  }

  if (props.triggerType === IotRuleSceneTriggerTypeEnum.DEVICE_SERVICE_INVOKE) {
    const serviceList = propertyList.value.filter(
      (p) => p.type === IoTThingModelTypeEnum.SERVICE,
    );
    if (serviceList.length > 0) {
      groups.push({
        label: THING_MODEL_GROUP_LABELS.SERVICE,
        options: serviceList,
      });
    }
  }

  return groups;
});

// 计算属性：当前选中的属性
const selectedProperty = computed(() => {
  return propertyList.value.find((p) => p.identifier === props.modelValue);
});

/**
 * 处理选择变化事件
 * @param value 选中的属性标识符
 */
function handleChange(value: any) {
  emit('update:modelValue', value);
  const property = propertyList.value.find((p) => p.identifier === value);
  if (property) {
    emit('change', {
      type: property.dataType,
      config: property,
    });
  } else {
    emit('change', undefined);
  }
}

/**
 * 获取物模型TSL数据
 */
async function fetchThingModelTSL() {
  if (!props.productId) {
    thingModelTSL.value = null;
    propertyList.value = [];
    return;
  }

  loading.value = true;
  try {
    const tslData = await getThingModelTSL(props.productId);

    if (tslData) {
      if (typeof tslData === 'string') {
        try {
          thingModelTSL.value = JSON.parse(tslData);
        } catch (e) {
          console.error('解析物模型TSL数据失败:', e);
          thingModelTSL.value = null;
        }
      } else {
        thingModelTSL.value = tslData;
      }
      parseThingModelData();
    } else {
      console.error('获取物模型TSL失败: 返回数据为空');
      propertyList.value = [];
    }
  } catch (error) {
    console.error('获取物模型TSL失败:', error);
    propertyList.value = [];
  } finally {
    loading.value = false;
  }
}

/** 解析物模型 TSL 数据 */
function parseThingModelData() {
  const tsl = thingModelTSL.value;
  const properties: PropertySelectorItem[] = [];

  if (!tsl) {
    propertyList.value = properties;
    return;
  }
  // 解析属性
  if (tsl.properties && Array.isArray(tsl.properties)) {
    tsl.properties.forEach((prop) => {
      properties.push({
        identifier: prop.identifier || '',
        name: prop.name || '',
        description: prop.desc,
        dataType: prop.dataType || 'UNKNOWN',
        type: IoTThingModelTypeEnum.PROPERTY,
        accessMode: prop.accessMode,
        unit: getPropertyUnit(prop),
        range: getPropertyRange(prop),
        property: prop,
      });
    });
  }

  // 解析事件
  if (tsl.events && Array.isArray(tsl.events)) {
    tsl.events.forEach((event) => {
      properties.push({
        identifier: event.identifier || '',
        name: event.name || '',
        description: event.desc,
        dataType: 'struct',
        type: IoTThingModelTypeEnum.EVENT,
        eventType: event.type,
        outputParams: event.outputParams,
        event,
      });
    });
  }

  // 解析服务
  if (tsl.services && Array.isArray(tsl.services)) {
    tsl.services.forEach((service) => {
      properties.push({
        identifier: service.identifier || '',
        name: service.name || '',
        description: service.desc,
        dataType: 'struct',
        type: IoTThingModelTypeEnum.SERVICE,
        callType: service.callType,
        inputParams: service.inputParams,
        outputParams: service.outputParams,
        service,
      });
    });
  }
  propertyList.value = properties;
}

/**
 * 获取属性单位
 * @param property 属性对象
 * @returns 属性单位
 */
function getPropertyUnit(property: any) {
  if (!property) return undefined;

  // 数值型数据的单位
  if (property.dataSpecs && property.dataSpecs.unit) {
    return property.dataSpecs.unit;
  }

  return undefined;
}

/**
 * 获取属性范围描述
 * @param property 属性对象
 * @returns 属性范围描述
 */
function getPropertyRange(property: any) {
  if (!property) return undefined;

  // 数值型数据的范围
  if (property.dataSpecs) {
    const specs = property.dataSpecs;
    if (specs.min !== undefined && specs.max !== undefined) {
      return `${specs.min}~${specs.max}`;
    }
  }

  // 枚举型和布尔型数据的选项
  if (property.dataSpecsList && Array.isArray(property.dataSpecsList)) {
    return property.dataSpecsList
      .map((item: any) => `${item.name}(${item.value})`)
      .join(', ');
  }

  return undefined;
}

// 监听产品变化
watch(
  () => props.productId,
  (newProductId) => {
    if (newProductId) {
      fetchThingModelTSL();
    } else {
      propertyList.value = [];
      thingModelTSL.value = null;
      emit('update:modelValue', undefined);
    }
  },
  { immediate: true },
);

/** 监听触发类型变化 */
watch(
  () => props.triggerType,
  () => {
    emit('update:modelValue', undefined);
  },
);
</script>

<template>
  <div class="gap-8px flex min-w-0 w-full max-w-full items-center">
    <Select
      :value="modelValue"
      placeholder="请选择监控项"
      filterable
      clearable
      @change="handleChange"
      class="min-w-[150px] w-full max-w-full"
      :loading="loading"
      option-label-prop="label"
      :disabled="!productId"
    >
      <template #notFoundContent>
        <div class="py-4 text-center text-sm text-muted-foreground">暂无数据</div>
      </template>

      <Select.OptGroup
        v-for="group in propertyGroups"
        :key="group.label"
        :label="group.label"
      >
        <Select.Option
          v-for="property in group.options"
          :key="property.identifier"
          :value="property.identifier"
          :label="property.name"
        >
          <div class="flex w-full items-center justify-between py-1">
            <span class="flex-1 truncate text-sm font-medium">
              {{ property.name }}
            </span>
            <Tag
              :color="getDataTypeTagType(property.dataType)"
              size="small"
              class="ml-2 shrink-0"
            >
              {{ property.identifier }}
            </Tag>
          </div>
        </Select.Option>
      </Select.OptGroup>
    </Select>

    <!-- 属性详情弹出层 -->
    <Popover
      v-if="selectedProperty"
      placement="rightTop"
      :width="350"
      trigger="click"
      :show-arrow="true"
      :offset="8"
      popper-class="property-detail-popover"
    >
      <template #content>
        <div class="property-detail-content">
          <div class="gap-2 mb-3 flex items-center">
            <IconifyIcon icon="ep:info-filled" class="text-16px text-info" />
            <span class="text-14px font-500 text-foreground">
              {{ selectedProperty.name }}
            </span>
            <Tag
              :type="getDataTypeTagType(selectedProperty.dataType)"
              size="small"
            >
              {{ getDataTypeName(selectedProperty.dataType) }}
            </Tag>
          </div>

          <div class="space-y-2 pl-6">
            <div class="gap-2 flex items-start">
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                标识符：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ selectedProperty.identifier }}
              </span>
            </div>

            <div
              v-if="selectedProperty.description"
              class="gap-8px flex items-start"
            >
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                描述：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ selectedProperty.description }}
              </span>
            </div>

            <div v-if="selectedProperty.unit" class="gap-8px flex items-start">
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                单位：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ selectedProperty.unit }}
              </span>
            </div>

            <div v-if="selectedProperty.range" class="gap-8px flex items-start">
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                取值范围：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ selectedProperty.range }}
              </span>
            </div>

            <!-- 根据属性类型显示额外信息 -->
            <div
              v-if="
                selectedProperty.type === IoTThingModelTypeEnum.PROPERTY &&
                selectedProperty.accessMode
              "
              class="gap-8px flex items-start"
            >
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                访问模式：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ getAccessModeLabel(selectedProperty.accessMode) }}
              </span>
            </div>

            <div
              v-if="
                selectedProperty.type === IoTThingModelTypeEnum.EVENT &&
                selectedProperty.eventType
              "
              class="gap-8px flex items-start"
            >
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                事件类型：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ getEventTypeLabel(selectedProperty.eventType) }}
              </span>
            </div>

            <div
              v-if="
                selectedProperty.type === IoTThingModelTypeEnum.SERVICE &&
                selectedProperty.callType
              "
              class="gap-8px flex items-start"
            >
              <span class="text-12px min-w-60px flex-shrink-0 text-muted-foreground">
                调用类型：
              </span>
              <span class="text-12px flex-1 text-foreground font-medium">
                {{ getThingModelServiceCallTypeLabel(selectedProperty.callType) }}
              </span>
            </div>
          </div>
        </div>
      </template>

      <!-- 弹出层触发器 (由组件包裹即可) -->
      <Button
        type="primary"
        text
        circle
        size="small"
        class="flex-shrink-0"
        title="查看属性详情"
      >
        <IconifyIcon icon="ep:info-filled" />
      </Button>
    </Popover>
  </div>
</template>

<style scoped>
/* 弹出层内容样式 */
.property-detail-content {
  padding: 4px 0;
}

/* 弹出层自定义样式 */
:global(.property-detail-popover) {
  /* 可以在这里添加全局弹出层样式 */
  max-width: 400px !important;
}
</style>
