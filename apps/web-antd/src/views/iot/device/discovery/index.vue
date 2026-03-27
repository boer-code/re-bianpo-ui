<script setup lang="ts">
import type { IotDeviceApi } from '#/api/iot/device/device';
import type { IotDevicePayloadMappingApi } from '#/api/iot/device/payload-mapping';
import type { ThingModelData } from '#/api/iot/thingmodel';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { getDevicePage, updateDevice } from '#/api/iot/device/device';
import {
  createPayloadMapping,
  deletePayloadMapping,
  getPayloadMappingListByDevice,
  updatePayloadMapping,
} from '#/api/iot/device/payload-mapping';
import { getThingModelListByProductId } from '#/api/iot/thingmodel';

defineOptions({ name: 'IoTDeviceDiscovery' });

const loading = ref(false);
const deviceLoading = ref(false);
const devices = ref<IotDeviceApi.Device[]>([]);
const selectedDevice = ref<IotDeviceApi.Device>();
const thingModels = ref<ThingModelData[]>([]);
const mappings = ref<IotDevicePayloadMappingApi.Mapping[]>([]);
const saving = ref(false);

const form = ref<IotDevicePayloadMappingApi.Mapping>({
  deviceId: 0,
  channelKey: '',
  thingModelIdentifier: '',
  clBitIndex: undefined,
  formula: '',
  zeroOffset: undefined,
  direction: 2,
  enabled: true,
});

const canSave = computed(() => {
  return !!(
    selectedDevice.value &&
    form.value.channelKey &&
    form.value.thingModelIdentifier
  );
});

function parseConfig(config?: string) {
  try {
    return config ? JSON.parse(config) : {};
  } catch {
    return {};
  }
}

async function loadDevices() {
  deviceLoading.value = true;
  try {
    const page = await getDevicePage({
      pageNo: 1,
      pageSize: 200,
      state: 0,
    } as any);
    devices.value = (page.list || []).filter((item) =>
      (item.deviceName || '').startsWith('raw_'),
    );
    if (!selectedDevice.value && devices.value.length > 0) {
      await selectDevice(devices.value[0]);
    }
  } finally {
    deviceLoading.value = false;
  }
}

async function selectDevice(device: IotDeviceApi.Device) {
  selectedDevice.value = device;
  await Promise.all([
    loadMappings(device.id!),
    loadThingModels(device.productId),
  ]);
  resetForm();
}

async function loadThingModels(productId: number) {
  thingModels.value = await getThingModelListByProductId(productId);
}

async function loadMappings(deviceId: number) {
  loading.value = true;
  try {
    mappings.value = await getPayloadMappingListByDevice(deviceId);
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.value = {
    deviceId: selectedDevice.value?.id || 0,
    channelKey: '',
    thingModelIdentifier: '',
    clBitIndex: undefined,
    formula: '',
    zeroOffset: undefined,
    direction: 2,
    enabled: true,
  };
}

async function save() {
  if (!canSave.value || !selectedDevice.value) {
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form.value, deviceId: selectedDevice.value.id! };
    if (payload.id) {
      await updatePayloadMapping(payload);
      message.success('映射已更新');
    } else {
      await createPayloadMapping(payload);
      message.success('映射已新增');
    }
    await loadMappings(selectedDevice.value.id!);
    resetForm();
  } finally {
    saving.value = false;
  }
}

function edit(item: IotDevicePayloadMappingApi.Mapping) {
  form.value = { ...item };
}

async function remove(id?: number) {
  if (!id || !selectedDevice.value) {
    return;
  }
  await deletePayloadMapping(id);
  message.success('映射已删除');
  await loadMappings(selectedDevice.value.id!);
}

async function finishInit() {
  if (!selectedDevice.value) {
    return;
  }
  if (mappings.value.length === 0) {
    message.warning('请至少配置一条映射');
    return;
  }
  const cfg = parseConfig(selectedDevice.value.config);
  cfg.initialized = true;
  await updateDevice({
    id: selectedDevice.value.id,
    config: JSON.stringify(cfg),
  } as IotDeviceApi.Device);
  message.success('初始化完成');
  await loadDevices();
}

onMounted(loadDevices);
</script>

<template>
  <Page auto-content-height>
    <a-row :gutter="16">
      <a-col :span="7">
        <a-card title="待初始化设备" :loading="deviceLoading">
          <a-list :data-source="devices" bordered>
            <template #renderItem="{ item }">
              <a-list-item
                class="cursor-pointer"
                :class="selectedDevice?.id === item.id ? 'bg-[#f0f7ff]' : ''"
                @click="selectDevice(item)"
              >
                <div>
                  <div>{{ item.deviceName }}</div>
                  <div class="text-xs text-gray-400">{{ item.nickname || '-' }}</div>
                </div>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :span="17">
        <a-card :loading="loading" :title="selectedDevice?.deviceName || '请选择设备'">
          <template #extra>
            <a-button type="primary" :disabled="!selectedDevice" @click="finishInit">
              完成初始化
            </a-button>
          </template>
          <a-form layout="inline" class="mb-3">
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
                  v-for="tm in thingModels"
                  :key="tm.identifier"
                  :value="tm.identifier"
                >
                  {{ tm.name }} ({{ tm.identifier }})
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="CL位">
              <a-input-number v-model:value="form.clBitIndex" :min="1" :max="7" />
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
              <a-button type="primary" :disabled="!canSave" :loading="saving" @click="save">
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
            <a-table-column title="CL位" data-index="clBitIndex" />
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
                <a-space>
                  <a @click="edit(record)">编辑</a>
                  <a class="text-red-500" @click="remove(record.id)">删除</a>
                </a-space>
              </template>
            </a-table-column>
          </a-table>
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>
