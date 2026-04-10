interface TiandituGeoLocation {
  lat?: number | string;
  lon?: number | string;
}

interface TiandituSearchPoi {
  lonlat?: string;
  address?: string;
  name?: string;
}

interface TiandituGeocodeResponse {
  location?: TiandituGeoLocation;
  result?: {
    formatted_address?: string;
    addressComponent?: {
      address?: string;
    };
  };
}

interface TiandituSearchResponse {
  pois?: TiandituSearchPoi[];
}

interface TiandituSearchOption {
  name: string;
  value: string;
}

interface TiandituSearchParams {
  mapBound?: string;
  level?: number;
}

const TDT_GEOCODER_URL = 'https://api.tianditu.gov.cn/geocoder';
const TDT_SEARCH_URL = 'https://api.tianditu.gov.cn/v2/search';

const TDT_REQUEST_TIMEOUT = 10_000;
const DEFAULT_MAP_BOUND = '-180,-90,180,90';
const DEFAULT_LEVEL = 12;

function toNumber(value: number | string | undefined): number | undefined {
  if (value == null || value === '') {
    return undefined;
  }
  const result = Number(value);
  return Number.isFinite(result) ? result : undefined;
}

function createRequestUrl(baseUrl: string, params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return `${baseUrl}?${searchParams.toString()}`;
}

// 天地图 REST 请求封装：统一处理超时、HTTP 状态码与错误信息。
async function tiandituRequest<T>(
  baseUrl: string,
  params: Record<string, string>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    TDT_REQUEST_TIMEOUT,
  );

  try {
    const requestUrl = createRequestUrl(baseUrl, params);
    const response = await fetch(requestUrl, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`天地图服务请求失败(${response.status})`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('天地图服务请求超时');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// 关键词搜索：对应天地图 search2（v2/search）接口。
export async function searchLocationByKeyword(
  keyword: string,
  tk: string,
  options: TiandituSearchParams = {},
) {
  const trimmedKeyword = keyword.trim();
  if (!trimmedKeyword) {
    return [] as TiandituSearchOption[];
  }

  const postStr = JSON.stringify({
    keyWord: trimmedKeyword,
    mapBound: options.mapBound || DEFAULT_MAP_BOUND,
    level: options.level || DEFAULT_LEVEL,
    queryType: 1,
    start: 0,
    count: 10,
  });

  const data = await tiandituRequest<TiandituSearchResponse>(TDT_SEARCH_URL, {
    postStr,
    type: 'query',
    tk,
  });
  const pois = data.pois || [];

  return pois
    .map((poi) => {
      const lonLat = poi.lonlat || '';
      const [longitude, latitude] = lonLat.split(',');
      const lng = toNumber(longitude);
      const lat = toNumber(latitude);
      if (lng == null || lat == null) {
        return null;
      }
      return {
        name: poi.name || poi.address || trimmedKeyword,
        value: `${lng},${lat}`,
      } as TiandituSearchOption;
    })
    .filter((item): item is TiandituSearchOption => item !== null);
}

// 逆地理编码：经纬度转地址，使用 geocoder 接口。
export async function reverseGeocodeByLocation(
  longitude: number,
  latitude: number,
  tk: string,
) {
  const postStr = JSON.stringify({
    lon: longitude,
    lat: latitude,
    ver: 1,
  });

  const data = await tiandituRequest<TiandituGeocodeResponse>(TDT_GEOCODER_URL, {
    postStr,
    type: 'geocode',
    tk,
  });

  return (
    data.result?.formatted_address ||
    data.result?.addressComponent?.address ||
    ''
  );
}
