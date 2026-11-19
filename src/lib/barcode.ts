import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// wasm을 CDN이 아니라 우리 사이트에서 받아오게 해서 오프라인에서도 동작
prepareZXingModule({
  overrides: {
    locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
});

let detector: BarcodeDetector | undefined;

/** 사진 속 상품 바코드(EAN/UPC 등)를 읽는다. 없으면 undefined */
export async function readBarcode(image: Blob): Promise<string | undefined> {
  detector ??= new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
  const bmp = await createImageBitmap(image);
  try {
    const found = await detector.detect(bmp);
    return found[0]?.rawValue;
  } finally {
    bmp.close();
  }
}
