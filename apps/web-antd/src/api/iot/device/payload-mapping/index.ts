import { requestClient } from '#/api/request';

export namespace IotDevicePayloadMappingApi {
  export interface Mapping {
    id?: number;
    deviceId: number;
    channelKey: string;
    thingModelIdentifier: string;
    clBitIndex?: number;
    formula?: string;
    zeroOffset?: number;
    direction: number; // 0上行 1下行 2双向
    enabled: boolean;
    createTime?: Date;
  }
}

/** 按设备查询映射列表 */
export function getPayloadMappingListByDevice(deviceId: number) {
  return requestClient.get<IotDevicePayloadMappingApi.Mapping[]>(
    '/iot/device-payload-mapping/list-by-device',
    { params: { deviceId } },
  );
}

/** 新增映射 */
export function createPayloadMapping(data: IotDevicePayloadMappingApi.Mapping) {
  return requestClient.post<number>('/iot/device-payload-mapping/create', data);
}

/** 更新映射 */
export function updatePayloadMapping(data: IotDevicePayloadMappingApi.Mapping) {
  return requestClient.put<boolean>('/iot/device-payload-mapping/update', data);
}

/** 删除映射 */
export function deletePayloadMapping(id: number) {
  return requestClient.delete<boolean>('/iot/device-payload-mapping/delete', {
    params: { id },
  });
}
