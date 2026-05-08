import { buildWpmzFiles } from "./build.js";
import { parseWpmzFiles } from "./parse.js";
import type { BuildOptions } from "./build.js";
import type { WpmzDocument, WpmzFiles } from "./types.js";
import { unzipEntries, zipEntries } from "./zip.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export class WpmzFileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "WpmzFileError";
  }
}

export function readWpmzKmz(input: Uint8Array): WpmzDocument {
  const entries = unzipEntries(input);
  const templateBytes = firstEntry(
    entries,
    "wpmz/template.kml",
    "template.kml",
  );
  const waylinesBytes = firstEntry(
    entries,
    "wpmz/waylines.wpml",
    "waylines.wpml",
  );
  if (!templateBytes) {
    throw new WpmzFileError("KMZ is missing template.kml");
  }
  if (!waylinesBytes) {
    throw new WpmzFileError("KMZ is missing waylines.wpml");
  }
  return parseWpmzFiles({
    templateKml: textDecoder.decode(templateBytes),
    waylinesWpml: textDecoder.decode(waylinesBytes),
  });
}

export function buildWpmzKmz(
  document: WpmzDocument,
  options: BuildOptions = {},
): Uint8Array {
  const files = buildWpmzFiles(document, options);
  return zipWpmzFiles(files);
}

export function zipWpmzFiles(files: WpmzFiles): Uint8Array {
  return zipEntries({
    "wpmz/template.kml": textEncoder.encode(files.templateKml),
    "wpmz/waylines.wpml": textEncoder.encode(files.waylinesWpml),
  });
}

export function unzipWpmzFiles(input: Uint8Array): WpmzFiles {
  const entries = unzipEntries(input);
  const templateBytes = firstEntry(
    entries,
    "wpmz/template.kml",
    "template.kml",
  );
  const waylinesBytes = firstEntry(
    entries,
    "wpmz/waylines.wpml",
    "waylines.wpml",
  );
  if (!templateBytes) {
    throw new WpmzFileError("KMZ is missing template.kml");
  }
  if (!waylinesBytes) {
    throw new WpmzFileError("KMZ is missing waylines.wpml");
  }
  return {
    templateKml: textDecoder.decode(templateBytes),
    waylinesWpml: textDecoder.decode(waylinesBytes),
  };
}

function firstEntry(
  entries: Record<string, Uint8Array>,
  ...names: readonly string[]
): Uint8Array | undefined {
  for (const name of names) {
    const entry = entries[name];
    if (entry) return entry;
  }
  return undefined;
}
