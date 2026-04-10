<script setup lang="ts">
import { nextTick, reactive, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Button, Form, Input, Select, Space, message } from 'ant-design-vue';

import { reverseGeocodeByLocation, searchLocationByKeyword } from './tianditu-service';
import { loadTianDiTuMapSdk } from './utils';

const emit = defineEmits<{
  confirm: [
    data: {
      address: string;
      latitude: string;
      longitude: string;
    },
  ];
}>();

const mapContainerRef = ref<HTMLElement>();
const state = reactive({
  lonLat: '', // 经纬度字符串，格式为 "经度,纬度"
  address: '', // 地址信息
  loading: false, // 地址搜索加载状态
  latitude: '', // 纬度
  longitude: '', // 经度
  map: null as any, // 百度地图实例
  mapAddressOptions: [] as any[], // 地址搜索选项
  mapMarker: null as any, // 地图标记点
  mapContainerReady: false, // 地图容器是否准备好
});

const initLongitude = ref<number | undefined>();
const initLatitude = ref<number | undefined>();
const tdtTk = ref('');
const currentMapBound = ref('-180,-90,180,90');
const currentMapLevel = ref(12);

function createPoint(longitude: number | string, latitude: number | string) {
  return new window.T.LngLat(Number(longitude), Number(latitude));
}

function addOverlayToMap(overlay: any) {
  if (state.map?.addOverLay) {
    state.map.addOverLay(overlay);
    return;
  }
  if (state.map?.addOverlay) {
    state.map.addOverlay(overlay);
  }
}

function removeOverlayFromMap(overlay: any) {
  if (!overlay) {
    return;
  }
  if (state.map?.removeOverLay) {
    state.map.removeOverLay(overlay);
    return;
  }
  if (state.map?.removeOverlay) {
    state.map.removeOverlay(overlay);
  }
}

// 从当前地图视野提取 search2 所需参数：mapBound + level。
function updateSearchContextFromMap() {
  const map = state.map;
  if (!map) {
    currentMapBound.value = '-180,-90,180,90';
    currentMapLevel.value = 12;
    return;
  }

  const zoom = Number(map.getZoom?.() ?? 12);
  currentMapLevel.value = Number.isFinite(zoom) ? zoom : 12;

  const bounds = map.getBounds?.();
  const southWest = bounds?.getSouthWest?.();
  const northEast = bounds?.getNorthEast?.();
  if (southWest && northEast) {
    currentMapBound.value = `${southWest.lng},${southWest.lat},${northEast.lng},${northEast.lat}`;
  }
}

async function handleDialogOpened() {
  state.mapContainerReady = true;
  await nextTick();
  await loadTianDiTuMapSdk();
  tdtTk.value = import.meta.env.VITE_TIANDITU_TK || '';
  initMapInstance();
}

/** 弹窗关闭后清理地图 */
function handleDialogClosed() {
  if (state.map?.clearOverLays) {
    state.map.clearOverLays();
  }
  state.map = null;
  state.mapMarker = null;
  state.mapContainerReady = false;
}

/** 初始化地图实例 */
function initMapInstance() {
  if (!mapContainerRef.value || !window.T) {
    return;
  }

  initMap();

  state.map.addEventListener('click', async (event: any) => {
    const point = event.lnglat || event.latlng;
    if (!point) {
      return;
    }
    const lng = point.lng;
    const lat = point.lat;
    state.lonLat = `${lng},${lat}`;
    await regeoCode(state.lonLat);
  });

  state.map.addEventListener('moveend', () => {
    updateSearchContextFromMap();
  });
  state.map.addEventListener('zoomend', () => {
    updateSearchContextFromMap();
  });

  if (initLongitude.value != null && initLatitude.value != null) {
    void regeoCode(`${initLongitude.value},${initLatitude.value}`);
  }

  updateSearchContextFromMap();
}

/** 初始化地图 */
function initMap() {
  state.map = new window.T.Map(mapContainerRef.value);
  const defaultPoint = createPoint(116.404, 39.915);
  state.map.centerAndZoom(defaultPoint, 11);
  state.map.enableScrollWheelZoom?.();
}

