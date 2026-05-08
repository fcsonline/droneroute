declare module "node:zlib" {
  export function deflateRawSync(input: Uint8Array): Uint8Array;
  export function inflateRawSync(input: Uint8Array): Uint8Array;
}

declare module "node:fs" {
  export function readFileSync(path: string): Uint8Array;
  export function writeFileSync(path: string, data: string | Uint8Array): void;
}

declare const process: {
  readonly argv: readonly string[];
};
