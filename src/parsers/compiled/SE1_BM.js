import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';

export class SE1_BM {
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
        if (this.header.version === 11 || this.header.version === 12) {
          this.lods.push(new LodChunkOld(this._io, this, this._root));
        } else if (this.header.version === 16) {
          this.lods.push(new LodChunk(this._io, this, this._root));
        }
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_BM: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_BM(stream);
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
    if (magicStr !== 'MESH') {
      throw new Error(`Invalid magic bytes: expected 'MESH', got '${magicStr}'`);
    }
    this.version = this._io.readU4le();
    if (this.version > 12) {
      this.size = this._io.readU4le();
    }
    this.lodCount = this._io.readU4le();
  }
}

class LodChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vtxCount = this._io.readU4le();
    this.uvCount = this._io.readU4le();
    this.surfaceCount = this._io.readU4le();
    this.weightCount = this._io.readU4le();
    this.morphCount = this._io.readU4le();
    this.weightInfoCount = this._io.readU4le();
    this.sourceFile = new CTString(this._io, this, this._root);
    this.maxDistance = this._io.readF4le();
    this.flags = new LodFlags(this._io, this, this._root);
    
    // Vertices
    this.vertices = [];
    for (let i = 0; i < this.vtxCount; i++) {
      this.vertices.push(new Float3D(this._io, this, this._root));
    }
    
    // Normals
    this.normals = [];
    for (let i = 0; i < this.vtxCount; i++) {
      this.normals.push(new Float3D(this._io, this, this._root));
    }
    
    // UV Maps
    this.uvMaps = [];
    for (let i = 0; i < this.uvCount; i++) {
      this.uvMaps.push(new MeshUV(this._io, this, this._root));
    }
    
    // Surfaces
    this.surfaces = [];
    for (let i = 0; i < this.surfaceCount; i++) {
      this.surfaces.push(new MeshSurface(this._io, this, this._root));
    }
    
    // Weight Maps
    this.weightMaps = [];
    for (let i = 0; i < this.weightCount; i++) {
      this.weightMaps.push(new MeshWeightMap(this._io, this, this._root));
    }
    
    // Morph Maps
    this.morphMaps = [];
    for (let i = 0; i < this.morphCount; i++) {
      this.morphMaps.push(new MeshMorphMap(this._io, this, this._root));
    }
    
    // Weight Map Infos
    this.weightMapInfos = [];
    for (let i = 0; i < this.weightInfoCount; i++) {
      this.weightMapInfos.push(new MeshWeightMapInfo(this._io, this, this._root));
    }
  }
}

class LodChunkOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.sourceFile = new CTString(this._io, this, this._root);
    this.maxDistance = this._io.readF4le();
    this.flags = new LodFlags(this._io, this, this._root);
    this.vtxCount = this._io.readU4le();
    
    // Vertices
    this.vertices = [];
    for (let i = 0; i < this.vtxCount; i++) {
      this.vertices.push(new MeshVertexOld(this._io, this, this._root));
    }
    
    // Normals
    this.normals = [];
    for (let i = 0; i < this.vtxCount; i++) {
      this.normals.push(new MeshNormal(this._io, this, this._root));
    }
    
    // UV Maps
    this.uvCount = this._io.readU4le();
    this.uvMaps = [];
    for (let i = 0; i < this.uvCount; i++) {
      this.uvMaps.push(new MeshUVOld(this._io, this, this._root));
    }
    
    // Surfaces
    this.surfaceCount = this._io.readU4le();
    this.surfaces = [];
    for (let i = 0; i < this.surfaceCount; i++) {
      this.surfaces.push(new MeshSurfaceOld(this._io, this, this._root));
    }
    
    // Weight Maps
    this.weightCount = this._io.readU4le();
    this.weightMaps = [];
    for (let i = 0; i < this.weightCount; i++) {
      this.weightMaps.push(new MeshWeightMap(this._io, this, this._root));
    }
    
    // Morph Maps
    this.morphCount = this._io.readU4le();
    this.morphMaps = [];
    for (let i = 0; i < this.morphCount; i++) {
      this.morphMaps.push(new MeshMorphMapOld(this._io, this, this._root));
    }
  }
}

class LodFlags {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.data = this._io.readU4le();
  }

  get isHalfFaceForward() {
    return (this.data & 1) >> 0;
  }

  get isFullFaceForward() {
    return (this.data & 2) >> 1;
  }

  get isUseVertexProgram() {
    return (this.data & 4) >> 2;
  }

  get isSurfaceRelativeVertices() {
    return (this.data & 8) >> 3;
  }

  get isNormalizedWeights() {
    return (this.data & 16) >> 4;
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

class MeshVertexOld {
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
    this.dummy = this._io.readU4le();
  }
}

class MeshNormal {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.nx = this._io.readF4le();
    this.ny = this._io.readF4le();
    this.nz = this._io.readF4le();
    this.dummy = this._io.readU4le();
  }
}

class MeshUVOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.uvCoords = [];
    for (let i = 0; i < this._parent.vtxCount; i++) {
      this.uvCoords.push(new MeshUVCoord(this._io, this, this._root));
    }
  }
}

class MeshUV {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.uvCoords = [];
    for (let i = 0; i < this._parent.vtxCount; i++) {
      this.uvCoords.push(new MeshUVCoord(this._io, this, this._root));
    }
  }
}

class MeshUVCoord {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.u = this._io.readF4le();
    this.v = this._io.readF4le();
  }
}

class MeshSurfaceOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.firstVtx = this._io.readS4le();
    this.vtxCount = this._io.readU4le();
    this.triCount = this._io.readU4le();
    
    this.triangles = [];
    for (let i = 0; i < this.triCount; i++) {
      this.triangles.push(new MeshTriangleOld(this._io, this, this._root));
    }
    
    this.shaderExists = this._io.readU4le();
    if (this.shaderExists > 0) {
      this.shaderParams = new MeshShaderParams(this._io, this, this._root);
    }
  }
}

class MeshSurface {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.flags = this._io.readU4le();
    this.firstVtx = this._io.readU4le();
    this.vtxCount = this._io.readU4le();
    this.triCount = this._io.readU4le();
    
    this.triangles = [];
    for (let i = 0; i < this.triCount; i++) {
      this.triangles.push(new MeshTriangle(this._io, this, this._root));
    }
    
    this.relativeWmiCount = this._io.readU4le();
    this.relativeWmi = [];
    for (let i = 0; i < this.relativeWmiCount; i++) {
      this.relativeWmi.push(this._io.readU1());
    }
    
    this.shaderExists = this._io.readU4le();
    if (this.shaderExists > 0) {
      this.shaderParams = new MeshShaderParams(this._io, this, this._root);
    }
  }
}

class MeshTriangleOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vertices = [];
    for (let i = 0; i < 3; i++) {
      this.vertices.push(this._io.readU4le());
    }
  }
}

class MeshTriangle {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vertices = [];
    for (let i = 0; i < 3; i++) {
      this.vertices.push(this._io.readU2le());
    }
  }
}

class MeshShaderParams {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.texCount = this._io.readU4le();
    this.uvCount = this._io.readU4le();
    this.colorCount = this._io.readU4le();
    this.floatCount = this._io.readU4le();
    this.shaderName = new CTString(this._io, this, this._root);
    
    this.textures = [];
    for (let i = 0; i < this.texCount; i++) {
      this.textures.push(new CTString(this._io, this, this._root));
    }
    
    this.uvMaps = [];
    for (let i = 0; i < this.uvCount; i++) {
      this.uvMaps.push(this._io.readU4le());
    }
    
    this.colors = [];
    for (let i = 0; i < this.colorCount; i++) {
      this.colors.push(this._io.readU4le());
    }
    
    this.floatParams = [];
    for (let i = 0; i < this.floatCount; i++) {
      this.floatParams.push(this._io.readF4le());
    }
    
    if (this._root.header.version > 11) {
      this.shaderFlags = this._io.readU4le();
    }
  }
}

class MeshWeightMap {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.vtxCount = this._io.readU4le();
    this.vertices = [];
    for (let i = 0; i < this.vtxCount; i++) {
      this.vertices.push(new MeshVertexWeight(this._io, this, this._root));
    }
  }
}

class MeshVertexWeight {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vtx = this._io.readU4le();
    this.weight = this._io.readF4le();
  }
}

class MeshMorphMapOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.isRelative = this._io.readU4le();
    this.setCount = this._io.readU4le();
    this.sets = [];
    for (let i = 0; i < this.setCount; i++) {
      this.sets.push(new MeshVertexMorphOld(this._io, this, this._root));
    }
  }
}

class MeshVertexMorphOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vtx = this._io.readU4le();
    this.pos = new Float3D(this._io, this, this._root);
    this.normal = new Float3D(this._io, this, this._root);
    this.dummy = this._io.readU4le();
  }
}

class MeshMorphMap {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = new CTString(this._io, this, this._root);
    this.isRelative = this._io.readU4le();
    this.setCount = this._io.readU4le();
    this.sets = [];
    for (let i = 0; i < this.setCount; i++) {
      this.sets.push(new MeshVertexMorph(this._io, this, this._root));
    }
  }
}

class MeshVertexMorph {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.vtx = this._io.readU4le();
    this.pos = new Float3D(this._io, this, this._root);
    this.normal = new Float3D(this._io, this, this._root);
  }
}

class MeshWeightMapInfo {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.indices = [];
    for (let i = 0; i < 4; i++) {
      this.indices.push(this._io.readU1());
    }
    this.weights = [];
    for (let i = 0; i < 4; i++) {
      this.weights.push(this._io.readU1());
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