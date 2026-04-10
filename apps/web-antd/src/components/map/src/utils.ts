interface TianDiTuLoaderOptions {
  tk?: string;
  timeout?: number;
}

declare global {
  interface Window {
    T: any;
  }
}

let tianDiTuLoadPromise: null | Promise<void> = null;

/**
 * 加载天地图 JS SDK
 */
export const loadTianDiTuMapSdk = ({
  tk = import.meta.env.VITE_TIANDITU_TK,
  timeout = 10_000,
}: TianDiTuLoaderOptions = {}): Promise<void> => {
  if (window.T) {
    return Promise.resolve();
  }
  if (!tk) {
    return Promise.reject(new Error('天地图 TK 未配置'));
  }
  if (tianDiTuLoadPromise) {
    return tianDiTuLoadPromise;
  }

  tianDiTuLoadPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      tianDiTuLoadPromise = null;
      reject(new Error('天地图 SDK 加载超时'));
    }, timeout);

    const script = document.createElement('script');
    script.src = `https://api.tianditu.gov.cn/api?v=4.0&tk=${tk}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => {
      clearTimeout(timeoutId);
      resolve();
    });
    script.addEventListener('error', () => {
      clearTimeout(timeoutId);
      tianDiTuLoadPromise = null;
      reject(new Error('天地图 SDK 加载失败'));
    });
    document.body.append(script);
  });

  return tianDiTuLoadPromise;
};
