import { requestClient } from '#/api/request';

export namespace IotDeviceRawConfigApi {
  export interface RawProductKeyResp {
    productKey: string;
  }
}

/** 获取 raw 产品标识（productKey） */
export function getRawProductKey() {
  return requestClient.get<IotDeviceRawConfigApi.RawProductKeyResp>(
    '/iot/device/raw-config/product-key',
  );
}
