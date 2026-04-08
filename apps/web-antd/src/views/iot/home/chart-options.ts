/** 消息趋势图表配置 */
export function getMessageTrendChartOptions(
  times: string[],
  upstreamData: number[],
  downstreamData: number[],
): any {
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    legend: {
      data: ['上行消息', '下行消息'],
      top: '5%',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: times,
      },
    ],
    yAxis: [
      {
        type: 'value',
        name: '消息数量',
      },
    ],
    series: [
      {
        name: '上行消息',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        emphasis: {
          focus: 'series',
        },
        data: upstreamData,
        itemStyle: {
          color: '#1890ff',
        },
      },
      {
        name: '下行消息',
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
        emphasis: {
          focus: 'series',
        },
        data: downstreamData,
        itemStyle: {
          color: '#52c41a',
        },
      },
    ],
  };
}

/**
 * 设备状态仪表盘图表配置
 */
export function getDeviceStateGaugeChartOptions(
  value: number,
  max: number,
  color: string,
  title: string,
  isDark = false,
): any {
  const neonColorMap: Record<string, [string, string]> = {
    '#52c41a': ['#8EFFA1', '#39E67A'],
    '#ff4d4f': ['#FF9BB0', '#FF5E7A'],
    '#1890ff': ['#72E3FF', '#6A7BFF'],
  };

  const [startColor, endColor] = neonColorMap[color] ?? [`${color}E6`, color];
  const axisLineBg = isDark ? '#2F3747' : '#E5E7EB';

  return {
    series: [
      {
        type: 'gauge',
        startAngle: 225,
        endAngle: -45,
        min: 0,
        max,
        center: ['50%', '50%'],
        radius: '86%',
        progress: {
          show: true,
          roundCap: true,
          width: 20,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 1,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: startColor,
                },
                {
                  offset: 1,
                  color: endColor,
                },
              ],
            },
            shadowColor: `${endColor}99`,
            shadowBlur: 18,
          },
        },
        axisLine: {
          roundCap: true,
          lineStyle: {
            width: 20,
            color: [[1, axisLineBg]] as [number, string][],
          },
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        title: {
          show: true,
          offsetCenter: [0, '100%'],
          fontSize: 14,
          color: '#A8B3C8',
        },
        detail: {
          valueAnimation: true,
          fontSize: 30,
          fontWeight: 700,
          color: endColor,
          offsetCenter: [0, '8%'],
          formatter: (val: number) => `${val} 个`,
        },
        data: [{ value, name: title }],
      },
    ],
  };
}

/**
 * 设备数量饼图配置
 */
export function getDeviceCountPieChartOptions(
  data: Array<{ name: string; value: number }>,
  isDark = false,
): any {
  const tooltipBackground = isDark ? 'rgba(17, 24, 39, 0.92)' : 'rgba(255, 255, 255, 0.96)';
  const tooltipBorder = isDark
    ? 'rgba(114, 227, 255, 0.35)'
    : 'rgba(59, 130, 246, 0.25)';
  const tooltipTextColor = isDark ? '#E5EDFF' : '#1F2937';
  const legendTextColor = isDark ? '#A8B3C8' : '#4B5563';
  const emphasisLabelColor = isDark ? '#E5EDFF' : '#111827';

  return {
    color: ['#6A7BFF', '#39E67A', '#72E3FF', '#FF5E7A', '#FFC857', '#B37BFF'],
    tooltip: {
      trigger: 'item',
      backgroundColor: tooltipBackground,
      borderColor: tooltipBorder,
      borderWidth: 1,
      textStyle: {
        color: tooltipTextColor,
      },
      formatter: '{b}: {c} 个 ({d}%)',
    },
    legend: {
      type: 'scroll',
      orient: 'horizontal',
      bottom: '8px',
      left: 'center',
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 12,
      textStyle: {
        fontSize: 12,
        color: legendTextColor,
      },
      pageButtonPosition: 'end',
      pageIconSize: 12,
      pageTextStyle: {
        fontSize: 12,
        color: legendTextColor,
      },
      pageFormatter: '{current}/{total}',
    },
    series: [
      {
        name: '设备数量',
        type: 'pie',
        radius: ['40%', '62%'],
        center: ['50%', '40%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 12,
          borderWidth: 0,
          shadowBlur: 10,
          shadowColor: 'rgba(106, 123, 255, 0.25)',
        },
        label: {
          show: false,
        },
        emphasis: {
          scale: true,
          scaleSize: 8,
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: emphasisLabelColor,
          },
          itemStyle: {
            shadowBlur: 16,
            shadowOffsetX: 0,
            shadowColor: 'rgba(114, 227, 255, 0.45)',
          },
        },
        labelLine: {
          show: false,
        },
        data,
      },
    ],
  };
}
