import KaitaiStream from 'kaitai-struct/KaitaiStream.js';

export class SE1_FNT {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      this.magic = this._io.readBytes(4);
      const magicStr = new TextDecoder().decode(this.magic);
      if (magicStr !== 'FTTF') {
        throw new Error(`Invalid magic bytes: expected 'FTTF', got '${magicStr}'`);
      }
      this.texture = new DFNM(this._io, this, this._root);
      this.charWidth = this._io.readU4le();
      this.charHeight = this._io.readU4le();
      this.chars = [];
      for (let i = 0; i < 256; i++) {
        this.chars.push(new FontCharData(this._io, this, this._root));
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_FNT: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_FNT(stream);
  }
}

class DFNM {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'DFNM') {
      throw new Error(`Invalid DFNM magic: expected 'DFNM', got '${magicStr}'`);
    }
    this.len = this._io.readU4le();
    this.data = this._io.readBytes(this.len);
    this.value = new TextDecoder('ascii').decode(this.data);
  }
}

class FontCharData {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.offsetX = this._io.readU4le();
    this.offsetY = this._io.readU4le();
    this.startX = this._io.readU4le();
    this.startY = this._io.readU4le();
  }
}