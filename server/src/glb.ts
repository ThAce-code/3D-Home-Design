import fs from 'node:fs/promises';

const GLB_MAGIC = 0x46546C67; // "glTF" in little-endian
const GLB_VERSION = 2;
const HEADER_SIZE = 12;

export interface GlbValidation {
  valid: boolean;
  error?: string;
}

/**
 * 校验 GLB 文件 header：
 * - magic: 0x46546C67
 * - version: 2
 * - length == 实际文件大小
 */
export async function validateGlb(filePath: string): Promise<GlbValidation> {
  const fd = await fs.open(filePath, 'r');
  try {
    const stat = await fd.stat();
    if (stat.size < HEADER_SIZE) {
      return { valid: false, error: 'File too small to be a valid GLB' };
    }

    const buf = Buffer.alloc(HEADER_SIZE);
    await fd.read(buf, 0, HEADER_SIZE, 0);

    const magic = buf.readUInt32LE(0);
    if (magic !== GLB_MAGIC) {
      return { valid: false, error: `Invalid magic: 0x${magic.toString(16)}` };
    }

    const version = buf.readUInt32LE(4);
    if (version !== GLB_VERSION) {
      return { valid: false, error: `Unsupported version: ${version}` };
    }

    const length = buf.readUInt32LE(8);
    if (length !== stat.size) {
      return { valid: false, error: `Length mismatch: header says ${length}, file is ${stat.size}` };
    }

    return { valid: true };
  } finally {
    await fd.close();
  }
}
