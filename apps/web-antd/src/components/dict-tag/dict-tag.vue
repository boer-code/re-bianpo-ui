<script setup lang="ts">
import { computed } from 'vue';

import { DICT_TYPE } from '@vben/constants';
import { getDictObj } from '@vben/hooks';
import { isValidColor, TinyColor } from '@vben/utils';

import { Tag } from 'ant-design-vue';

interface DictTagProps {
  type: string; // 字典类型
  value: any; // 字典值
  icon?: string; // 图标
}

const props = defineProps<DictTagProps>();

/** 获取字典标签 */
const dictTag = computed(() => {
  // 校验参数有效性
  if (!props.type || props.value === undefined || props.value === null) {
    return null;
  }

  // 获取字典对象
  const dict = getDictObj(props.type, String(props.value));
  if (!dict) {
    return null;
  }

  // 处理颜色类型
  let colorType = dict.colorType;
  switch (colorType) {
    case 'danger': {
      colorType = 'error';
      break;
    }
    case 'info': {
      colorType = 'default';
      break;
    }
    case 'primary': {
      colorType = 'processing';
      break;
    }
    default: {
      if (!colorType) {
        colorType = 'default';
      }
    }
  }

  if (isValidColor(dict.cssClass)) {
    colorType = new TinyColor(dict.cssClass).toHexString();
  }

  return {
    label: dict.label || '',
    colorType,
    cssClass: dict.cssClass,
  };
});

/** 最终传给 Tag 的 color（Ant Design Vue 4 用 CSS-in-JS 着色，需走 color 属性才稳定生效） */
const tagDisplayColor = computed(() => {
  if (props.type === DICT_TYPE.IOT_DEVICE_STATE) {
    const n = Number(props.value);
    if (n === 1) return 'success';
    if (n === 2) return 'error';
  }
  const d = dictTag.value;
  if (!d) {
    return undefined;
  }
  return d.colorType ? d.colorType : d.cssClass;
});
</script>

<template>
  <Tag v-if="dictTag" :color="tagDisplayColor">
    {{ dictTag.label }}
  </Tag>
</template>
