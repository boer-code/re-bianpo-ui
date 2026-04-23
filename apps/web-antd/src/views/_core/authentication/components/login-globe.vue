<script lang="ts" setup>
import type { Globe } from 'cobe';

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

import { usePreferences } from '@vben/preferences';

import createGlobe from 'cobe';

const globeContainerRef = ref<HTMLElement>();
const globeCanvasRef = ref<HTMLCanvasElement>();
const { isDark } = usePreferences();

let globeInstance: Globe | null = null;
let animationFrameId = 0;
let resizeObserver: null | ResizeObserver = null;
let rotationPhi = 0;
let animationPhase = 0;

const globeMarkers = [
  { location: [37.7749, -122.4194] as [number, number], size: 0.012 },
  { location: [40.7128, -74.006] as [number, number], size: 0.012 },
  { location: [51.5072, -0.1276] as [number, number], size: 0.012 },
  { location: [48.8566, 2.3522] as [number, number], size: 0.012 },
  { location: [25.2048, 55.2708] as [number, number], size: 0.012 },
  { location: [1.3521, 103.8198] as [number, number], size: 0.012 },
  { location: [35.6762, 139.6503] as [number, number], size: 0.012 },
  { location: [-33.8688, 151.2093] as [number, number], size: 0.012 },
  { location: [-23.5505, -46.6333] as [number, number], size: 0.012 },
  { location: [-33.9249, 18.4241] as [number, number], size: 0.012 },
  { location: [39.9042, 116.4074] as [number, number], size: 0.012 },
  { location: [34.0522, -118.2437] as [number, number], size: 0.012 },
];

const globeArcs = [
  {
    from: [37.7749, -122.4194] as [number, number],
    to: [35.6762, 139.6503] as [number, number],
    color: [0.48, 0.9, 1] as [number, number, number],
  },
  {
    from: [40.7128, -74.006] as [number, number],
    to: [51.5072, -0.1276] as [number, number],
  },
  {
    from: [48.8566, 2.3522] as [number, number],
    to: [25.2048, 55.2708] as [number, number],
  },
  {
    from: [25.2048, 55.2708] as [number, number],
    to: [1.3521, 103.8198] as [number, number],
  },
  {
    from: [1.3521, 103.8198] as [number, number],
    to: [-33.8688, 151.2093] as [number, number],
  },
  {
    from: [34.0522, -118.2437] as [number, number],
    to: [-23.5505, -46.6333] as [number, number],
  },
  {
    from: [51.5072, -0.1276] as [number, number],
    to: [-33.9249, 18.4241] as [number, number],
  },
  {
    from: [39.9042, 116.4074] as [number, number],
    to: [1.3521, 103.8198] as [number, number],
  },
  {
    from: [35.6762, 139.6503] as [number, number],
    to: [-33.8688, 151.2093] as [number, number],
  },
  {
    from: [51.5072, -0.1276] as [number, number],
    to: [-23.5505, -46.6333] as [number, number],
  },
];

const globeTheme = computed(() => {
  if (isDark.value) {
    return {
      arcColor: [0.48, 0.9, 1] as [number, number, number],
      baseColor: [0.08, 0.24, 0.42] as [number, number, number],
      dark: 0.82,
      glowColor: [0.16, 0.48, 0.88] as [number, number, number],
      mapBaseBrightness: 0.08,
      mapBrightness: 7.8,
      markerColor: [0.42, 0.91, 1] as [number, number, number],
    };
  }

  return {
    arcColor: [0.12, 0.48, 0.86] as [number, number, number],
    baseColor: [0.58, 0.76, 0.94] as [number, number, number],
    dark: 0.18,
    glowColor: [0.86, 0.94, 1] as [number, number, number],
    mapBaseBrightness: 0.22,
    mapBrightness: 5.6,
    markerColor: [0.08, 0.42, 0.82] as [number, number, number],
  };
});

function getAnimatedArcs() {
  const { arcColor } = globeTheme.value;
  return globeArcs.map((arc, arcIndex) => {
    const glowStrength =
      0.72 + 0.28 * Math.sin(animationPhase + arcIndex * 0.75);
    return {
      ...arc,
      color: [
        arcColor[0] + glowStrength * 0.1,
        arcColor[1] + glowStrength * 0.08,
        arcColor[2] + glowStrength * 0.04,
      ] as [number, number, number],
    };
  });
}

