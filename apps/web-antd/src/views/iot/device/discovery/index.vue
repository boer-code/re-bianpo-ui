<script setup lang="ts">
import type { IotDeviceApi } from '#/api/iot/device/device';
import type { ThingModelData } from '#/api/iot/thingmodel';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { List, message } from 'ant-design-vue';

import { getDevicePage, updateDevice } from '#/api/iot/device/device';
import { getThingModelListByProductId } from '#/api/iot/thingmodel';

import DevicePayloadMapping from '../device/detail/modules/payload-mapping.vue';

defineOptions({ name: 'IoTDeviceDiscovery' });

const deviceLoading = ref(false);
const devices = ref<IotDeviceApi.Device[]>([]);
const selectedDevice = ref<IotDeviceApi.Device>();
const thingModels = ref<ThingModelData[]>([]);
const payloadMappingRef = ref<InstanceType<typeof DevicePayloadMapping>>();

const mappingCount = computed(() => payloadMappingRef.value?.mappingCount || 0);

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
    } as any);
    devices.value = (page.list || []).filter((item) => {
      const config = parseConfig(item.config);
      const rawLike =
        config?.rawAutoRegistered === true ||
        (item.deviceName || '').startsWith('raw_');
      const uninitialized = config?.initialized !== true;
      return rawLike && uninitialized;
    });
    if (
      selectedDevice.value &&
      !devices.value.some((item) => item.id === selectedDevice.value?.id)
    ) {
      selectedDevice.value = undefined;
      thingModels.value = [];
    }
    if (!selectedDevice.value && devices.value.length > 0) {
      const first = devices.value[0];
      if (first) {
        await selectDevice(first);
      }
    }
  } finally {
    deviceLoading.value = false;
  }
}

async function selectDevice(device: IotDeviceApi.Device) {
  selectedDevice.value = device;
  await loadThingModels(device.productId);
}

async function loadThingModels(productId: number) {
  thingModels.value = await getThingModelListByProductId(productId);
}

async function finishInit() {
  if (!selectedDevice.value) {
    return;
  }
  if (mappingCount.value === 0) {
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
          <List :data-source="devices" bordered>
            <template #renderItem="{ item }">
              <List.Item
                class="discovery-device-item cursor-pointer"
                :class="{
                  'discovery-device-item--selected':
                    selectedDevice?.id === item.id,
                }"
                @click="selectDevice(item)"
              >
                <div>
                  <div>{{ item.deviceName }}</div>
                  <div class="discovery-device-meta text-xs">
                    {{ item.nickname || '-' }}
                  </div>
                </div>
              </List.Item>
            </template>
          </List>
        </a-card>
      </a-col>
      <a-col :span="17">
        <a-card :title="selectedDevice?.deviceName || '请选择设备'">
          <template #extra>
            <a-button
              type="primary"
              :disabled="!selectedDevice"
              @click="finishInit"
            >
              完成初始化
            </a-button>
          </template>
          <DevicePayloadMapping
            v-if="selectedDevice?.id"
            ref="payloadMappingRef"
            :device-id="selectedDevice.id"
            :thing-model-list="thingModels"
          />
        </a-card>
      </a-col>
    </a-row>
  </Page>
</template>

<style scoped lang="scss">
.discovery-device-item {
  transition: background-color 0.2s ease;
}

.discovery-device-item:hover {
  background-color: rgb(0 0 0 / 2%);
}

.discovery-device-item--selected {
  background-color: #f0f7ff;
}

.discovery-device-meta {
  color: rgb(0 0 0 / 45%);
}

html.dark {
  .discovery-device-item:hover {
    background-color: rgb(255 255 255 / 8%);
  }

  .discovery-device-item--selected {
    background-color: rgb(24 144 255 / 22%);
  }

  .discovery-device-meta {
    color: rgb(255 255 255 / 55%);
  }
}
</style>
