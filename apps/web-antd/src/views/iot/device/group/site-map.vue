<script setup lang="ts">
import type { IotDeviceApi } from '#/api/iot/device/device';
import type { IotDeviceGroupApi } from '#/api/iot/device/group';

import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Card, Empty, Spin } from 'ant-design-vue';

import {
  getDeviceLocationListByGroup,
  getDevicePage,
} from '#/api/iot/device/device';
import { getDeviceGroup } from '#/api/iot/device/group';

defineOptions({ name: 'IoTSiteMap' });

const TIANDITU_TK = import.meta.env.VITE_TIANDITU_TK;
const CESIUM_PATH = 'https://unpkg.com/cesium@1.91.0/Build/Cesium/Cesium.js';

const route = useRoute();
const router = useRouter();
const siteId = Number(route.params.id);

const loading = ref(true);
const site = ref<IotDeviceGroupApi.DeviceGroup>();
const devices = ref<IotDeviceApi.Device[]>([]);
const viewerReady = ref(false);
const terrainReady = ref(false);
const terrainFailed = ref(false);
const viewerRef = ref<any>(null);
const cesiumRef = ref<any>(null);

const cameraDestination = computed(() => {
  const longitude = site.value?.longitude ?? 105;
  const latitude = site.value?.latitude ?? 34;
  const height = (site.value?.altitude ?? 1500) + 2500;
  return {
    lng: Number(longitude),
    lat: Number(latitude),
    height: Number(height),
  };
});

const viewerCamera = computed(() => ({
  position: {
    lng: dynamicCenter.value.lng,
    lat: dynamicCenter.value.lat,
    height: dynamicCameraHeight.value,
  },
  heading: 25,
  pitch: -50,
  roll: 0,
}));

const hasValidSiteLocation = computed(() => {
  return site.value?.longitude != null && site.value?.latitude != null;
});

const devicePoints = computed(() =>
  devices.value.filter(
    (item) => item.longitude != null && item.latitude != null && item.id != null,
  ),
);

const dynamicCenter = computed(() => {
  if (devicePoints.value.length === 0) {
    return {
      lng: cameraDestination.value.lng,
      lat: cameraDestination.value.lat,
      minLng: cameraDestination.value.lng,
      maxLng: cameraDestination.value.lng,
      minLat: cameraDestination.value.lat,
      maxLat: cameraDestination.value.lat,
    };
  }
  const longitudes = devicePoints.value.map((item) => Number(item.longitude));
  const latitudes = devicePoints.value.map((item) => Number(item.latitude));
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  return {
    lng: (minLng + maxLng) / 2,
    lat: (minLat + maxLat) / 2,
    minLng,
    maxLng,
    minLat,
    maxLat,
  };
});

const dynamicCameraHeight = computed(() => {
  if (devicePoints.value.length <= 1) {
    return Math.max(Number(cameraDestination.value.height), 2200);
  }
  const center = dynamicCenter.value;
  const lngSpan = Math.abs(center.maxLng - center.minLng);
  const latSpan = Math.abs(center.maxLat - center.minLat);
  const maxSpan = Math.max(lngSpan, latSpan);
  // 1 度约 111km，按组内设备空间范围动态估算观察高度
  const estimated = maxSpan * 111_000 * 1.9;
  return Math.min(Math.max(estimated, 2500), 80_000);
});

function onViewerReady(ready: any) {
  viewerReady.value = true;
  const viewer = ready?.cesiumObject ?? ready?.viewer ?? ready?.viewerCesiumObject;
  const Cesium = ready?.Cesium;
  viewerRef.value = viewer;
  cesiumRef.value = Cesium;
  if (!viewer?.scene?.globe || !Cesium) {
    return;
  }
  viewer.scene.morphTo3D(0);
  viewer.scene.mode = Cesium.SceneMode.SCENE3D;
  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.globe.dynamicAtmosphereLighting = true;
  focusCameraToDevices();
}

function onTerrainReady() {
  terrainReady.value = true;
  terrainFailed.value = false;
  focusCameraToDevices();
}

function onTerrainUnready(error: any) {
  terrainFailed.value = true;
  void error;
}