function getCanvasSize() {
  const containerElement = globeContainerRef.value;
  if (!containerElement) {
    return 0;
  }
  const { width, height } = containerElement.getBoundingClientRect();
  return Math.max(320, Math.floor(Math.min(width, height)));
}

function renderGlobeFrame() {
  const canvasSize = getCanvasSize();
  if (!globeInstance || !canvasSize) {
    return;
  }

  rotationPhi += 0.0028;
  animationPhase += 0.045;
  globeInstance.update({
    ...globeTheme.value,
    width: canvasSize,
    height: canvasSize,
    phi: rotationPhi,
    arcs: getAnimatedArcs(),
  });

  animationFrameId = window.requestAnimationFrame(renderGlobeFrame);
}

function destroyGlobe() {
  if (animationFrameId) {
    window.cancelAnimationFrame(animationFrameId);
    animationFrameId = 0;
  }
  globeInstance?.destroy();
  globeInstance = null;
}

async function initGlobe() {
  destroyGlobe();

  await nextTick();

  const canvasElement = globeCanvasRef.value;
  const canvasSize = getCanvasSize();
  if (!canvasElement || !canvasSize) {
    return;
  }

  rotationPhi = 0;
  animationPhase = 0;
  globeInstance = createGlobe(canvasElement, {
    devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    width: canvasSize,
    height: canvasSize,
    phi: rotationPhi,
    theta: -0.18,
    dark: 0.82,
    diffuse: 1.35,
    scale: 1,
    opacity: 0.98,
    mapSamples: 22_000,
    arcWidth: 0.12,
    arcHeight: 0.24,
    markerElevation: 0.006,
    offset: [0, -8],
    markers: globeMarkers,
    arcs: getAnimatedArcs(),
    ...globeTheme.value,
  });

  renderGlobeFrame();
}

onMounted(() => {
  initGlobe();

  if (!globeContainerRef.value) {
    return;
  }

  resizeObserver = new ResizeObserver(() => {
    if (!globeInstance) {
      initGlobe();
    }
  });
  resizeObserver.observe(globeContainerRef.value);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  destroyGlobe();
});
</script>

<template>
  <div class="login-globe">
    <div ref="globeContainerRef" class="login-globe__stage">
      <div class="login-globe__orbit login-globe__orbit--outer"></div>
      <div class="login-globe__orbit login-globe__orbit--middle"></div>
      <div class="login-globe__scan"></div>
      <canvas ref="globeCanvasRef" class="login-globe__canvas"></canvas>
      <div class="login-globe__halo login-globe__halo--outer"></div>
      <div class="login-globe__halo login-globe__halo--inner"></div>
      <span class="login-globe__dot login-globe__dot--one"></span>
      <span class="login-globe__dot login-globe__dot--two"></span>
      <span class="login-globe__dot login-globe__dot--three"></span>
      <span class="login-globe__dot login-globe__dot--four"></span>
    </div>
    <div class="login-globe__content">
      <div class="login-globe__title">波尔边坡监测平台</div>
      <div class="login-globe__description">
        连接设备、站点与告警消息，实时感知监测网络状态。
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-globe {
  --login-globe-accent-rgb: 37 99 235;
  --login-globe-accent-soft-rgb: 125 211 252;
  --login-globe-halo-opacity: 14%;
  --login-globe-orbit-opacity: 20%;
  --login-globe-scan-opacity: 0.42;

  display: flex;
  width: min(100%, 620px);
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.login-globe__stage {
  position: relative;
  display: flex;
  aspect-ratio: 1;
  width: min(100%, 500px);
  align-items: center;
  justify-content: center;
}

.login-globe__canvas {
  position: relative;
  z-index: 4;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 28px rgb(var(--login-globe-accent-rgb) / 18%));
}

