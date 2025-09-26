import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export interface CompressibleFile {
  data: Buffer;
  size: number;
  mimeType: string;
  fileName: string;
  compressed?: boolean;
  compression?: {
    algorithm: string;
    ratio: number;
    originalSize: number;
  };
}

export async function compress(file: CompressibleFile): Promise<CompressibleFile> {
  if (file.compressed) {
    return file;
  }

  const compressedData = await gzipAsync(file.data);

  if (compressedData.byteLength >= file.size) {
    return {
      ...file,
      compression: {
        algorithm: 'gzip',
        ratio: 1,
        originalSize: file.size
      }
    };
  }

  return {
    ...file,
    data: compressedData,
    size: compressedData.byteLength,
    compressed: true,
    compression: {
      algorithm: 'gzip',
      ratio: Number((compressedData.byteLength / file.size).toFixed(4)),
      originalSize: file.size
    }
  };
}
