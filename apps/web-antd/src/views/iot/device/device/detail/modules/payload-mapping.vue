<script setup lang="ts">
import type { IotDevicePayloadMappingApi } from '#/api/iot/device/payload-mapping';
import type { ThingModelData } from '#/api/iot/thingmodel';

import { computed, onMounted, ref, watch } from 'vue';

import { message, Space } from 'ant-design-vue';

import {
  createPayloadMapping,
  deletePayloadMapping,
  getPayloadMappingListByDevice,
  updatePayloadMapping,
} from '#/api/iot/device/payload-mapping';

const props = defineProps<{
  deviceId: number;
  thingModelList: ThingModelData[];
}>();

const loading = ref(false);
const mappings = ref<IotDevicePayloadMappingApi.Mapping[]>([]);
const saving = ref(false);

const form = ref<IotDevicePayloadMappingApi.Mapping>({
  deviceId: 0,
  channelKey: '',
  thingModelIdentifier: '',
  formula: '',
  zeroOffset: undefined,
  direction: 2,
  enabled: true,
});

const canSave = computed(() => {
  return !!(
    props.deviceId &&
    form.value.channelKey &&
    form.value.thingModelIdentifier
  );
});

const mappingCount = computed(() => mappings.value.length);

defineExpose({
  mappingCount,
  reload: () => loadMappings(props.deviceId),
});

async function loadMappings(deviceId: number) {
  if (!deviceId) {
    mappings.value = [];
    return;
  }
  loading.value = true;
  try {
    mappings.value = await getPayloadMappingListByDevice(deviceId);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    deviceId: props.deviceId || 0,
    channelKey: '',
    thingModelIdentifier: '',
    formula: '',
    zeroOffset: undefined,
    direction: 2,
    enabled: true,
  };
}

async function save() {
  if (!canSave.value) {
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form.value, deviceId: props.deviceId };
    if (payload.id) {
      await updatePayloadMapping(payload);
      message.success('映射已更新');
    } else {
      await createPayloadMapping(payload);
      message.success('映射已新增');
    }
    await loadMappings(props.deviceId);
    resetForm();
  } finally {
    saving.value = false;
  }
}

function edit(item: IotDevicePayloadMappingApi.Mapping) {
  form.value = { ...item };
}

async function remove(id?: number) {
  if (!id) {
    return;
  }
  await deletePayloadMapping(id);
  message.success('映射已删除');
  await loadMappings(props.deviceId);
}

watch(
  () => props.deviceId,
  async (deviceId) => {
    resetForm();
    await loadMappings(deviceId);
  },
  { immediate: true },
);

onMounted(() => {
  resetForm();
});
</script>

<template>
  <a-card :loading="loading" title="映射配置">
    <a-form layout="inline" class="payload-mapping-form mb-3">
      <a-form-item label="通道键">
        <a-input v-model:value="form.channelKey" placeholder="U3D1" />
      </a-form-item>
      <a-form-item label="物模型">
        <a-select
          v-model:value="form.thingModelIdentifier"
          style="width: 220px"
          show-search
        >
          <a-select-option
            v-for="tm in thingModelList"
            :key="tm.identifier"
            :value="tm.identifier"
          >
            {{ tm.name }} ({{ tm.identifier }})
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="公式">
        <a-input v-model:value="form.formula" placeholder="x*0.1-50" />
      </a-form-item>
      <a-form-item label="归零偏移">
        <a-input-number v-model:value="form.zeroOffset" />
      </a-form-item>
      <a-form-item label="方向">
        <a-select v-model:value="form.direction" style="width: 100px">
          <a-select-option :value="0">上行</a-select-option>
          <a-select-option :value="1">下行</a-select-option>
          <a-select-option :value="2">双向</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-checkbox v-model:checked="form.enabled">启用</a-checkbox>
      </a-form-item>
      <a-form-item>
        <a-button
          type="primary"
          :disabled="!canSave"
          :loading="saving"
          @click="save"
        >
          保存映射
        </a-button>
      </a-form-item>
    </a-form>

    <a-table
      row-key="id"
      size="small"
      :data-source="mappings"
      :pagination="false"
    >
      <a-table-column title="通道键" data-index="channelKey" />
      <a-table-column title="物模型" data-index="thingModelIdentifier" />
      <a-table-column title="公式" data-index="formula" />
      <a-table-column title="偏移" data-index="zeroOffset" />
      <a-table-column title="方向" data-index="direction" />
      <a-table-column title="启用" data-index="enabled">
        <template #default="{ text }">
          {{ text ? '是' : '否' }}
        </template>
      </a-table-column>
      <a-table-column title="操作" width="140">
        <template #default="{ record }">
          <Space>
            <a @click="edit(record)">编辑</a>
            <a class="text-red-500" @click="remove(record.id)">删除</a>
          </Space>
        </template>
      </a-table-column>
    </a-table>
  </a-card>
</template>

<style scoped lang="scss">
.payload-mapping-form {
  row-gap: 8px;
}
</style>
