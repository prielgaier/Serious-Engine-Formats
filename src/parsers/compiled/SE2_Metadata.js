import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';

export class SE2_Metadata {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
      this.header = new FileHeader(this._io, this, this._root);
    } catch (error) {
      throw new Error(`Failed to parse SE2_Metadata: ${error.message}`);
    }
  }

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new SE2_Metadata(stream);
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
    this.magic = this._io.readBytes(8);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'CTSEMETA') {
      throw new Error(`Invalid magic bytes: expected 'CTSEMETA', got '${magicStr}'`);
    }
    this.endianess = this._io.readU4le();
    this.metaVersion = this._io.readU4le();
    this.versionString = new CString(this._io, this, this._root);
    
    this.chunks = [];
    for (let i = 0; i < 8; i++) {
      this.chunks.push(new DataChunk(this._io, this, this._root));
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
    
    switch (this.typeStr) {
      case 'INFO':
        this.body = new InfoChunk(this._io, this, this._root);
        break;
      case 'RFIL':
        this.body = new ResourceFilesChunk(this._io, this, this._root);
        break;
      case 'IDNT':
        this.body = new IdentsChunk(this._io, this, this._root);
        break;
      case 'EXTY':
        this.body = new ExternalTypesChunk(this._io, this, this._root);
        break;
      case 'INTY':
        this.body = new InternalTypesChunk(this._io, this, this._root);
        break;
      case 'EXOB':
        this.body = new ExternalObjectsChunk(this._io, this, this._root);
        break;
      case 'OBTY':
      case 'EDTY':
        this.body = new ObjectTypesChunk(this._io, this, this._root);
        break;
      default:
        console.warn(`Unknown chunk type: ${this.typeStr}`);
        this.body = null;
    }
  }
}

class InfoChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.isInitialized = this._io.readU4le();
    this.resourceCount = this._io.readU4le();
    this.identCount = this._io.readU4le();
    this.totalType = this._io.readU4le();
    this.totalObjects = this._io.readU4le();
  }
}

class ResourceFilesChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new ResourceEntry(this._io, this, this._root));
    }
  }
}

class ResourceEntry {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = this._io.readU4le();
    this.flags = this._io.readU4le();
    this.path = new CString(this._io, this, this._root);
  }
}

class IdentsChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new IdentEntry(this._io, this, this._root));
    }
  }
}

class IdentEntry {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = this._io.readU4le();
    this.idLen = this._io.readU4le();
    this.idStr = this._io.readBytes(this.idLen);
    this.value = new TextDecoder('ascii').decode(this.idStr);
  }
}

class ExternalTypesChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new ExternalType(this._io, this, this._root));
    }
  }
}

class ExternalType {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.typeId = this._io.readU4le();
    this.identifierLen = this._io.readU4le();
    this.identifierStr = this._io.readBytes(this.identifierLen);
    this.identifier = new TextDecoder('ascii').decode(this.identifierStr);
  }
}

class InternalTypesChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new InternalType(this._io, this, this._root));
    }
  }
}

class InternalType {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'DTTY') {
      throw new Error(`Invalid DTTY magic: expected 'DTTY', got '${magicStr}'`);
    }
    this.typeId = this._io.readU4le();
    this.identifierLen = this._io.readU4le();
    this.identifierStr = this._io.readBytes(this.identifierLen);
    this.identifier = new TextDecoder('ascii').decode(this.identifierStr);
    this.version = this._io.readU4le();
    this.type = this._io.readU4le();
    
    // Simplified - would parse type-specific data here
    switch (this.type) {
      case 0: // simple
        this.data = new DTDefSimple(this._io, this, this._root);
        break;
      case 4: // array
        this.data = new DTDefArray(this._io, this, this._root);
        break;
      case 5: // struct
        this.data = new DTDefStruct(this._io, this, this._root);
        break;
      default:
        this.data = this._io.readU4le(); // placeholder
    }
  }
}

class DTDefSimple {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.sizeInBytes = this._io.readU4le();
    this.endianessSize = this._io.readU4le();
  }
}

class DTDefArray {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.typeid = this._io.readU4le();
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'ADIM') {
      throw new Error(`Invalid ADIM magic: expected 'ADIM', got '${magicStr}'`);
    }
    this.dimensionCount = this._io.readU4le();
    this.dimensions = [];
    for (let i = 0; i < this.dimensionCount; i++) {
      this.dimensions.push(this._io.readU4le());
    }
  }
}

class DTDefStruct {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.parentTypeId = this._io.readU4le();
    this.magic = this._io.readBytes(4);
    const magicStr = new TextDecoder().decode(this.magic);
    if (magicStr !== 'STMB') {
      throw new Error(`Invalid STMB magic: expected 'STMB', got '${magicStr}'`);
    }
    this.memberCount = this._io.readU4le();
    this.members = [];
    for (let i = 0; i < this.memberCount; i++) {
      this.members.push(new DTDefStructMember(this._io, this, this._root));
    }
  }
}

class DTDefStructMember {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.identifierLen = this._io.readU4le();
    this.identifierStr = this._io.readBytes(this.identifierLen);
    this.identifier = new TextDecoder('ascii').decode(this.identifierStr);
    this.typeId = this._io.readU4le();
  }
}

class ExternalObjectsChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new ExternalObject(this._io, this, this._root));
    }
  }
}

class ExternalObject {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.id = this._io.readU4le();
    this.resourceId = this._io.readU4le();
    this.objectId = this._io.readU4le();
    this.objectTypeId = this._io.readU4le();
  }
}

class ObjectTypesChunk {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.count = this._io.readU4le();
    this.entries = [];
    for (let i = 0; i < this.count; i++) {
      this.entries.push(new ObjectType(this._io, this, this._root));
    }
  }
}

class ObjectType {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
    this.objectId = this._io.readU4le();
    this.typeId = this._io.readU4le();
  }
}

class CString {
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