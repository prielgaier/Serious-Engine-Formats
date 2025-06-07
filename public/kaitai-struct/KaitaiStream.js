// Simplified KaitaiStream implementation for browser use
// This is a minimal implementation - in production you'd use the full kaitai-struct library

class KaitaiStream {
  constructor(buffer) {
    if (buffer instanceof ArrayBuffer) {
      this._buffer = buffer;
      this._dataView = new DataView(buffer);
      this._uint8Array = new Uint8Array(buffer);
    } else if (buffer instanceof Uint8Array) {
      this._buffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      this._dataView = new DataView(this._buffer);
      this._uint8Array = new Uint8Array(this._buffer);
    } else {
      throw new Error('KaitaiStream constructor requires ArrayBuffer or Uint8Array');
    }
    
    this._pos = 0;
  }

  get pos() {
    return this._pos;
  }

  get size() {
    return this._buffer.byteLength;
  }

  seek(pos) {
    this._pos = pos;
  }

  isEof() {
    return this._pos >= this._buffer.byteLength;
  }

  readU1() {
    if (this._pos >= this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    return this._uint8Array[this._pos++];
  }

  readS1() {
    const val = this.readU1();
    return val > 127 ? val - 256 : val;
  }

  readU2le() {
    if (this._pos + 2 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getUint16(this._pos, true);
    this._pos += 2;
    return val;
  }

  readS2le() {
    if (this._pos + 2 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getInt16(this._pos, true);
    this._pos += 2;
    return val;
  }

  readU4le() {
    if (this._pos + 4 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getUint32(this._pos, true);
    this._pos += 4;
    return val;
  }

  readS4le() {
    if (this._pos + 4 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getInt32(this._pos, true);
    this._pos += 4;
    return val;
  }

  readF4le() {
    if (this._pos + 4 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getFloat32(this._pos, true);
    this._pos += 4;
    return val;
  }

  readF8le() {
    if (this._pos + 8 > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const val = this._dataView.getFloat64(this._pos, true);
    this._pos += 8;
    return val;
  }

  readBytes(len) {
    if (this._pos + len > this._buffer.byteLength) {
      throw new Error('End of stream reached');
    }
    const result = this._uint8Array.slice(this._pos, this._pos + len);
    this._pos += len;
    return result;
  }

  readBytesFull() {
    return this.readBytes(this._buffer.byteLength - this._pos);
  }
}

// Export for ES modules
export default KaitaiStream;

// Also make it available globally for compatibility
if (typeof window !== 'undefined') {
  window.KaitaiStream = KaitaiStream;
}