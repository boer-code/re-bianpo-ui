<script setup lang="ts">
import type { Dayjs } from 'dayjs';

import type { EchartsUIType } from '@vben/plugins/echarts';

import type { IotDeviceApi } from '#/api/iot/device/device';

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';
import { formatDate } from '@vben/utils';

import { Button, Card, Empty, Spin, Switch } from 'ant-design-vue';
import dayjs from 'dayjs';

import {
  getHistoryDevicePropertyList,
  getLatestDeviceProperties,
} from '#/api/iot/device/device';
import ShortcutDateRangePicker from '#/components/shortcut-date-range-picker/shortcut-date-range-picker.vue';
import { IoTDataSpecsDataTypeEnum } from '#/views/iot/utils/constants';

const props = defineProps<{
  deviceId?: number;
}>();

const chartRef = ref<EchartsUIType>();
const { getChartInstance, renderEcharts, updateData } = useEcharts(chartRef);

const loading = ref(false);
const hasData = ref(false);
const autoRefresh = ref(false);
const dateRange = ref<[string, string]>([
  dayjs().subtract(6, 'day').startOf('day').format('YYYY-MM-DD HH:mm:ss'),
  dayjs().endOf('day').format('YYYY-MM-DD HH:mm:ss'),
]);
let autoRefreshTimer: null | ReturnType<typeof setInterval> = null;

const CHART_DISABLED_DATA_TYPES = [
  IoTDataSpecsDataTypeEnum.ARRAY,
  IoTDataSpecsDataTypeEnum.STRUCT,
  IoTDataSpecsDataTypeEnum.TEXT,
  IoTDataSpecsDataTypeEnum.BOOL,
  IoTDataSpecsDataTypeEnum.ENUM,
  IoTDataSpecsDataTypeEnum.DATE,
] as const;

const CHART_COLOR_PALETTE = [
  '#1677ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
  '#2f54eb',
];

function getSeriesColor(index: number) {
  return CHART_COLOR_PALETTE[index % CHART_COLOR_PALETTE.length];
}

function isChartSupportedDataType(dataType?: string) {
  if (!dataType) {
    return false;
  }
  return !CHART_DISABLED_DATA_TYPES.includes(
    dataType as (typeof CHART_DISABLED_DATA_TYPES)[number],
  );
}

function parseDateTime(input: Date | string) {
  return dayjs(input);
}

function isInSelectedRange(time: Date | string) {
  const point = parseDateTime(time);
  const start = parseDateTime(dateRange.value[0]);
  const end = parseDateTime(dateRange.value[1]);
  return (
    point.isValid() &&
    start.isValid() &&
    end.isValid() &&
    !point.isBefore(start) &&
    !point.isAfter(end)
  );
}

function formatNumericLabel(value: number | string) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return String(value);
  }
  if (Math.abs(num) >= 1000) {
    return num.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
  }
  if (Math.abs(num) >= 1) {
    return num.toFixed(2).replace(/\.00$/, '');
  }
  return num.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function getThingModelTrendLabel(item: IotDeviceApi.DevicePropertyDetail) {
  const suffix = item.dataSpecs?.unit || item.identifier;
  return suffix ? `${item.name}(${suffix})` : item.name;
}

function buildChartOptions(
  xAxisData: string[],
  series: Array<{
    color: string;
    data: Array<null | number>;
    name: string;
    yAxisIndex: number;
  }>,
) {
  const leftAxisCount = Math.ceil(series.length / 2);
  const rightAxisCount = Math.floor(series.length / 2);
  const leftPadding = 56 + Math.max(leftAxisCount - 1, 0) * 48;
  const rightPadding = 40 + Math.max(rightAxisCount - 1, 0) * 48;

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
      },
      formatter: (params: any[]) => {
        if (!Array.isArray(params) || params.length === 0) {
          return '';
        }
        const axisValue =
          params[0]?.axisValueLabel || params[0]?.axisValue || '';
        const lines = params.map((item) => {
          const point = Array.isArray(item.data)
            ? item.data[1]
            : (item.data ?? item.value);
          return `${item.marker}${item.seriesName}: ${formatNumericLabel(point)}`;
        });
        return [axisValue, ...lines].join('<br/>');
      },
    },
    legend: {
      top: 6,
      type: 'scroll',
    },
    grid: {
      left: leftPadding,
      right: rightPadding,
      top: 52,
      bottom: 98,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      name: '时间',
      data: xAxisData,
    },
    yAxis: series.map((item, index) => ({
      type: 'value',
      name: item.name,
      nameGap: 14,
      scale: true,
      position: index % 2 === 0 ? 'left' : 'right',
      offset: Math.floor(index / 2) * 48,
      alignTicks: true,
      axisLine: {
        show: true,
        lineStyle: {
          color: item.color,
        },
      },
      axisLabel: {
        color: item.color,
        formatter: (value: number) => formatNumericLabel(value),
      },
      splitLine: {
        show: index === 0,
      },
    })),
    series: series.map((item) => ({
      ...item,
      type: 'line',
      smooth: true,
      connectNulls: false,
      showSymbol: false,
      symbol: 'circle',
      symbolSize: 6,
      yAxisIndex: item.yAxisIndex,
      itemStyle: {
        color: item.color,
      },
      lineStyle: {
        color: item.color,
      },
    })),
    dataZoom: [
      {
        type: 'inside',
        start: 0,
        end: 100,
      },
      {
        type: 'slider',
        height: 24,
        bottom: 16,
      },
    ],
  };
}

