import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';

export class SE1_BS {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      this.header = new HeaderChunk(this._io, this, this._root);
      this.lods = [];
      for (let i = 0; i < this.header.lodCount; i++) {
        this.lods.push(new SkeletonLod(this._io, this, this._root));
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_BS: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_BS(stream);
  }
}

class HeaderChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'SKEL') {
      throw new Error(`Invalid magic bytes: expected 'SKEL', got '${magicStr}'`);
    }
    this.version = this._io.readU4le();
    this.lodCount = this._io.readU4le();
  }
}

class SkeletonLod {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.sourceFile = new CTString(this._io, this, this._root);
    this.maxDistance = this._io.readF4le();
    this.boneCount = this._io.readU4le();
    this.bones = [];
    for (let i = 0; i < this.boneCount; i++) {
      this.bones.push(new SkeletonBone(this._io, this, this._root));
    }
  }
}

class SkeletonBone {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.parentId = new CTString(this._io, this, this._root);
    this.absolutePlacementMatrix = [];
    for (let i = 0; i < 12; i++) {
      this.absolutePlacementMatrix.push(this._io.readF4le());
    }
    this.absolutePlacementQVect = new QVect(this._io, this, this._root);
    this.offsetLength = this._io.readF4le();
    this.boneLength = this._io.readF4le();
  }
}

class QVect {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.pos = new Float3D(this._io, this, this._root);
    this.w = this._io.readF4le();
    this.x = this._io.readF4le();
    this.y = this._io.readF4le();
    this.z = this._io.readF4le();
  }
}

class Float3D {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.x = this._io.readF4le();
    this.y = this._io.readF4le();
    this.z = this._io.readF4le();
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
    this.len = this._io.readU4le();
    this.data = this._io.readBytes(this.len);
    this.value = new TextDecoder('ascii').decode(this.data);
  }
}