import KaitaiStream from 'kaitai-struct/KaitaiStream.js';

export class SE1_WLD {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      // Check if this is a WLD file by looking for build version
      const pos = this._io.pos;
      const magic = this._io.readBytes(4);
      this._io.seek(pos);
      
      const magicStr = new TextDecoder().decode(magic);
      if (magicStr === 'BUIV') {
        this.buildVersion = new BuildVersionSection(this._io, this, this._root);
        this.world = new WorldSection(this._io, this, this._root);
      } else {
        // This might be a terrain file or other format
        this.trar = new DataChunk(this._io, this, this._root);
      }
    } catch (error) {
      throw new Error(`Failed to parse SE1_WLD: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE1_WLD(stream);
  }
}

class BuildVersionSection {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'BUIV') {
      throw new Error(`Invalid magic bytes: expected 'BUIV', got '${magicStr}'`);
    }
    this.number = this._io.readU4le();
  }
}

class WorldSection {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.start = this._io.readBytes(4);
    const startStr = new TextDecoder().decode(this.start);
    if (startStr !== 'WRLD') {
      throw new Error(`Invalid world start: expected 'WRLD', got '${startStr}'`);
    }
    
    this.chunks = [];
    while (!this._io.isEof()) {
      try {
        const chunk = new DataChunk(this._io, this, this._root);
        this.chunks.push(chunk);
        if (chunk.type === 'WEND') {
          break;
        }
      } catch (error) {
        console.warn('Error reading chunk:', error);
        break;
      }
    }
  }
}

class DataChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.type = this._io.readBytes(4);
    this.typeStr = new TextDecoder().decode(this.type);
    
    if (this.typeStr !== 'WEND') {
      switch (this.typeStr) {
        case 'WLIF':
          this.body = new WorldInfoChunk(this._io, this, this._root);
          break;
        case 'DPOS':
          this.body = this._io.readU4le();
          break;
        case 'BRAR':
          this.body = new BrushesChunk(this._io, this, this._root);
          break;
        case 'TRAR':
          this.body = new TerrainsChunk(this._io, this, this._root);
          break;
        case 'DICT':
          this.body = new DictChunk(this._io, this, this._root);
          break;
        case 'WSTA':
          this.body = new StateChunk(this._io, this, this._root);
          break;
        default:
          // Skip unknown chunks
          console.warn(`Unknown chunk type: ${this.typeStr}`);
          this.body = null;
      }
    }
  }
}

class WorldInfoChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.lenOrMagic = this._io.readU4le();
    // Simplified implementation - would need to handle old vs new format
    if (this.lenOrMagic === 0x46494C57) { // 'WLIF' backwards
      this.data = new WldInfo(this._io, this, this._root);
    } else {
      this.data = new WldInfoOld(this._io, this, this._root);
    }
  }
}

class WldInfo {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.lenOrMagic = this._io.readU4le();
    const hasDtrs = this.lenOrMagic === 0x53525444; // 'DTRS'
    
    if (hasDtrs) {
      this.len = this._io.readU4le();
    }
    
    const nameLen = hasDtrs ? this.len : this.lenOrMagic;
    this.nameStr = this._io.readBytes(nameLen);
    this.name = new TextDecoder('ascii').decode(this.nameStr);
    
    this.spawnFlags = this._io.readU4le();
    this.descriptionLen = this._io.readU4le();
    this.descriptionStr = this._io.readBytes(this.descriptionLen);
    this.description = new TextDecoder('ascii').decode(this.descriptionStr);
  }
}

class WldInfoOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    const descriptionLen = this._parent.lenOrMagic;
    this.descriptionStr = this._io.readBytes(descriptionLen);
    this.description = new TextDecoder('ascii').decode(this.descriptionStr);
  }
}

class BrushesChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.data = [];
    for (let i = 0; i < this.count; i++) {
      this.data.push(new BrushInfo(this._io, this, this._root));
    }
    // Additional data would be parsed here
  }
}

class BrushInfo {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.startId = this._io.readBytes(4);
    const startIdStr = new TextDecoder().decode(this.startId);
    if (startIdStr !== 'BR3D') {
      throw new Error(`Invalid brush start: expected 'BR3D', got '${startIdStr}'`);
    }
    this.version = this._io.readU4le();
    this.mipCount = this._io.readU4le();
    // Simplified - would parse mips here
  }
}

class TerrainsChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.container = [];
    for (let i = 0; i < this.count; i++) {
      this.container.push(new TerrainAny(this._io, this, this._root));
    }
    
    this.endId = this._io.readBytes(4);
    const endIdStr = new TextDecoder().decode(this.endId);
    if (endIdStr !== 'EOTA') {
      throw new Error(`Invalid terrain end: expected 'EOTA', got '${endIdStr}'`);
    }
  }
}

class TerrainAny {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.type = this._io.readBytes(4);
    this.typeStr = new TextDecoder().decode(this.type);
    
    switch (this.typeStr) {
      case 'TERR':
        this.body = new TerrainOld(this._io, this, this._root);
        break;
      case 'TRVR':
        this.body = new Terrain(this._io, this, this._root);
        break;
      default:
        console.warn(`Unknown terrain type: ${this.typeStr}`);
        this.body = null;
    }
  }
}

class Terrain {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.version = this._io.readU4le();
    this.data = new TerrainGlobalData(this._io, this, this._root);
    
    // Height map
    this.trhmMagic = this._io.readBytes(4);
    const trhmStr = new TextDecoder().decode(this.trhmMagic);
    if (trhmStr !== 'TRHM') {
      throw new Error(`Invalid TRHM magic: expected 'TRHM', got '${trhmStr}'`);
    }
    
    const heightMapSize = this.data.hmWidth * this.data.hmHeight * 2;
    this.heightMap = this._io.readBytes(heightMapSize);
    
    // Simplified - would parse additional terrain data here
  }
}

class TerrainOld {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.version = this._io.readU4le();
    this.hmWidth = this._io.readU4le();
    this.hmHeight = this._io.readU4le();
    this.stretch = new Float3D(this._io, this, this._root);
    this.distFactor = this._io.readF4le();
    this.terrainSize = new Float3D(this._io, this, this._root);
    // Simplified implementation
  }
}

class TerrainGlobalData {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.trgdMagic = this._io.readBytes(4);
    const trgdStr = new TextDecoder().decode(this.trgdMagic);
    if (trgdStr !== 'TRGD') {
      throw new Error(`Invalid TRGD magic: expected 'TRGD', got '${trgdStr}'`);
    }
    this.hmWidth = this._io.readU4le();
    this.hmHeight = this._io.readU4le();
    this.shadowMapSizeAspect = this._io.readU4le();
    this.shadingMapSizeAspect = this._io.readU4le();
    this.layerCount = this._io.readU4le();
    this.distFactor = this._io.readF4le();
    this.stretch = new Float3D(this._io, this, this._root);
    this.metricSize = new Float3D(this._io, this, this._root);
  }
}

class DictChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.dictCount = this._io.readU4le();
    this.names = [];
    for (let i = 0; i < this.dictCount; i++) {
      this.names.push(new DictEntry(this._io, this, this._root));
    }
    
    this.endId = this._io.readBytes(4);
    const endIdStr = new TextDecoder().decode(this.endId);
    if (endIdStr !== 'DEND') {
      throw new Error(`Invalid dict end: expected 'DEND', got '${endIdStr}'`);
    }
  }
}

class DictEntry {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.dfnm = this._io.readU4le();
    this.len = this._io.readU4le();
    this.data = this._io.readBytes(this.len);
    this.value = new TextDecoder('ascii').decode(this.data);
  }
}

class StateChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.version = this._io.readU4le();
    // Simplified implementation - would parse state data here
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