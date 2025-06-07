import KaitaiStream from 'kaitai-struct/KaitaiStream.js';

export class SE1_BAE {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      this.header = new FileHeader(this._io, this, this._root);
      this.effects = [];
      for (let i = 0; i < this.header.count; i++) {
        this.effects.push(new Effect(this._io, this, this._root));
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_BAE: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_BAE(stream);
  }
}

class FileHeader {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'AEFF') {
      throw new Error(`Invalid magic bytes: expected 'AEFF', got '${magicStr}'`);
    }
    this.count = this._io.readU4le();
  }
}

class Effect {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'ANEF') {
      throw new Error(`Invalid effect magic: expected 'ANEF', got '${magicStr}'`);
    }
    this.version = this._io.readU1();
    this.animName = new CTString(this._io, this, this._root);
    this.groupCount = this._io.readU4le();
    this.groups = [];
    for (let i = 0; i < this.groupCount; i++) {
      this.groups.push(new EffectGroup(this._io, this, this._root));
    }
  }
}

class EffectGroup {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.name = new CTString(this._io, this, this._root);
    this.startTime = this._io.readF4le();
    this.flags = this._io.readU4le();
  }
}

class CTString {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.size = this._io.readU4le();
    this.data = this._io.readBytes(this.size);
    this.value = new TextDecoder('ascii').decode(this.data);
  }
}