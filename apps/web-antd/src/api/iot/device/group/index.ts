import type { PageParam, PageResult } from '@vben/request';

import { requestClient } from '#/api/request';

export namespace IotDeviceGroupApi {
  /** 站点（设备分组） */
  export interface DeviceGroup {
    id?: number; // 站点 ID
    name: string; // 站点名称
    status?: number; // 站点状态
    description?: string; // 站点描述
    regionId?: number; // 所在地区编号
    longitude?: number; // 站点经度
    latitude?: number; // 站点纬度
    altitude?: number; // 站点海拔（米）
    deviceCount?: number; // 设备数量
  }
}

/** 查询站点分页 */
export function getDeviceGroupPage(params: PageParam) {
  return requestClient.get<PageResult<IotDeviceGroupApi.DeviceGroup>>(
    '/iot/device-group/page',
    { params },
  );
}

/** 查询站点详情 */
export function getDeviceGroup(id: number) {
  return requestClient.get<IotDeviceGroupApi.DeviceGroup>(
    `/iot/device-group/get?id=${id}`,
  );
}

/** 新增站点 */
export function createDeviceGroup(data: IotDeviceGroupApi.DeviceGroup) {
  return requestClient.post('/iot/device-group/create', data);
}

/** 修改站点 */
export function updateDeviceGroup(data: IotDeviceGroupApi.DeviceGroup) {
  return requestClient.put('/iot/device-group/update', data);
}

/** 删除站点 */
export function deleteDeviceGroup(id: number) {
  return requestClient.delete(`/iot/device-group/delete?id=${id}`);
}

/** 获取站点精简信息列表 */
export function getSimpleDeviceGroupList() {
  return requestClient.get<IotDeviceGroupApi.DeviceGroup[]>(
    '/iot/device-group/simple-list',
  );
}
