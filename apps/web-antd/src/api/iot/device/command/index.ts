import { requestClient } from '#/api/request';

export namespace IotDeviceCommandApi {
  export interface DeviceCommand {
    id?: number;
    deviceId: number;
    name: string;
    template: string;
    sort?: number;
    createTime?: string;
  }
}

export function getDeviceCommandList(deviceId: number) {
  return requestClient.get<IotDeviceCommandApi.DeviceCommand[]>(
    '/iot/device-command/list',
    { params: { deviceId } },
  );
}

export function createDeviceCommand(
  data: IotDeviceCommandApi.DeviceCommand,
) {
  return requestClient.post('/iot/device-command/create', data);
}

export function updateDeviceCommand(
  data: IotDeviceCommandApi.DeviceCommand,
) {
  return requestClient.put('/iot/device-command/update', data);
}

export function deleteDeviceCommand(id: number) {
  return requestClient.delete(`/iot/device-command/delete?id=${id}`);
}

export function updateDeviceCommandSort(ids: number[]) {
  return requestClient.put('/iot/device-command/update-sort', ids);
}
