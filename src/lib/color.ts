export type RGB = { r: number; g: number; b: number };

function pivotRgb(v: number) {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function rgbToLab({ r, g, b }: RGB) {
  const R = pivotRgb(r), G = pivotRgb(g), B = pivotRgb(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = (R * 0.2126 + G * 0.7152 + B * 0.0722);
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116;
  const fx = f(x), fy = f(y), fz = f(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function colorDistance(a: RGB, b: RGB) {
  const x = rgbToLab(a), y = rgbToLab(b);
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b);
}

export function sampleGrid(video: HTMLVideoElement): RGB[] {
  const canvas = document.createElement('canvas');
  const size = Math.min(video.videoWidth, video.videoHeight);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

  // Match the visible guide: it is inset 12%, so sample the center of each guide cell.
  const points = [0.12 + 0.76 / 6, 0.5, 0.88 - 0.76 / 6];
  const samples: RGB[] = [];
  const radius = Math.max(3, Math.floor(size / 40));
  for (const py of points) {
    for (const px of points) {
      const x = Math.floor(px * size);
      const y = Math.floor(py * size);
      const data = ctx.getImageData(x - radius, y - radius, radius * 2 + 1, radius * 2 + 1).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      samples.push({ r: r / n, g: g / n, b: b / n });
    }
  }
  return samples;
}
