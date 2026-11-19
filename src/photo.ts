async function resize(file: Blob, max: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('이미지 변환 실패'))), 'image/jpeg', quality),
  );
}

export async function processPhoto(file: Blob) {
  const [blob, thumb] = await Promise.all([resize(file, 1600, 0.85), resize(file, 320, 0.8)]);
  return { blob, thumb };
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(b);
  });
}

export async function dataUrlToBlob(u: string): Promise<Blob> {
  return (await fetch(u)).blob();
}