const loadingTips = computed(() => {
  if (terrainFailed.value) {
    return '天地图地形加载失败，请稍后重试';
  }
  if (!terrainReady.value) {
    return '3D 地形加载中...';
  }
  return '3D 场景加载中...';
});

function focusCameraToDevices() {
  const viewer = viewerRef.value;
  const Cesium = cesiumRef.value;
  if (!viewer || !Cesium || devicePoints.value.length === 0) {
    return;
  }
  const cartesians = devicePoints.value.map((item) =>
    Cesium.Cartesian3.fromDegrees(
      Number(item.longitude),
      Number(item.latitude),
      Number(item.altitude ?? 0),
    ),
  );
  const sphere = Cesium.BoundingSphere.fromPoints(cartesians);
  const minRange = 800;
  const range = Math.max(sphere.radius * 1.2, minRange);
  viewer.camera.flyToBoundingSphere(sphere, {
    offset: new Cesium.HeadingPitchRange(
      Cesium.Math.toRadians(20),
      Cesium.Math.toRadians(-15),
      range,
    ),
    duration: 1,
  });
}

async function loadData() {
  loading.value = true;
  try {
    site.value = await getDeviceGroup(siteId);
    const [siteDevices, fallbackPage] = await Promise.all([
      getDeviceLocationListByGroup(siteId),
      getDevicePage({ pageNo: 1, pageSize: 200, groupId: siteId }),
    ]);
    const fallbackDeviceMap = new Map(
      fallbackPage.list.map((item) => [item.id, item]),
    );
    devices.value = siteDevices.map((item) => ({
      ...item,
      nickname: item.nickname || fallbackDeviceMap.get(item.id)?.nickname,
    }));
    focusCameraToDevices();
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  if (!siteId) {
    router.back();
    return;
  }
  await loadData();
});
</script>

<template>
  <Page auto-content-height>
    <Card :title="`${site?.name || '站点'} 3D 山体实景`">
      <template #extra>
        <span class="text-xs text-gray-500">设备点位数：{{ devicePoints.length }}</span>
      </template>
      <Spin v-if="loading" class="flex h-[620px] items-center justify-center" />
      <Empty
        v-else-if="!hasValidSiteLocation"
        class="h-[620px]"
        description="当前站点尚未配置经纬度，无法展示 3D 山体"
      />
      <div v-else class="relative h-[760px] overflow-hidden rounded-md">
        <vc-viewer
          :animation="false"
          :base-layer-picker="false"
          :fullscreen-button="false"
          :geocoder="false"
          :home-button="false"
          :info-box="false"
          :scene-mode-picker="false"
          :scene-mode="3"
          :scene3DOnly="true"
          :selection-indicator="false"
          :timeline="false"
          :navigation-help-button="false"
          :should-animate="true"
          :camera="viewerCamera"
          :cesium-path="CESIUM_PATH"
          :terrain-exaggeration="1.4"
          class="h-full w-full"
          @ready="onViewerReady"
        >
          <vc-layer-imagery>
            <vc-imagery-provider-tianditu map-style="img_w" :token="TIANDITU_TK" />
          </vc-layer-imagery>
          <vc-layer-imagery>
            <vc-imagery-provider-tianditu map-style="cia_w" :token="TIANDITU_TK" />
          </vc-layer-imagery>
          <vc-terrain-provider-tianditu
            :token="TIANDITU_TK"
            @ready="onTerrainReady"
            @unready="onTerrainUnready"
          />

          <vc-entity
            v-for="device in devicePoints"
            :key="device.id"
            :position="{
              lng: Number(device.longitude),
              lat: Number(device.latitude),
              height: Number(device.altitude ?? 0),
            }"
          >
            <vc-graphics-point :pixel-size="10" color="#ff4d4f" :outline-width="2" outline-color="#ffffff" />
            <vc-graphics-label
              :text="device.nickname || device.deviceName"
              :font="'14px sans-serif'"
              :pixel-offset="{ x: 0, y: -24 }"
              fill-color="#ffffff"
              outline-color="#000000"
              :outline-width="2"
            />
          </vc-entity>
        </vc-viewer>
        <div
          v-if="!viewerReady || !terrainReady"
          class="absolute inset-0 flex items-center justify-center bg-black/20 text-white"
        >
          {{ loadingTips }}
        </div>
      </div>
    </Card>
  </Page>
</template>
