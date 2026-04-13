<script lang="ts" setup>
import type { IotDeviceApi } from '#/api/iot/device/device';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useDebounceFn } from '@vueuse/core';
import { Card, Empty, Spin } from 'ant-design-vue';

import { getDeviceLocationList } from '#/api/iot/device/device';
import { loadTianDiTuMapSdk } from '#/components/map';
import { DeviceStateEnum } from '#/views/iot/utils/constants';

defineOptions({ name: 'DeviceMapCard' });

const router = useRouter();
const mapContainerRef = ref<HTMLElement>();
let mapInstance: any = null;
/** 地图视野变化时重绘聚合（与 addEventListener 使用同一引用以便卸载） */
let viewportChangeHandler: (() => void) | null = null;
const loading = ref(true);
const deviceList = ref<IotDeviceApi.Device[]>([]);

/** 是否有数据 */
const hasData = computed(() => deviceList.value.length > 0);

/** 设备状态颜色映射 */
const stateColorMap: Record<number, string> = {
  [DeviceStateEnum.INACTIVE]: '#EAB308', // 待激活 - 黄色
  [DeviceStateEnum.ONLINE]: '#22C55E', // 在线 - 绿色
  [DeviceStateEnum.OFFLINE]: '#9CA3AF', // 离线 - 灰色
};

/** 获取设备状态配置 */
function getStateConfig(state: number): { color: string; name: string } {
  const stateNames: Record<number, string> = {
    [DeviceStateEnum.INACTIVE]: '待激活',
    [DeviceStateEnum.ONLINE]: '在线',
    [DeviceStateEnum.OFFLINE]: '离线',
  };
  return {
    name: stateNames[state] || '未知',
    color: stateColorMap[state] || '#909399',
  };
}

function buildMarkerSvg(color: string, isOnline: boolean) {
  const size = isOnline ? 24 : 20;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" fill="${color}" stroke="white" stroke-width="2"/>
      ${isOnline ? `<circle cx="12" cy="12" r="10" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"/>` : ''}
    </svg>
  `;
  return {
    size,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

/** 聚合点图标（数字气泡） */
function buildClusterSvg(count: number) {
  let tier: 'large' | 'medium' | 'small' = 'small';
  if (count >= 200) {
    tier = 'large';
  } else if (count >= 50) {
    tier = 'medium';
  }

  let size = 40;
  if (tier === 'large') {
    size = 48;
  } else if (tier === 'medium') {
    size = 44;
  }
  const text = count > 99 ? '99+' : String(count);
  const fontSize = text.length > 2 ? 12 : 15;
  let colors = { from: '#22C55E', to: '#16A34A', ring: '#BBF7D0' }; // green
  if (tier === 'large') {
    colors = { from: '#F97316', to: '#EF4444', ring: '#FED7AA' }; // orange->red
  } else if (tier === 'medium') {
    colors = { from: '#3B82F6', to: '#2563EB', ring: '#BFDBFE' }; // blue
  }
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40">
      <defs>
        <radialGradient id="g" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stop-color="${colors.from}"/>
          <stop offset="100%" stop-color="${colors.to}"/>
        </radialGradient>
        <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,.25)"/>
        </filter>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#g)" filter="url(#s)"/>
      <circle cx="20" cy="20" r="17" fill="none" stroke="${colors.ring}" stroke-width="2" opacity="0.95"/>
      <circle cx="20" cy="20" r="13.5" fill="rgba(255,255,255,.12)"/>
      <text x="20" y="26" text-anchor="middle" fill="white" font-size="${fontSize}" font-weight="700" font-family="system-ui,-apple-system,Segoe UI,Roboto,sans-serif">${text}</text>
    </svg>
  `;
  return {
    size,
    url: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
  };
}

/** 根据当前缩放级别计算经纬度网格步长（缩放越大，格子越小，聚合越细） */
function gridSizeForZoom(zoom: number): number {
  const z = Math.max(4, Math.min(19, zoom));
  return 0.5 / 2 ** Math.max(0, z - 6);
}

function getValidDevices(): IotDeviceApi.Device[] {
  return deviceList.value.filter(
    (d) =>
      d.longitude !== undefined &&
      d.longitude !== null &&
      d.latitude !== undefined &&
      d.latitude !== null,
  );
}

/** 将设备按当前地图缩放做网格分桶，用于自动聚合 */
function bucketDevicesByGrid(
  devices: IotDeviceApi.Device[],
  zoom: number,
): IotDeviceApi.Device[][] {
  if (devices.length === 0) {
    return [];
  }
  const grid = gridSizeForZoom(zoom);
  const mapBuckets = new Map<string, IotDeviceApi.Device[]>();
  for (const d of devices) {
    const lng = Number(d.longitude);
    const lat = Number(d.latitude);
    const gx = Math.floor(lng / grid);
    const gy = Math.floor(lat / grid);
    const key = `${gx}_${gy}`;
    let list = mapBuckets.get(key);
    if (!list) {
      list = [];
      mapBuckets.set(key, list);
    }
    list.push(d);
  }
  return [...mapBuckets.values()];
}