// 关键词检索：按文档要求携带 mapBound/level，保证 search2 不返回 400。
async function autoSearch(queryValue: string) {
  if (!queryValue) {
    state.mapAddressOptions = [];
    return;
  }
  if (!tdtTk.value) {
    message.warning('请先配置天地图 TK');
    return;
  }

  updateSearchContextFromMap();

  state.loading = true;
  try {
    state.mapAddressOptions = await searchLocationByKeyword(queryValue, tdtTk.value, {
      mapBound: currentMapBound.value,
      level: currentMapLevel.value,
    });
    if (!state.mapAddressOptions.length) {
      message.warning('未搜索到匹配地址，请尝试更具体的关键字');
    }
  } catch {
    message.error('地址搜索失败，请稍后重试');
  } finally {
    state.loading = false;
  }
}

/** 处理地址选择 */
function handleAddressSelect(value: string) {
  if (value) {
    void regeoCode(value);
  }
}

/** 添加标记点 */
function setMarker(lnglat: string[]) {
  if (!lnglat || lnglat.length !== 2) {
    return;
  }

  if (state.mapMarker !== null) {
    removeOverlayFromMap(state.mapMarker);
  }

  const point = createPoint(lnglat[0]!, lnglat[1]!);
  state.mapMarker = new window.T.Marker(point);
  addOverlayToMap(state.mapMarker);
  state.map.centerAndZoom(point, 16);
}

// 统一处理点击地图和选中搜索结果后的坐标回填与逆地理编码。
async function regeoCode(lonLat: string) {
  if (!lonLat) {
    return;
  }
  const lnglat = lonLat.split(',');
  if (lnglat.length !== 2) {
    return;
  }

  const longitude = Number(lnglat[0]);
  const latitude = Number(lnglat[1]);
  if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
    return;
  }

  state.longitude = String(longitude);
  state.latitude = String(latitude);

  setMarker([state.longitude, state.latitude]);

  if (!tdtTk.value) {
    state.address = '';
    return;
  }

  try {
    state.address = await reverseGeocodeByLocation(longitude, latitude, tdtTk.value);
  } catch {
    state.address = '';
  }
}

/** 确认选择 */
function handleConfirm() {
  if (state.longitude && state.latitude) {
    emit('confirm', {
      longitude: state.longitude,
      latitude: state.latitude,
      address: state.address,
    });
  }
  modalApi.close();
}

const [Modal, modalApi] = useVbenModal({
  onOpenChange(isOpen: boolean) {
    if (isOpen) {
      void handleDialogOpened();
    } else {
      handleDialogClosed();
    }
  },
});

/** 打开弹窗 */
function open(longitude?: number, latitude?: number) {
  initLongitude.value = longitude;
  initLatitude.value = latitude;
  state.longitude = longitude ? String(longitude) : '';
  state.latitude = latitude ? String(latitude) : '';
  state.address = '';
  state.mapAddressOptions = [];
  modalApi.open();
}

defineExpose({ open });
</script>

<template>
  <Modal :footer="false" class="w-[700px]" title="天地图">
    <div class="w-full">
      <!-- 第一行：位置搜索 -->
      <Form :label-col="{ span: 4 }">
        <Form.Item label="定位位置">
          <Select
            v-model:value="state.address"
            :filter-option="false"
            :loading="state.loading"
            :options="
              state.mapAddressOptions.map((item) => ({
                label: item.name,
                value: item.value,
              }))
            "
            allow-clear
            class="w-full"
            placeholder="可输入地址查询经纬度"
            show-search
            @search="autoSearch"
            @select="handleAddressSelect"
          />
        </Form.Item>
        <!-- 第二行：坐标显示 -->
        <Form.Item label="当前坐标">
          <Space>
            <Input
              :value="state.longitude"
              addon-before="经度"
              disabled
              style="width: 180px"
            />
            <Input
              :value="state.latitude"
              addon-before="纬度"
              disabled
              style="width: 180px"
            />
          </Space>
        </Form.Item>
      </Form>
      <!-- 第三行：地图 -->
      <div
        v-if="state.mapContainerReady"
        ref="mapContainerRef"
        class="mt-[10px] h-[400px] w-full"
      ></div>
      <div
        v-else
        class="mt-[10px] flex h-[400px] w-full items-center justify-center"
      >
        <span class="text-gray-400">地图加载中...</span>
      </div>
    </div>
    <div class="mt-4 flex justify-end gap-2">
      <Button type="primary" @click="handleConfirm">确 定</Button>
      <Button @click="modalApi.close()">取 消</Button>
    </div>
  </Modal>
</template>