.login-globe__halo {
  position: absolute;
  inset: 50%;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

.login-globe__halo--outer {
  z-index: 0;
  width: 128%;
  height: 128%;
  background: radial-gradient(
    circle,
    rgb(var(--login-globe-accent-soft-rgb) / var(--login-globe-halo-opacity)) 0%,
    rgb(var(--login-globe-accent-rgb) / 8%) 38%,
    rgb(var(--login-globe-accent-rgb) / 0%) 72%
  );
  filter: blur(24px);
}

.login-globe__halo--inner {
  z-index: 2;
  width: 90%;
  height: 90%;
  background: radial-gradient(
    circle,
    rgb(var(--login-globe-accent-soft-rgb) / 16%) 0%,
    rgb(var(--login-globe-accent-rgb) / 0%) 70%
  );
  filter: blur(18px);
}

.login-globe__orbit,
.login-globe__scan {
  position: absolute;
  inset: 50%;
  border-radius: 9999px;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.login-globe__orbit {
  z-index: 3;
  border: 1px solid
    rgb(
      var(--login-globe-accent-soft-rgb) /
        var(--login-globe-orbit-opacity)
    );
  box-shadow:
    inset 0 0 26px rgb(var(--login-globe-accent-rgb) / 8%),
    0 0 22px rgb(var(--login-globe-accent-rgb) / 8%);
}

.login-globe__orbit--outer {
  width: 108%;
  height: 108%;
  border-top-color: rgb(var(--login-globe-accent-soft-rgb) / 44%);
  transform: translate(-50%, -50%) rotate(-18deg) skew(3deg);
}

.login-globe__orbit--middle {
  width: 86%;
  height: 86%;
  border-right-color: rgb(var(--login-globe-accent-soft-rgb) / 38%);
  border-bottom-color: rgb(var(--login-globe-accent-soft-rgb) / 8%);
  transform: translate(-50%, -50%) rotate(22deg) skew(-8deg);
}

.login-globe__scan {
  z-index: 3;
  width: 114%;
  height: 114%;
  background:
    linear-gradient(
      90deg,
      transparent 46%,
      rgb(var(--login-globe-accent-soft-rgb) / 30%) 50%,
      transparent 54%
    ),
    linear-gradient(
      0deg,
      transparent 49%,
      rgb(var(--login-globe-accent-soft-rgb) / 12%) 50%,
      transparent 51%
    );
  mask-image: radial-gradient(
    circle,
    transparent 58%,
    #000 59%,
    #000 61%,
    transparent 62%
  );
  opacity: var(--login-globe-scan-opacity);
  transform: translate(-50%, -50%) rotate(-15deg);
}

.login-globe__dot {
  position: absolute;
  z-index: 5;
  width: 6px;
  height: 6px;
  border-radius: 9999px;
  background: rgb(var(--login-globe-accent-soft-rgb));
  box-shadow: 0 0 18px rgb(var(--login-globe-accent-rgb) / 62%);
  pointer-events: none;
}

.login-globe__dot--one {
  top: 19%;
  right: 14%;
}

.login-globe__dot--two {
  top: 35%;
  left: 6%;
  width: 4px;
  height: 4px;
  opacity: 0.75;
}

.login-globe__dot--three {
  right: 10%;
  bottom: 26%;
  width: 4px;
  height: 4px;
  opacity: 0.7;
}

.login-globe__dot--four {
  bottom: 16%;
  left: 19%;
  width: 5px;
  height: 5px;
  opacity: 0.8;
}

.login-globe__content {
  text-align: center;
}

.login-globe__title {
  color: hsl(var(--foreground));
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.login-globe__description {
  margin-top: 12px;
  color: hsl(var(--muted-foreground));
  font-size: 15px;
  line-height: 1.8;
}

:global(.dark) .login-globe__title {
  text-shadow: 0 0 24px rgb(125 211 252 / 18%);
}

:global(.dark) .login-globe__description {
  color: rgb(203 213 225 / 82%);
}

:global(.dark) .login-globe {
  --login-globe-accent-rgb: 56 189 248;
  --login-globe-accent-soft-rgb: 125 211 252;
  --login-globe-halo-opacity: 22%;
  --login-globe-orbit-opacity: 20%;
  --login-globe-scan-opacity: 0.65;
}
</style>