/** 将点扩展为 setViewport 可用的坐标列表（单点或重合点时避免视野为 0） */
function buildLngLatsForViewport(devices: IotDeviceApi.Device[]): any[] {
  const pts = devices.map((d) =>
    createPoint(Number(d.longitude), Number(d.latitude)),
  );
  if (pts.length <= 1) {
    return pts;
  }
  const f = pts[0];
  const allSame = pts.every((p) => p.lng === f.lng && p.lat === f.lat);
  if (allSame) {
    const lng = f.lng;
    const lat = f.lat;
    const pad = 0.003;
    return [
      createPoint(lng - pad, lat - pad),
      createPoint(lng + pad, lat + pad),
    ];
  }
  return pts;
}

/** 按已有设备位置适配地图中心与缩放 */
function fitMapToDevices() {
  if (!mapInstance) {
    return;
  }
  const devices = getValidDevices();
  if (devices.length === 0) {
    return;
  }
  const lngLats = buildLngLatsForViewport(devices);
  if (lngLats.length === 1) {
    mapInstance.centerAndZoom(lngLats[0], 14);
    return;
  }
  if (typeof mapInstance.setViewport === 'function') {
    mapInstance.setViewport(lngLats);
  }
}

function createPoint(longitude: number, latitude: number) {
  return new window.T.LngLat(longitude, latitude);
}

function addOverlayToMap(overlay: any) {
  if (mapInstance?.addOverLay) {
    mapInstance.addOverLay(overlay);
    return;
  }
  if (mapInstance?.addOverlay) {
    mapInstance.addOverlay(overlay);
  }
}

function bindDeviceLinkInInfoWindow() {
  setTimeout(() => {
    document.querySelectorAll('.device-map-card .device-link').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const deviceId = (e.currentTarget as HTMLElement).dataset.id;
        if (deviceId) {
          router.push({
            name: 'IoTDeviceDetail',
            params: { id: deviceId },
          });
        }
      });
    });
  }, 100);
}

function openInfoWindow(marker: any, point: any, infoContent: string) {
  const options: Record<string, any> = {};
  if (window.T.Point) {
    options.offset = new window.T.Point(0, -20);
  }
  const infoWindow = new window.T.InfoWindow(infoContent, options);
  bindDeviceLinkInInfoWindow();
  if (mapInstance?.openInfoWindow) {
    mapInstance.openInfoWindow(infoWindow, point);
    return;
  }
  marker.openInfoWindow?.(infoWindow);
}

function bindInfoWindow(marker: any, point: any, infoContent: string) {
  marker.addEventListener('click', () => {
    openInfoWindow(marker, point, infoContent);
  });
}

function createMarker(device: IotDeviceApi.Device) {
  const config = getStateConfig(device.state!);
  const isOnline = device.state === DeviceStateEnum.ONLINE;
  const point = createPoint(device.longitude!, device.latitude!);
  const marker = new window.T.Marker(point);

  if (marker.setIcon && window.T.Icon && window.T.Point) {
    const { size, url } = buildMarkerSvg(config.color, isOnline);
    const icon = new window.T.Icon({
      iconUrl: url,
      iconSize: new window.T.Point(size, size),
      iconAnchor: new window.T.Point(size / 2, size / 2),
    });
    marker.setIcon(icon);
  }

  const infoContent = `
      <div class="device-map-card" style="padding: 8px; min-width: 180px;">
        <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">${device.nickname || device.deviceName}</div>
        <div style="color: #666; font-size: 12px; line-height: 1.8;">
          <div>产品: ${device.productName || '-'}</div>
          <div>状态: <span style="color: ${config.color}; font-weight: 500;">${config.name}</span></div>
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee;">
          <a href="javascript:void(0)" class="device-link" data-id="${device.id}" style="color: #1890ff; font-size: 12px; text-decoration: none;">点击查看详情 -></a>
        </div>
      </div>
    `;

  bindInfoWindow(marker, point, infoContent);
  addOverlayToMap(marker);
}

