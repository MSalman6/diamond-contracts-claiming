export function remove0x(input: string) {
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

export function ensure0xb32(input: string) : string {

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

export function ensure0x(input: string | Buffer) {

  if (input instanceof Buffer) {
    input = input.toString('hex');
  }

  if (!input.startsWith('0x')) {
    return '0x' + input;
  }
  return input;
}

export function toHexString(input: bigint) {
  return '0x' + input.toString(16);
}

export function hexToBuf(input: string): Buffer {
  if (input == null) {
    return Buffer.alloc(0);
  }

  return Buffer.from(remove0x(input), 'hex');
}

// appends a prefix to inputBuffer.
export function prefixBuf(inputBuffer: Buffer, prefixHexString: string) {
  const prefix = hexToBuf(prefixHexString);
  return Buffer.concat([prefix, inputBuffer]);
}


export function stringToUTF8Hex(input: string): string {
  return ensure0x(Buffer.from(input, 'utf8'));
}
