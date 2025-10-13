/// <reference types="node" />
export declare function remove0x(input: string): string;
export declare function ensure0xb32(input: string): string;
export declare function ensure0x(input: string | Buffer): string;
export declare function toHexString(input: bigint): string;
export declare function hexToBuf(input: string): Buffer;
export declare function prefixBuf(inputBuffer: Buffer, prefixHexString: string): Buffer;
export declare function stringToUTF8Hex(input: string): string;