/** 聚合点：点击放大地图到该簇范围；双击打开简要列表 */
function createClusterMarker(items: IotDeviceApi.Device[]) {
  let sumLng = 0;
  let sumLat = 0;
  for (const d of items) {
    sumLng += Number(d.longitude);
    sumLat += Number(d.latitude);
  }
  const lng = sumLng / items.length;
  const lat = sumLat / items.length;
  const point = createPoint(lng, lat);
  const marker = new window.T.Marker(point);

  if (marker.setIcon && window.T.Icon && window.T.Point) {
    const { size, url } = buildClusterSvg(items.length);
    const icon = new window.T.Icon({
      iconUrl: url,
      iconSize: new window.T.Point(size, size),
      iconAnchor: new window.T.Point(size / 2, size / 2),
    });
    marker.setIcon(icon);
  }

  const preview = items
    .slice(0, 6)
    .map(
      (d) =>
        `<div style="font-size:12px;color:#333;">· ${d.nickname || d.deviceName || d.id}</div>`,
    )
    .join('');
  const more =
    items.length > 6
      ? `<div style="color:#999;font-size:12px;">等 ${items.length} 台</div>`
      : '';

  marker.addEventListener('click', () => {
    if (mapInstance && items.length > 0) {
      const lngLats = buildLngLatsForViewport(items);
      if (lngLats.length === 1) {
        mapInstance.centerAndZoom(
          lngLats[0],
          Math.min(18, (mapInstance.getZoom?.() ?? 10) + 2),
        );
      } else if (typeof mapInstance.setViewport === 'function') {
        mapInstance.setViewport(lngLats);
      }
    }
  });

  marker.addEventListener('dblclick', (e: Event) => {
    e.stopPropagation?.();
    const infoContent = `
      <div class="device-map-card" style="padding: 8px; min-width: 200px; max-height: 240px; overflow: auto;">
        <div style="font-weight: 600; margin-bottom: 8px;">共 ${items.length} 台设备</div>
        ${preview}
        ${more}
        <div style="margin-top:8px;color:#999;font-size:12px;">单击聚合点可放大区域</div>
      </div>
    `;
    openInfoWindow(marker, point, infoContent);
  });

  addOverlayToMap(marker);
}

/** 按当前缩放绘制设备点或聚合点 */
function renderMarkers() {
  if (!mapInstance || !window.T) {
    return;
  }
  if (mapInstance.clearOverLays) {
    mapInstance.clearOverLays();
  }

  const devices = getValidDevices();
  if (devices.length === 0) {
    return;
  }

  const zoom = Number(mapInstance.getZoom?.() ?? 10);
  const buckets = bucketDevicesByGrid(devices, zoom);

  for (const group of buckets) {
    if (group.length === 1) {
      createMarker(group[0]!);
    } else {
      createClusterMarker(group);
    }
  }
}

const debouncedRedraw = useDebounceFn(() => {
  renderMarkers();
}, 120);

/** 初始化地图 */
function initMap() {
  if (!mapContainerRef.value || !window.T) {
    return;
  }

  mapInstance = new window.T.Map(mapContainerRef.value);
  mapInstance.centerAndZoom(createPoint(106, 37.5), 5);
  mapInstance.enableScrollWheelZoom?.();

  fitMapToDevices();
  renderMarkers();

  viewportChangeHandler = () => debouncedRedraw();
  mapInstance.addEventListener('zoomend', viewportChangeHandler);
  mapInstance.addEventListener('moveend', viewportChangeHandler);
}

/** 加载设备数据 */
async function loadDeviceData() {
  loading.value = true;
  try {
    deviceList.value = await getDeviceLocationList();
  } finally {
    loading.value = false;
  }
}

/** 初始化 */
async function init() {
  await loadDeviceData();
  if (!hasData.value) {
    return;
  }
  await loadTianDiTuMapSdk();
  initMap();
}

/** 组件挂载时初始化 */
onMounted(() => {
  init();
});

/** 组件卸载时销毁地图实例 */
onUnmounted(() => {
  if (mapInstance && viewportChangeHandler) {
    mapInstance.removeEventListener?.('zoomend', viewportChangeHandler);
    mapInstance.removeEventListener?.('moveend', viewportChangeHandler);
    viewportChangeHandler = null;
  }
  if (mapInstance?.clearOverLays) {
    mapInstance.clearOverLays();
  }
  mapInstance = null;
});
</script>

<template>
  <Card class="h-full" title="设备分布地图">
    <template #extra>
      <div class="flex items-center gap-4 text-sm">
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{ backgroundColor: stateColorMap[DeviceStateEnum.ONLINE] }"
          ></span>
          <span class="text-gray-500">在线</span>
        </span>
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{ backgroundColor: stateColorMap[DeviceStateEnum.OFFLINE] }"
          ></span>
          <span class="text-gray-500">离线</span>
        </span>
        <span class="flex items-center gap-1">
          <span
            class="inline-block h-3 w-3 rounded-full"
            :style="{
              backgroundColor: stateColorMap[DeviceStateEnum.INACTIVE],
            }"
          ></span>
          <span class="text-gray-500">待激活</span>
        </span>
      </div>
    </template>
    <Spin v-if="loading" class="flex h-[500px] items-center justify-center" />
    <Empty
      v-else-if="!hasData"
      class="h-[500px]"
      description="暂无设备位置数据"
    />
    <div
      v-show="hasData && !loading"
      ref="mapContainerRef"
      class="h-[500px] w-full"
    ></div>
  </Card>
</template>
