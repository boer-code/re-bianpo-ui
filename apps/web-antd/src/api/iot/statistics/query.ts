import dayjs from 'dayjs';

export const LOCAL_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export type LocalDateTimeInput = string | number | Date | dayjs.Dayjs;
export type LocalDateTimeRange = [LocalDateTimeInput, LocalDateTimeInput];

export interface DeviceMessageSummaryByDateParams {
  interval: number;
  times?: LocalDateTimeRange;
}

export interface DeviceMessageSummaryByDateQuery {
  interval: number;
  'times[0]'?: string;
  'times[1]'?: string;
}

export function formatLocalDateTime(value: LocalDateTimeInput): string {
  const date = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!date.isValid()) {
    throw new Error(`Invalid local date time: ${String(value)}`);
  }
  return date.format(LOCAL_DATE_TIME_FORMAT);
}

export function createFullDayDateTimeRange(
  start: LocalDateTimeInput,
  end: LocalDateTimeInput,
): [string, string] {
  return [
    formatLocalDateTime(dayjs(start).startOf('day')),
    formatLocalDateTime(dayjs(end).endOf('day')),
  ];
}

export function createLast7DaysDateTimeRange(
  now: LocalDateTimeInput = dayjs(),
): [string, string] {
  const today = dayjs(now);
  if (!today.isValid()) {
    throw new Error(`Invalid local date time: ${String(now)}`);
  }
  return createFullDayDateTimeRange(today.subtract(6, 'day'), today);
}

export function serializeDeviceMessageSummaryByDateParams(
  params: DeviceMessageSummaryByDateParams,
): DeviceMessageSummaryByDateQuery {
  if (!params.times) {
    return { interval: params.interval };
  }
  if (params.times.length !== 2) {
    throw new Error('Device message summary query requires exactly two times');
  }
  return {
    interval: params.interval,
    'times[0]': formatLocalDateTime(params.times[0]),
    'times[1]': formatLocalDateTime(params.times[1]),
  };
}
