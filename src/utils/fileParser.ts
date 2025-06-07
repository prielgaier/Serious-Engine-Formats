import { ParsedFile } from '../types/ParsedFile';
import { getParserForExtension } from '../parsers';

export async function parseFile(file: File): Promise<ParsedFile> {
  const startTime = performance.now();
  
  try {
    const arrayBuffer = await file.arrayBuffer();
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    
    // Get the appropriate parser for this file type
    const ParserClass = getParserForExtension(extension);
    
    let data: any;
    let error: string | undefined;
    
    if (ParserClass) {
      try {
        // Use the Kaitai Struct parser
        const parsedData = ParserClass.fromBytes(arrayBuffer);
        data = convertToSerializable(parsedData);
      } catch (parseError) {
        console.error(`Kaitai parsing failed for ${file.name}:`, parseError);
        error = parseError instanceof Error ? parseError.message : 'Parsing failed';
        // Fallback to basic analysis
        data = await parseFileDataBasic(arrayBuffer, extension);
      }
    } else {
      // No specific parser available, use basic analysis
      data = await parseFileDataBasic(arrayBuffer, extension);
    }
    
    const endTime = performance.now();
    
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: extension,
      size: file.size,
      data,
      rawData: arrayBuffer,
      parseTime: Math.round(endTime - startTime),
      error
    };
  } catch (error) {
    const endTime = performance.now();
    throw new Error(`Failed to parse ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function convertToSerializable(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (obj instanceof ArrayBuffer || obj instanceof Uint8Array) {
    return {
      _type: 'binary',
      _size: obj.byteLength || obj.length,
      _preview: Array.from(new Uint8Array(obj).slice(0, 32))
    };
  }
  
  if (typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(item => convertToSerializable(item));
    }
    
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip private properties and functions
      if (key.startsWith('_') || typeof value === 'function') {
        continue;
      }
      
      try {
        result[key] = convertToSerializable(value);
      } catch (error) {
        result[key] = `[Error: ${error instanceof Error ? error.message : 'Unknown'}]`;
      }
    }
    return result;
  }
  
  return obj;
}

async function parseFileDataBasic(buffer: ArrayBuffer, extension: string): Promise<any> {
  const view = new DataView(buffer);
  const uint8Array = new Uint8Array(buffer);
  
  // Basic file analysis
  const result: any = {
    fileInfo: {
      size: buffer.byteLength,
      extension: extension.toUpperCase(),
      parseMethod: 'basic'
    },
    header: {},
    rawData: {
      preview: Array.from(uint8Array.slice(0, 64)),
      totalBytes: buffer.byteLength
    }
  };

  try {
    // Try to read magic bytes and basic header info
    if (buffer.byteLength >= 4) {
      const magic = new TextDecoder().decode(uint8Array.slice(0, 4));
      result.header.magic = magic;
      
      // Check for known magic signatures
      switch (magic) {
        case 'ANIM':
          result.fileType = 'Bone Animation';
          if (buffer.byteLength >= 12) {
            result.header.version = view.getUint32(4, true);
            result.header.animCount = view.getUint32(8, true);
          }
          break;
          
        case 'AEFF':
          result.fileType = 'Animation Effects';
          if (buffer.byteLength >= 8) {
            result.header.count = view.getUint32(4, true);
          }
          break;
          
        case 'MESH':
          result.fileType = 'Bone Mesh';
          if (buffer.byteLength >= 12) {
            result.header.version = view.getUint32(4, true);
            if (result.header.version > 12 && buffer.byteLength >= 16) {
              result.header.size = view.getUint32(8, true);
              result.header.lodCount = view.getUint32(12, true);
            } else if (buffer.byteLength >= 12) {
              result.header.lodCount = view.getUint32(8, true);
            }
          }
          break;
          
        case 'SKEL':
          result.fileType = 'Skeleton';
          if (buffer.byteLength >= 12) {
            result.header.version = view.getUint32(4, true);
            result.header.lodCount = view.getUint32(8, true);
          }
          break;
          
        case 'FTTF':
          result.fileType = 'Font';
          if (buffer.byteLength >= 16) {
            // Skip DFNM section for now
            result.header.charWidth = view.getUint32(12, true);
            result.header.charHeight = view.getUint32(16, true);
          }
          break;
          
        case 'MDAT':
          result.fileType = 'Model';
          if (buffer.byteLength >= 8) {
            const versionBytes = uint8Array.slice(4, 8);
            result.header.version = new TextDecoder().decode(versionBytes);
          }
          break;
          
        case 'BUIV':
          result.fileType = 'World (with build version)';
          if (buffer.byteLength >= 8) {
            result.header.buildNumber = view.getUint32(4, true);
          }
          break;
          
        case 'WRLD':
          result.fileType = 'World';
          break;
          
        case 'TVER':
          result.fileType = 'SE2 Metadata (TVER format)';
          if (buffer.byteLength >= 8) {
            result.header.versionData = view.getUint32(4, true);
          }
          break;
          
        case 'CTSE':
          result.fileType = 'SE2 Metadata (CTSE format)';
          if (buffer.byteLength >= 8) {
            const metaSuffix = new TextDecoder().decode(uint8Array.slice(4, 8));
            result.header.metaSuffix = metaSuffix;
          }
          break;
          
        default:
          // Check for other patterns
          const magic8 = new TextDecoder().decode(uint8Array.slice(0, 8));
          if (magic8 === 'CTSEMETA') {
            result.fileType = 'SE2 Metadata (CTSEMETA format)';
            if (buffer.byteLength >= 16) {
              result.header.endianess = view.getUint32(8, true);
              result.header.metaVersion = view.getUint32(12, true);
            }
          } else {
            result.fileType = 'Unknown';
            // Try to detect patterns in first 16 bytes
            const first16 = Array.from(uint8Array.slice(0, 16))
              .map(b => b.toString(16).padStart(2, '0'))
              .join(' ');
            result.header.hexPattern = first16;
          }
      }
    }

    // Add hex dump for debugging
    result.hexDump = Array.from(uint8Array.slice(0, 256))
      .map((byte, index) => {
        if (index % 16 === 0) {
          return `\n${index.toString(16).padStart(4, '0')}: ${byte.toString(16).padStart(2, '0')}`;
        }
        return byte.toString(16).padStart(2, '0');
      })
      .join(' ');

  } catch (error) {
    result.parseError = error instanceof Error ? error.message : 'Unknown parsing error';
  }

  return result;
}