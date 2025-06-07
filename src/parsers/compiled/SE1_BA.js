import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';

export class SE1_BA {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      // Read header
      this.header = new HeaderChunk(this._io, this, this._root);
      
      // Read animations
      this.lods = [];
      for (let i = 0; i < this.header.animCount; i++) {
        this.lods.push(new BoneAnimation(this._io, this, this._root));
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_BA: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_BA(stream);
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
    if (magicStr !== 'ANIM') {
      throw new Error(`Invalid magic bytes: expected 'ANIM', got '${magicStr}'`);
    }
    this.version = this._io.readU4le();
    this.animCount = this._io.readU4le();
  }
}

class BoneAnimation {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.sourceFile = new CTString(this._io, this, this._root);
    this.id = new CTString(this._io, this, this._root);
    this.secsPerFrame = this._io.readF4le();
    this.frameCount = this._io.readU4le();
    this.threshold = this._io.readF4le();
    this.isCompressed = this._io.readU4le();
    this.isCustomSpeed = this._io.readU4le();
    this.boneEnvelopeCount = this._io.readU4le();
    
    this.boneEnvelopes = [];
    for (let i = 0; i < this.boneEnvelopeCount; i++) {
      this.boneEnvelopes.push(new BoneEnvelope(this._io, this, this._root));
    }
    
    this.morphEnvelopeCount = this._io.readU4le();
    this.morphEnvelopes = [];
    for (let i = 0; i < this.morphEnvelopeCount; i++) {
      this.morphEnvelopes.push(new MorphEnvelope(this._io, this, this._root));
    }
  }
}

class BoneEnvelope {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.defaultPosM12 = [];
    for (let i = 0; i < 12; i++) {
      this.defaultPosM12.push(this._io.readF4le());
    }
    this.positionCount = this._io.readU4le();
    this.positions = [];
    for (let i = 0; i < this.positionCount; i++) {
      this.positions.push(new AnimPos(this._io, this, this._root));
    }
    this.rotationCount = this._io.readU4le();
    this.rotations = [];
    for (let i = 0; i < this.rotationCount; i++) {
      this.rotations.push(this._io.readBytes(20));
    }
    this.offsetLength = this._io.readF4le();
  }
}

class AnimPos {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.frameNumber = this._io.readU2le();
    this.x = this._io.readF4le();
    this.y = this._io.readF4le();
    this.z = this._io.readF4le();
    this.pad = this._io.readBytes(2);
  }
}

class MorphEnvelope {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.factorCount = this._io.readU4le();
    this.factors = [];
    for (let i = 0; i < this.factorCount; i++) {
      this.factors.push(this._io.readF4le());
    }
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