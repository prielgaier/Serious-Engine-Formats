import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';

export class SE1_MDL {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      this.header = new HeaderChunk(this._io, this, this._root);
      this.chunkId = this._io.readBytes(4);
      const chunkIdStr = new TextDecoder().decode(this.chunkId);
      
      if (chunkIdStr === 'AFVX') {
        this.vertices = new AFVXChunk(this._io, this, this._root);
      } else if (chunkIdStr === 'AV17') {
        this.vertices = new AV17Chunk(this._io, this, this._root);
      }
      
      this.frameInfos = new AFINChunk(this._io, this, this._root);
      this.mainMipVertices = new AMMVChunk(this._io, this, this._root);
      this.mipMasks = new AVMKChunk(this._io, this, this._root);
      this.mipCount = new IMIPChunk(this._io, this, this._root);
      this.mipFactors = new FMIPChunk(this._io, this, this._root);
      
      // Read remaining data (simplified for brevity)
      this.modelMipInfos = [];
      for (let i = 0; i < this.mipCount.count; i++) {
        this.modelMipInfos.push(new ModelMipInfo(this._io, this, this._root));
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_MDL: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_MDL(stream);
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
    if (magicStr !== 'MDAT') {
      throw new Error(`Invalid magic bytes: expected 'MDAT', got '${magicStr}'`);
    }
    this.version = new ChunkId(this._io, this, this._root);
    this.flags = new MdlFlags(this._io, this, this._root);
    this.vtxCount = new IVTXChunk(this._io, this, this._root);
    this.frameCount = new IFRMChunk(this._io, this, this._root);
  }
}

class ChunkId {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.value = this._io.readBytes(4);
    this.valueStr = new TextDecoder().decode(this.value);
  }
}

class MdlFlags {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.raw = this._io.readU4le();
  }

  get faceForward() {
    return (this.raw & (1 << 0)) !== 0;
  }

  get reflections() {
    return (this.raw & (1 << 1)) !== 0;
  }

  get reflectionsHalf() {
    return (this.raw & (1 << 2)) !== 0;
  }

  get halfFaceForward() {
    return (this.raw & (1 << 3)) !== 0;
  }

  get compressed16bit() {
    return (this.raw & (1 << 4)) !== 0;
  }

  get stretchDetail() {
    return (this.raw & (1 << 5)) !== 0;
  }
}

class IVTXChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'IVTX') {
      throw new Error(`Invalid IVTX magic: expected 'IVTX', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.value = this._io.readU4le();
  }
}

class IFRMChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'IFRM') {
      throw new Error(`Invalid IFRM magic: expected 'IFRM', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.value = this._io.readU4le();
  }
}

class AFVXChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.size = this._io.readU4le();
    const vertexCount = this._root.header.vtxCount.value * this._root.header.frameCount.value;
    this.data = [];
    for (let i = 0; i < vertexCount; i++) {
      this.data.push({
        x: this._io.readS1(),
        y: this._io.readS1(),
        z: this._io.readS1(),
        normIndex: this._io.readU1()
      });
    }
  }
}

class AV17Chunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.size = this._io.readU4le();
    const vertexCount = this._root.header.vtxCount.value * this._root.header.frameCount.value;
    this.data = [];
    for (let i = 0; i < vertexCount; i++) {
      this.data.push({
        x: this._io.readS2le(),
        y: this._io.readS2le(),
        z: this._io.readS2le(),
        normH: this._io.readS1(),
        normP: this._io.readS1()
      });
    }
  }
}

class AFINChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'AFIN') {
      throw new Error(`Invalid AFIN magic: expected 'AFIN', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.boxes = [];
    for (let i = 0; i < this._root.header.frameCount.value; i++) {
      this.boxes.push(new AABBox3D(this._io, this, this._root));
    }
  }
}

class AMMVChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'AMMV') {
      throw new Error(`Invalid AMMV magic: expected 'AMMV', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.vertices = [];
    for (let i = 0; i < this._root.header.vtxCount.value; i++) {
      this.vertices.push(new Float3D(this._io, this, this._root));
    }
  }
}

class AVMKChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'AVMK') {
      throw new Error(`Invalid AVMK magic: expected 'AVMK', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.masks = [];
    for (let i = 0; i < this._root.header.vtxCount.value; i++) {
      this.masks.push(this._io.readU4le());
    }
  }
}

class IMIPChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'IMIP') {
      throw new Error(`Invalid IMIP magic: expected 'IMIP', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.count = this._io.readU4le();
  }
}

class FMIPChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'FMIP') {
      throw new Error(`Invalid FMIP magic: expected 'FMIP', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.values = [];
    for (let i = 0; i < 32; i++) {
      this.values.push(this._io.readF4le());
    }
  }
}

class ModelMipInfo {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    // Simplified implementation
    this.ipol = new IPOLChunk(this._io, this, this._root);
    // Additional data would be parsed here
  }
}

class IPOLChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'IPOL') {
      throw new Error(`Invalid IPOL magic: expected 'IPOL', got '${magicStr}'`);
    }
    this.size = this._io.readU4le();
    this.count = this._io.readU4le();
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

class AABBox3D {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.a = new Float3D(this._io, this, this._root);
    this.b = new Float3D(this._io, this, this._root);
  }
}