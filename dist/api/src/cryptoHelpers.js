"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringToUTF8Hex = exports.prefixBuf = exports.hexToBuf = exports.toHexString = exports.ensure0x = exports.ensure0xb32 = exports.remove0x = void 0;
function remove0x(input) {
    if (input.startsWith('0x')) {
        input = input.substring(2);
    }
    // console.log("remove0x input:", input);
    // we prepent a 0 if the string is missing a hex digit.
    if (input.length % 2 != 0) {
        // console.log("prepending 0 to hex string:", input);
        return '0' + input;
    }
    return input;
}
exports.remove0x = remove0x;
function ensure0xb32(input) {
    let buf = hexToBuf(input);
    //let buf = new Buffer() 
    //while (buf.length < 32) {
    if (buf.length > 32) {
        // maybe the buffer starts with 0 ?
        throw Error("Hex strings greater then 32 byte are not supported");
    }
    let prefix = Buffer.alloc(32 - buf.length, 0);
    let resultBuf = Buffer.concat([prefix, buf]);
    //console.log("resultBuf:", resultBuf.toString('hex'));
    //console.log("result:", ensure0x(resultBuf));
    return ensure0x(resultBuf);
}
exports.ensure0xb32 = ensure0xb32;
function ensure0x(input) {
    if (input instanceof Buffer) {
        input = input.toString('hex');
    }
    if (!input.startsWith('0x')) {
        return '0x' + input;
    }
    return input;
}
exports.ensure0x = ensure0x;
function toHexString(input) {
    return '0x' + input.toString(16);
}
exports.toHexString = toHexString;
function hexToBuf(input) {
    if (input == null) {
        return Buffer.alloc(0);
    }
    return Buffer.from(remove0x(input), 'hex');
}
exports.hexToBuf = hexToBuf;
// appends a prefix to inputBuffer.
function prefixBuf(inputBuffer, prefixHexString) {
    const prefix = hexToBuf(prefixHexString);
    return Buffer.concat([prefix, inputBuffer]);
}
exports.prefixBuf = prefixBuf;
function stringToUTF8Hex(input) {
    return ensure0x(Buffer.from(input, 'utf8'));
}
exports.stringToUTF8Hex = stringToUTF8Hex;
