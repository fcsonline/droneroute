import { deflateRawSync, inflateRawSync } from "node:zlib";

const LOCAL_FILE_HEADER = 0x04034b50;
const CENTRAL_DIRECTORY_HEADER = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const UTF8_FLAG = 0x0800;
const METHOD_STORE = 0;
const METHOD_DEFLATE = 8;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class ZipError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ZipError";
  }
}

export type ZipEntries = Readonly<Record<string, Uint8Array>>;

export function unzipEntries(input: Uint8Array): Record<string, Uint8Array> {
  const data = ensureUint8Array(input);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  const totalEntries = readU16(view, eocdOffset + 10);
  const centralDirectoryOffset = readU32(view, eocdOffset + 16);
  const out: Record<string, Uint8Array> = {};
  let ptr = centralDirectoryOffset;

  for (let i = 0; i < totalEntries; i += 1) {
    expectSignature(
      view,
      ptr,
      CENTRAL_DIRECTORY_HEADER,
      "central directory file header",
    );
    const method = readU16(view, ptr + 10);
    const compressedSize = readU32(view, ptr + 20);
    const uncompressedSize = readU32(view, ptr + 24);
    const fileNameLength = readU16(view, ptr + 28);
    const extraLength = readU16(view, ptr + 30);
    const commentLength = readU16(view, ptr + 32);
    const localHeaderOffset = readU32(view, ptr + 42);
    const fileNameBytes = data.subarray(ptr + 46, ptr + 46 + fileNameLength);
    const fileName = textDecoder.decode(fileNameBytes);

    expectSignature(
      view,
      localHeaderOffset,
      LOCAL_FILE_HEADER,
      "local file header",
    );
    const localNameLength = readU16(view, localHeaderOffset + 26);
    const localExtraLength = readU16(view, localHeaderOffset + 28);
    const compressedDataStart =
      localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = data.subarray(
      compressedDataStart,
      compressedDataStart + compressedSize,
    );

    if (fileName.endsWith("/")) {
      ptr += 46 + fileNameLength + extraLength + commentLength;
      continue;
    }

    const decompressed =
      method === METHOD_STORE
        ? compressedData
        : method === METHOD_DEFLATE
          ? inflateRawSync(compressedData)
          : undefined;

    if (!decompressed)
      throw new ZipError(
        `Unsupported ZIP compression method ${method} for ${fileName}`,
      );
    if (decompressed.byteLength !== uncompressedSize) {
      throw new ZipError(
        `Unexpected uncompressed size for ${fileName}: got ${decompressed.byteLength}, expected ${uncompressedSize}`,
      );
    }
    out[fileName] = new Uint8Array(decompressed);
    ptr += 46 + fileNameLength + extraLength + commentLength;
  }

  return out;
}

export function zipEntries(entries: ZipEntries): Uint8Array {
  const fileRecords: FileRecord[] = [];
  const localParts: Uint8Array[] = [];
  let offset = 0;

  for (const [name, content] of Object.entries(entries)) {
    const nameBytes = textEncoder.encode(name);
    const source = ensureUint8Array(content);
    const compressed = deflateRawSync(source);
    const crc = crc32(source);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    writeU32(view, 0, LOCAL_FILE_HEADER);
    writeU16(view, 4, 20);
    writeU16(view, 6, UTF8_FLAG);
    writeU16(view, 8, METHOD_DEFLATE);
    writeU16(view, 10, 0);
    writeU16(view, 12, 0);
    writeU32(view, 14, crc);
    writeU32(view, 18, compressed.byteLength);
    writeU32(view, 22, source.byteLength);
    writeU16(view, 26, nameBytes.length);
    writeU16(view, 28, 0);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, new Uint8Array(compressed));
    fileRecords.push({
      name,
      nameBytes,
      crc,
      compressedSize: compressed.byteLength,
      uncompressedSize: source.byteLength,
      localHeaderOffset: offset,
    });
    offset += localHeader.byteLength + compressed.byteLength;
  }

  const centralDirectoryOffset = offset;
  const centralParts: Uint8Array[] = [];
  for (const record of fileRecords) {
    const header = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(header.buffer);
    writeU32(view, 0, CENTRAL_DIRECTORY_HEADER);
    writeU16(view, 4, 20);
    writeU16(view, 6, 20);
    writeU16(view, 8, UTF8_FLAG);
    writeU16(view, 10, METHOD_DEFLATE);
    writeU16(view, 12, 0);
    writeU16(view, 14, 0);
    writeU32(view, 16, record.crc);
    writeU32(view, 20, record.compressedSize);
    writeU32(view, 24, record.uncompressedSize);
    writeU16(view, 28, record.nameBytes.length);
    writeU16(view, 30, 0);
    writeU16(view, 32, 0);
    writeU16(view, 34, 0);
    writeU16(view, 36, 0);
    writeU32(view, 38, 0);
    writeU32(view, 42, record.localHeaderOffset);
    header.set(record.nameBytes, 46);
    centralParts.push(header);
    offset += header.byteLength;
  }

  const centralDirectorySize = offset - centralDirectoryOffset;
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  writeU32(eocdView, 0, END_OF_CENTRAL_DIRECTORY);
  writeU16(eocdView, 4, 0);
  writeU16(eocdView, 6, 0);
  writeU16(eocdView, 8, fileRecords.length);
  writeU16(eocdView, 10, fileRecords.length);
  writeU32(eocdView, 12, centralDirectorySize);
  writeU32(eocdView, 16, centralDirectoryOffset);
  writeU16(eocdView, 20, 0);

  return concatUint8Arrays([...localParts, ...centralParts, eocd]);
}

interface FileRecord {
  readonly name: string;
  readonly nameBytes: Uint8Array;
  readonly crc: number;
  readonly compressedSize: number;
  readonly uncompressedSize: number;
  readonly localHeaderOffset: number;
}

function findEndOfCentralDirectory(view: DataView): number {
  const minOffset = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= minOffset; offset -= 1) {
    if (readU32(view, offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new ZipError("Could not find ZIP end-of-central-directory record");
}

function expectSignature(
  view: DataView,
  offset: number,
  expected: number,
  label: string,
): void {
  const actual = readU32(view, offset);
  if (actual !== expected)
    throw new ZipError(
      `Invalid ${label} signature at ${offset}: 0x${actual.toString(16)}`,
    );
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function writeU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function ensureUint8Array(input: Uint8Array): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

function concatUint8Arrays(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.byteLength;
  }
  return out;
}

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
