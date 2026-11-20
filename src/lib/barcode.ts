import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';

// 바코드 해독 파일(wasm)은 페이지 옆에 함께 올린 파일에서 받는다
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) =>
      path.endsWith('.wasm') ? new URL('zxing_reader.wasm', document.baseURI).href : prefix + path,
  },
});

let detector: BarcodeDetector | undefined;

/** 사진 속 상품 바코드를 기기에서 읽는다. 못 찾거나 해독기를 못 불러오면 undefined */
export async function readBarcode(image: Blob): Promise<string | undefined> {
  try {
    detector ??= new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    const bmp = await createImageBitmap(image);
    try {
      const found = await detector.detect(bmp);
      return found[0]?.rawValue;
    } finally {
      bmp.close();
    }
  } catch (e) {
    console.warn('barcode', e);
    return undefined;
  }
}
