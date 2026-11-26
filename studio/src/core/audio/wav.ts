/**
 * قراءة وكتابة WAV PCM 16-بت (S4.5).
 * القراءة صارمة: ترفض أي ملف لا يطابق الترويسة المتوقعة بدل أن تُنتج صمتاً مضلّلاً.
 */
export interface WavData {
  readonly sampleRate: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly frameCount: number;
  /** قناة واحدة لكل إطار (mono) أو مزيج تختاره الطبقة العليا. */
  readonly samples: Float32Array;
}

export class WavError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WavError';
  }
}

export function decodeWav(buffer: ArrayBuffer | Uint8Array): WavData {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (offset: number, length: number): string =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));

  if (bytes.byteLength < 44) throw new WavError('ملف WAV أقصر من ترويسة صالحة');
  if (ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WAVE') throw new WavError('ملف ليس WAV');

  let offset = 12;
  let sampleRate = 0;
  let channels = 0;
  let bitsPerSample = 0;
  let dataOffset = -1;
  let dataLength = 0;

  while (offset + 8 <= bytes.byteLength) {
    const chunkId = ascii(offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (chunkId === 'fmt ') {
      const format = view.getUint16(body, true);
      if (format !== 1) throw new WavError(`صيغة WAV غير مدعومة: ${format}`);
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bitsPerSample = view.getUint16(body + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = body;
      dataLength = Math.min(chunkSize, bytes.byteLength - body);
    }
    offset = body + chunkSize + (chunkSize % 2);
  }

  if (dataOffset < 0) throw new WavError('ملف WAV بلا مقطع بيانات');
  if (bitsPerSample !== 16) throw new WavError(`عمق بتات غير مدعوم: ${bitsPerSample}`);
  if (channels < 1 || sampleRate <= 0) throw new WavError('ترويسة WAV ناقصة');

  const frameCount = Math.floor(dataLength / (2 * channels));
  const samples = new Float32Array(frameCount * channels);
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = view.getInt16(dataOffset + index * 2, true) / 32_768;
  }

  return { sampleRate, channels, bitsPerSample, frameCount, samples };
}

export function encodeWav(samples: Float32Array, sampleRate: number, channels = 1): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * channels * 2, true);
  view.setUint16(32, channels * 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(44 + index * 2, Math.round(value * 32_767), true);
  }
  return new Uint8Array(buffer);
}