async function loadTrendData() {
  if (!props.deviceId) {
    hasData.value = false;
    return;
  }

  loading.value = true;
  try {
    const latestList = await getLatestDeviceProperties({
      deviceId: props.deviceId,
      identifier: undefined,
      name: undefined,
    });

    const trendProps = latestList.filter(
      (item: IotDeviceApi.DevicePropertyDetail) =>
        isChartSupportedDataType(item.dataType),
    );

    if (trendProps.length === 0) {
      hasData.value = false;
      return;
    }

    // 后端时间过滤不严格时，前端仍会做一次严格区间过滤
    const historyResults = await Promise.all(
      trendProps.map(async (item: IotDeviceApi.DevicePropertyDetail) => {
        const data = await getHistoryDevicePropertyList({
          deviceId: props.deviceId,
          identifier: item.identifier,
          times: dateRange.value,
        });
        const rawList = (
          Array.isArray(data) ? data : data?.list || []
        ) as IotDeviceApi.DeviceProperty[];
        const list = rawList.filter((row) => isInSelectedRange(row.updateTime));

        return {
          identifier: item.identifier,
          label: getThingModelTrendLabel(item),
          name: item.name,
          list,
        };
      }),
    );

    const xAxisSet = new Set<string>();
    const seriesSource = historyResults.map((result) => {
      const valueMap = new Map<string, number>();
      const sorted = result.list.toSorted(
        (a, b) =>
          new Date(a.updateTime).getTime() - new Date(b.updateTime).getTime(),
      );

      sorted.forEach((row) => {
        const time = formatDate(
          new Date(row.updateTime),
          'YYYY-MM-DD HH:mm:ss',
        );
        xAxisSet.add(time);
        const value = Number(row.value);
        if (!Number.isNaN(value)) {
          valueMap.set(time, value);
        }
      });

      return {
        name: result.label,
        valueMap,
      };
    });

    const xAxisData = [...xAxisSet].toSorted(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );

    const series = seriesSource
      .map((item, index) => ({
        name: item.name,
        data: xAxisData.map((time) => item.valueMap.get(time) ?? null),
        yAxisIndex: index,
        color: getSeriesColor(index),
      }))
      .filter((item) => item.data.some((point) => point !== null))
      .map((item, index) => ({
        ...item,
        yAxisIndex: index,
      }));

    if (xAxisData.length === 0 || series.length === 0) {
      hasData.value = false;
      return;
    }

    hasData.value = true;
    await nextTick();
    const chartOptions = buildChartOptions(xAxisData, series);

    if (getChartInstance()) {
      await updateData(chartOptions, true);
      return;
    }

    await renderEcharts(chartOptions);
  } finally {
    loading.value = false;
  }
}

function clearAutoRefreshTimer() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
  }
}

function startAutoRefresh() {
  clearAutoRefreshTimer();
  autoRefreshTimer = setInterval(() => {
    if (!loading.value) {
      loadTrendData();
    }
  }, 5000);
}

function handleDateRangeChange(times?: [Dayjs, Dayjs]) {
  if (!times || times.length !== 2) {
    return;
  }

  dateRange.value = [
    dayjs(times[0]).format('YYYY-MM-DD HH:mm:ss'),
    dayjs(times[1]).format('YYYY-MM-DD HH:mm:ss'),
  ];
  loadTrendData();
}

onMounted(() => {
  loadTrendData();
});

watch(autoRefresh, (enabled) => {
  if (enabled) {
    loadTrendData();
    startAutoRefresh();
    return;
  }
  clearAutoRefreshTimer();
});

watch(
  () => props.deviceId,
  (newValue) => {
    if (newValue) {
      loadTrendData();
    }
  },
);

onBeforeUnmount(() => {
  clearAutoRefreshTimer();
});
</script>

<template>
  <Card class="mt-4">
    <template #title>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-base font-medium text-gray-600"> 设备属性趋势 </span>
        <div class="flex flex-wrap items-center gap-3">
          <ShortcutDateRangePicker @change="handleDateRangeChange" />
          <Switch
            v-model:checked="autoRefresh"
            checked-children="定时刷新"
            un-checked-children="定时刷新"
          />
          <Button :loading="loading" @click="loadTrendData">刷新</Button>
        </div>
      </div>
    </template>

    <div class="relative h-[420px]">
      <EchartsUI v-show="hasData" ref="chartRef" class="h-full w-full" />
      <div
        v-if="!hasData && !loading"
        class="flex h-full items-center justify-center"
      >
        <Empty description="暂无可展示的物模型趋势数据" />
      </div>
      <div
        v-if="loading"
        class="pointer-events-none absolute right-3 top-3 z-10"
      >
        <div class="rounded bg-white/90 px-2 py-1 shadow-sm">
          <Spin size="small" />
        </div>
      </div>
    </div>
  </Card>
</template>
