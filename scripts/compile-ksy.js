import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const kysFiles = [
  'SE1_BA.ksy',
  'SE1_BAE.ksy', 
  'SE1_BM.ksy',
  'SE1_BS.ksy',
  'SE1_FNT.ksy',
  'SE1_MDL.ksy',
  'SE1_WLD.ksy',
  'SE2_Metadata.ksy'
];

// Create output directory
const outputDir = 'src/parsers/compiled';
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log('Compiling Kaitai Struct files...');

kysFiles.forEach(file => {
  const baseName = path.basename(file, '.ksy');
  const outputFile = path.join(outputDir, `${baseName}.js`);
  
  console.log(`Compiling ${file}...`);
  
  try {
    const kysContent = fs.readFileSync(file, 'utf8');
    const kysData = yaml.load(kysContent);
    const compiledCode = compileKaitaiStruct(kysData, baseName);
    fs.writeFileSync(outputFile, compiledCode);
    console.log(`✓ Generated ${outputFile}`);
  } catch (error) {
    console.error(`✗ Error compiling ${file}:`, error.message);
  }
});

console.log('Compilation complete!');

function compileKaitaiStruct(kysData, className) {
  const compiler = new KaitaiCompiler(kysData, className);
  return compiler.compile();
}

class KaitaiCompiler {
  constructor(kysData, className) {
    this.kysData = kysData;
    this.className = className;
    this.types = kysData.types || {};
    this.enums = kysData.enums || {};
    this.instances = kysData.instances || {};
  }

  compile() {
    const imports = this.generateImports();
    const mainClass = this.generateMainClass();
    const typeClasses = this.generateTypeClasses();
    const enumDefinitions = this.generateEnums();
    
    return `${imports}

${mainClass}

${typeClasses}

${enumDefinitions}`;
  }

  generateImports() {
    return `import KaitaiStream from '/public/kaitai-struct/KaitaiStream.js';`;
  }

  generateMainClass() {
    const seq = this.kysData.seq || [];
    const meta = this.kysData.meta || {};
    
    return `export class ${this.className} {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root || this;
    this._read();
  }

  _read() {
    try {
${this.generateSequenceReading(seq, '      ')}
    } catch (error) {
      throw new Error(\`Failed to parse ${this.className}: \${error.message}\`);
    }
  }

${this.generateInstances()}

  static fromBytes(data) {
    const stream = new KaitaiStream(data);
    return new ${this.className}(stream);
  }
}`;
  }

  generateSequenceReading(seq, indent) {
    return seq.map(item => {
      const fieldName = this.toCamelCase(item.id);
      return this.generateFieldReading(item, fieldName, indent);
    }).join('\n');
  }

  generateFieldReading(item, fieldName, indent) {
    const type = item.type;
    const repeat = item.repeat;
    const repeatExpr = item['repeat-expr'];
    const ifCondition = item.if;
    const size = item.size;
    const contents = item.contents;

    let code = '';

    // Handle conditional reading
    if (ifCondition) {
      code += `${indent}if (${this.translateExpression(ifCondition)}) {\n`;
      indent += '  ';
    }

    if (contents) {
      // Handle magic bytes/contents
      code += `${indent}this.${fieldName} = this._io.readBytes(${contents.length});\n`;
      code += `${indent}const ${fieldName}Str = new TextDecoder().decode(this.${fieldName});\n`;
      code += `${indent}if (${fieldName}Str !== '${contents}') {\n`;
      code += `${indent}  throw new Error(\`Invalid ${fieldName}: expected '${contents}', got '\${${fieldName}Str}'\`);\n`;
      code += `${indent}}\n`;
    } else if (repeat) {
      // Handle repeated fields
      code += `${indent}this.${fieldName} = [];\n`;
      if (repeat === 'expr' && repeatExpr) {
        const count = this.translateExpression(repeatExpr);
        code += `${indent}for (let i = 0; i < ${count}; i++) {\n`;
        code += `${indent}  this.${fieldName}.push(${this.generateTypeReading(type, indent + '  ')});\n`;
        code += `${indent}}\n`;
      } else if (repeat === 'eos') {
        code += `${indent}while (!this._io.isEof()) {\n`;
        code += `${indent}  try {\n`;
        code += `${indent}    this.${fieldName}.push(${this.generateTypeReading(type, indent + '    ')});\n`;
        code += `${indent}  } catch (error) {\n`;
        code += `${indent}    break;\n`;
        code += `${indent}  }\n`;
        code += `${indent}}\n`;
      } else if (repeat === 'until') {
        const untilExpr = item['repeat-until'];
        code += `${indent}do {\n`;
        code += `${indent}  const item = ${this.generateTypeReading(type, indent + '  ')};\n`;
        code += `${indent}  this.${fieldName}.push(item);\n`;
        code += `${indent}} while (!(${this.translateExpression(untilExpr)}));\n`;
      }
    } else if (size) {
      // Handle sized fields
      const sizeExpr = typeof size === 'number' ? size : this.translateExpression(size);
      code += `${indent}this.${fieldName} = this._io.readBytes(${sizeExpr});\n`;
    } else {
      // Handle single fields
      code += `${indent}this.${fieldName} = ${this.generateTypeReading(type, indent)};\n`;
    }

    if (ifCondition) {
      indent = indent.slice(2);
      code += `${indent}}\n`;
    }

    return code;
  }

  generateTypeReading(type, indent) {
    if (typeof type === 'string') {
      // Built-in types
      switch (type) {
        case 'u1': return 'this._io.readU1()';
        case 's1': return 'this._io.readS1()';
        case 'u2': case 'u2le': return 'this._io.readU2le()';
        case 's2': case 's2le': return 'this._io.readS2le()';
        case 'u4': case 'u4le': return 'this._io.readU4le()';
        case 's4': case 's4le': return 'this._io.readS4le()';
        case 'f4': case 'f4le': return 'this._io.readF4le()';
        case 'f8': case 'f8le': return 'this._io.readF8le()';
        case 'str':
          return 'new TextDecoder().decode(this._io.readBytes(size))';
        default:
          // Custom type
          const typeName = this.toPascalCase(type);
          return `new ${typeName}(this._io, this, this._root)`;
      }
    } else if (typeof type === 'object') {
      // Switch-on type
      if (type['switch-on']) {
        const switchExpr = this.translateExpression(type['switch-on']);
        const cases = type.cases || {};
        
        let switchCode = `(() => {\n${indent}  switch (${switchExpr}) {\n`;
        
        Object.entries(cases).forEach(([caseValue, caseType]) => {
          const cleanValue = caseValue.replace(/['"]/g, '');
          switchCode += `${indent}    case ${caseValue}:\n`;
          switchCode += `${indent}      return ${this.generateTypeReading(caseType, indent + '      ')};\n`;
        });
        
        switchCode += `${indent}    default:\n`;
        switchCode += `${indent}      throw new Error(\`Unknown switch value: \${${switchExpr}}\`);\n`;
        switchCode += `${indent}  }\n${indent}})()`;
        
        return switchCode;
      }
    }
    
    return 'null';
  }

  generateTypeClasses() {
    return Object.entries(this.types).map(([typeName, typeDef]) => {
      return this.generateTypeClass(typeName, typeDef);
    }).join('\n\n');
  }

  generateTypeClass(typeName, typeDef) {
    const className = this.toPascalCase(typeName);
    const seq = typeDef.seq || [];
    const instances = typeDef.instances || {};

    return `class ${className} {
  constructor(io, parent, root) {
    this._io = io;
    this._parent = parent;
    this._root = root;
    this._read();
  }

  _read() {
${this.generateSequenceReading(seq, '    ')}
  }

${this.generateTypeInstances(instances)}
}`;
  }

  generateInstances() {
    if (Object.keys(this.instances).length === 0) return '';
    
    return Object.entries(this.instances).map(([name, instance]) => {
      const methodName = this.toCamelCase(name);
      const value = this.translateExpression(instance.value);
      
      return `  get ${methodName}() {
    return ${value};
  }`;
    }).join('\n\n');
  }

  generateTypeInstances(instances) {
    if (Object.keys(instances).length === 0) return '';
    
    return Object.entries(instances).map(([name, instance]) => {
      const methodName = this.toCamelCase(name);
      const value = this.translateExpression(instance.value);
      
      return `  get ${methodName}() {
    return ${value};
  }`;
    }).join('\n\n');
  }

  generateEnums() {
    if (Object.keys(this.enums).length === 0) return '';
    
    return Object.entries(this.enums).map(([enumName, enumValues]) => {
      const className = this.toPascalCase(enumName);
      const values = Object.entries(enumValues).map(([key, value]) => {
        return `  ${key.toUpperCase()}: ${value}`;
      }).join(',\n');
      
      return `export const ${className} = {
${values}
};`;
    }).join('\n\n');
  }

  translateExpression(expr) {
    if (typeof expr !== 'string') return expr;
    
    // Handle common Kaitai expressions
    return expr
      .replace(/_root\./g, 'this._root.')
      .replace(/_parent\./g, 'this._parent.')
      .replace(/_index/g, 'i')
      .replace(/\bctPolygonEdges\b/g, 'this.edgeCount')
      .replace(/\bvtx_count\b/g, 'this.vtxCount')
      .replace(/\bframe_count\b/g, 'this.frameCount')
      .replace(/\banim_count\b/g, 'this.animCount')
      .replace(/\blod_count\b/g, 'this.lodCount')
      .replace(/\bbone_envelope_count\b/g, 'this.boneEnvelopeCount')
      .replace(/\bmorph_envelope_count\b/g, 'this.morphEnvelopeCount')
      .replace(/\bposition_count\b/g, 'this.positionCount')
      .replace(/\brotation_count\b/g, 'this.rotationCount')
      .replace(/\bfactor_count\b/g, 'this.factorCount')
      .replace(/\bgroup_count\b/g, 'this.groupCount')
      .replace(/\bsurface_count\b/g, 'this.surfaceCount')
      .replace(/\btri_count\b/g, 'this.triCount')
      .replace(/\bweight_count\b/g, 'this.weightCount')
      .replace(/\bmorph_count\b/g, 'this.morphCount')
      .replace(/\bweight_info_count\b/g, 'this.weightInfoCount')
      .replace(/\bbone_count\b/g, 'this.boneCount')
      .replace(/\bset_count\b/g, 'this.setCount')
      .replace(/\btex_count\b/g, 'this.texCount')
      .replace(/\buv_count\b/g, 'this.uvCount')
      .replace(/\bcolor_count\b/g, 'this.colorCount')
      .replace(/\bfloat_count\b/g, 'this.floatCount')
      .replace(/\brelative_wmi_count\b/g, 'this.relativeWmiCount')
      .replace(/\bmip_count\b/g, 'this.mipCount')
      .replace(/\bpolygon_count\b/g, 'this.polygonCount')
      .replace(/\bvtx_tex_count\b/g, 'this.vtxTexCount')
      .replace(/\bmapping_srf_count\b/g, 'this.mappingSrfCount')
      .replace(/\bpatch_count\b/g, 'this.patchCount')
      .replace(/\bcol_box_count\b/g, 'this.colBoxCount')
      .replace(/\battached_pos_count\b/g, 'this.attachedPosCount')
      .replace(/\bdict_count\b/g, 'this.dictCount')
      .replace(/\bcount\b/g, 'this.count')
      .replace(/\blayer_count\b/g, 'this.layerCount')
      .replace(/\bsector_count\b/g, 'this.sectorCount')
      .replace(/\bvertex_count\b/g, 'this.vertexCount')
      .replace(/\bplane_count\b/g, 'this.planeCount')
      .replace(/\bedge_count\b/g, 'this.edgeCount')
      .replace(/\bpolygon_count\b/g, 'this.polygonCount')
      .replace(/\bnode_count\b/g, 'this.nodeCount')
      .replace(/\blink_count\b/g, 'this.linkCount')
      .replace(/\bchildren_count\b/g, 'this.childrenCount')
      .replace(/\bmember_count\b/g, 'this.memberCount')
      .replace(/\bdimension_count\b/g, 'this.dimensionCount')
      .replace(/\bentry_count\b/g, 'this.entryCount')
      .replace(/\bshadow_layer_count\b/g, 'this.shadowLayerCount')
      .replace(/\bfirst_topmap_lod\b/g, 'this.firstTopmapLod')
      .replace(/\battribute_map_size_aspect\b/g, 'this.attributeMapSizeAspect')
      .replace(/\bhm_width\b/g, 'this.hmWidth')
      .replace(/\bhm_height\b/g, 'this.hmHeight')
      .replace(/\btm_width\b/g, 'this.tmWidth')
      .replace(/\btm_height\b/g, 'this.tmHeight')
      .replace(/\bshadow_map_size_aspect\b/g, 'this.shadowMapSizeAspect')
      .replace(/\bshading_map_size_aspect\b/g, 'this.shadingMapSizeAspect')
      .replace(/\bsize_in_pixels\b/g, 'this.sizeInPixels')
      .replace(/\bfirst_mip_level\b/g, 'this.firstMipLevel')
      .replace(/\bpolygon_size_u\b/g, 'this.polygonSizeU')
      .replace(/\bpolygon_size_v\b/g, 'this.polygonSizeV')
      .replace(/\bsize_u\b/g, 'this.sizeU')
      .replace(/\bsize_v\b/g, 'this.sizeV')
      .replace(/\bmin_u\b/g, 'this.minU')
      .replace(/\bmin_v\b/g, 'this.minV')
      .replace(/\boffset_x\b/g, 'this.offsetX')
      .replace(/\boffset_y\b/g, 'this.offsetY')
      .replace(/\bwidth\b/g, 'this.width')
      .replace(/\bheight\b/g, 'this.height')
      .replace(/\bname_len\b/g, 'this.nameLen')
      .replace(/\bdescription_len\b/g, 'this.descriptionLen')
      .replace(/\bidentifier_len\b/g, 'this.identifierLen')
      .replace(/\bid_len\b/g, 'this.idLen')
      .replace(/\binstance_name_len\b/g, 'this.instanceNameLen')
      .replace(/\bup_len\b/g, 'this.upLen')
      .replace(/\bft_len\b/g, 'this.ftLen')
      .replace(/\brt_len\b/g, 'this.rtLen')
      .replace(/\blen\b/g, 'this.len')
      .replace(/\bsize\b/g, 'this.size')
      .replace(/\bchunksize\b/g, 'this.chunksize')
      .replace(/\bversion\b/g, 'this.version')
      .replace(/\bmeta_version\b/g, 'this.metaVersion')
      .replace(/\bresource_count\b/g, 'this.resourceCount')
      .replace(/\bident_count\b/g, 'this.identCount')
      .replace(/\btotal_type\b/g, 'this.totalType')
      .replace(/\btotal_objects\b/g, 'this.totalObjects')
      .replace(/\btype_id\b/g, 'this.typeId')
      .replace(/\bresource_id\b/g, 'this.resourceId')
      .replace(/\bobject_id\b/g, 'this.objectId')
      .replace(/\bobject_type_id\b/g, 'this.objectTypeId')
      .replace(/\bparent_type_id\b/g, 'this.parentTypeId')
      .replace(/\bsize_in_bytes\b/g, 'this.sizeInBytes')
      .replace(/\bendianess_size\b/g, 'this.endianessSize')
      .replace(/\btypeid\b/g, 'this.typeid')
      .replace(/\bis_initialized\b/g, 'this.isInitialized')
      .replace(/\bendianess\b/g, 'this.endianess')
      .replace(/\bflags\b/g, 'this.flags')
      .replace(/\bid\b/g, 'this.id')
      .replace(/\bdata\b/g, 'this.data')
      .replace(/\bvalue\b/g, 'this.value')
      .replace(/\braw\b/g, 'this.raw')
      .replace(/\bmagic\b/g, 'this.magic')
      .replace(/\btype\b/g, 'this.type')
      .replace(/\bbody\b/g, 'this.body')
      .replace(/\bheader\b/g, 'this.header')
      .replace(/\bstart_time\b/g, 'this.startTime')
      .replace(/\bfade_time\b/g, 'this.fadeTime')
      .replace(/\bstrength\b/g, 'this.strength')
      .replace(/\bgroup_id\b/g, 'this.groupId')
      .replace(/\bunknown_nf\b/g, 'this.unknownNf')
      .replace(/\bspeed_multiplier\b/g, 'this.speedMultiplier')
      .replace(/\bbox_count\b/g, 'this.boxCount')
      .replace(/\bmin\b/g, 'this.min')
      .replace(/\bmax\b/g, 'this.max')
      .replace(/\bname\b/g, 'this.name')
      .replace(/\boffset_qvect\b/g, 'this.offsetQvect')
      .replace(/\bparent_bode_id\b/g, 'this.parentBodeId')
      .replace(/\bposition_id\b/g, 'this.positionId')
      .replace(/\brelative_offset\b/g, 'this.relativeOffset')
      .replace(/\bobject\b/g, 'this.object')
      .replace(/\bsource_resource_id\b/g, 'this.sourceResourceId')
      .replace(/\bcurrent_box_id\b/g, 'this.currentBoxId')
      .replace(/\bstretch\b/g, 'this.stretch')
      .replace(/\bcolor\b/g, 'this.color')
      .replace(/\binstances\b/g, 'this.instances')
      .replace(/\bskeleton\b/g, 'this.skeleton')
      .replace(/\banimations\b/g, 'this.animations')
      .replace(/\banim_queue\b/g, 'this.animQueue')
      .replace(/\bcollision_info\b/g, 'this.collisionInfo')
      .replace(/\boffset_and_children\b/g, 'this.offsetAndChildren')
      .replace(/\bmesh_count\b/g, 'this.meshCount')
      .replace(/\bentries\b/g, 'this.entries')
      .replace(/\bmesh_res_id\b/g, 'this.meshResId')
      .replace(/\btexture_count\b/g, 'this.textureCount')
      .replace(/\btextures\b/g, 'this.textures')
      .replace(/\bhas_skeleton\b/g, 'this.hasSkeleton')
      .replace(/\bset_count\b/g, 'this.setCount')
      .replace(/\banim_sets\b/g, 'this.animSets')
      .replace(/\banim_count\b/g, 'this.animCount')
      .replace(/\banim_list\b/g, 'this.animList')
      .replace(/\bplayed_anim_count\b/g, 'this.playedAnimCount')
      .replace(/\bplayed_anims\b/g, 'this.playedAnims')
      .replace(/\bplayer_anim_id\b/g, 'this.playerAnimId')
      .replace(/\bafbb_min\b/g, 'this.afbbMin')
      .replace(/\bafbb_max\b/g, 'this.afbbMax')
      .replace(/\banimation\b/g, 'this.animation')
      .replace(/\bref\b/g, 'this.ref')
      .replace(/\bblend_color\b/g, 'this.blendColor')
      .replace(/\bpatch_mask\b/g, 'this.patchMask')
      .replace(/\bcolor_mask\b/g, 'this.colorMask')
      .replace(/\btexture_d\b/g, 'this.textureD')
      .replace(/\btexture_b\b/g, 'this.textureB')
      .replace(/\btexture_r\b/g, 'this.textureR')
      .replace(/\btexture_s\b/g, 'this.textureS')
      .replace(/\bnext_magic\b/g, 'this.nextMagic')
      .replace(/\battachments\b/g, 'this.attachments')
      .replace(/\bparent\b/g, 'this.parent')
      .replace(/\bprps_id\b/g, 'this.prpsId')
      .replace(/\boffset\b/g, 'this.offset')
      .replace(/\btime\b/g, 'this.time')
      .replace(/\bcurrentanim\b/g, 'this.currentanim')
      .replace(/\blasttanim\b/g, 'this.lastanim')
      .replace(/\bnames\b/g, 'this.names')
      .replace(/\bdfnm\b/g, 'this.dfnm')
      .replace(/\bcontainer\b/g, 'this.container')
      .replace(/\blen_or_magic\b/g, 'this.lenOrMagic')
      .replace(/\bspawn_flags\b/g, 'this.spawnFlags')
      .replace(/\bdescription_str\b/g, 'this.descriptionStr')
      .replace(/\bdescription\b/g, 'this.description')
      .replace(/\bname_str\b/g, 'this.nameStr')
      .replace(/\bstart\b/g, 'this.start')
      .replace(/\bchunks\b/g, 'this.chunks')
      .replace(/\btypeStr\b/g, 'this.typeStr')
      .replace(/\bbuild_version\b/g, 'this.buildVersion')
      .replace(/\bworld\b/g, 'this.world')
      .replace(/\btrar\b/g, 'this.trar')
      .replace(/\bnumber\b/g, 'this.number')
      .replace(/\binfo\b/g, 'this.info')
      .replace(/\bbcg_color\b/g, 'this.bcgColor')
      .replace(/\bnfid\b/g, 'this.nfid')
      .replace(/\bbgvm\b/g, 'this.bgvm')
      .replace(/\bbackdrop\b/g, 'this.backdrop')
      .replace(/\bbdro\b/g, 'this.bdro')
      .replace(/\bvwps\b/g, 'this.vwps')
      .replace(/\btbps\b/g, 'this.tbps')
      .replace(/\bens2\b/g, 'this.ens2')
      .replace(/\benor\b/g, 'this.enor')
      .replace(/\besl2\b/g, 'this.esl2')
      .replace(/\bup_str\b/g, 'this.upStr')
      .replace(/\bft_str\b/g, 'this.ftStr')
      .replace(/\brt_str\b/g, 'this.rtStr')
      .replace(/\bupw\b/g, 'this.upw')
      .replace(/\bupl\b/g, 'this.upl')
      .replace(/\bupcx\b/g, 'this.upcx')
      .replace(/\bupcz\b/g, 'this.upcz')
      .replace(/\bftw\b/g, 'this.ftw')
      .replace(/\bfth\b/g, 'this.fth')
      .replace(/\bftcx\b/g, 'this.ftcx')
      .replace(/\bftcy\b/g, 'this.ftcy')
      .replace(/\brtl\b/g, 'this.rtl')
      .replace(/\brth\b/g, 'this.rth')
      .replace(/\brtcz\b/g, 'this.rtcz')
      .replace(/\brtcy\b/g, 'this.rtcy')
      .replace(/\bstr\b/g, 'this.str')
      .replace(/\bfocus\b/g, 'this.focus')
      .replace(/\btarget_distance\b/g, 'this.targetDistance')
      .replace(/\bentities_meta\b/g, 'this.entitiesMeta')
      .replace(/\bentities_data\b/g, 'this.entitiesData')
      .replace(/\bentities\b/g, 'this.entities')
      .replace(/\bbytes\b/g, 'this.bytes')
      .replace(/\bend_id\b/g, 'this.endId')
      .replace(/\bclass_id\b/g, 'this.classId')
      .replace(/\bplacement\b/g, 'this.placement')
      .replace(/\brender_type\b/g, 'this.renderType')
      .replace(/\bphysics_flags\b/g, 'this.physicsFlags')
      .replace(/\bcollision_flags\b/g, 'this.collisionFlags')
      .replace(/\brender_data\b/g, 'this.renderData')
      .replace(/\bnext_id\b/g, 'this.nextId')
      .replace(/\bproperties_id\b/g, 'this.propertiesId')
      .replace(/\bproperties\b/g, 'this.properties')
      .replace(/\bid_and_type\b/g, 'this.idAndType')
      .replace(/\bproperty_id\b/g, 'this.propertyId')
      .replace(/\bproperty_type\b/g, 'this.propertyType')
      .replace(/\bres_id\b/g, 'this.resId')
      .replace(/\bdropped_out\b/g, 'this.droppedOut')
      .replace(/\bleft_volume\b/g, 'this.leftVolume')
      .replace(/\bright_volume\b/g, 'this.rightVolume')
      .replace(/\bleft_filter\b/g, 'this.leftFilter')
      .replace(/\bright_filter\b/g, 'this.rightFilter')
      .replace(/\bpitch_shift\b/g, 'this.pitchShift')
      .replace(/\bphase_shift\b/g, 'this.phaseShift')
      .replace(/\bdelay\b/g, 'this.delay')
      .replace(/\bdelayed\b/g, 'this.delayed')
      .replace(/\blast_left_volume\b/g, 'this.lastLeftVolume')
      .replace(/\blast_right_volume\b/g, 'this.lastRightVolume')
      .replace(/\blast_left_sample\b/g, 'this.lastLeftSample')
      .replace(/\blast_right_sample\b/g, 'this.lastRightSample')
      .replace(/\bleft_offset\b/g, 'this.leftOffset')
      .replace(/\bright_offset\b/g, 'this.rightOffset')
      .replace(/\boffset_delta\b/g, 'this.offsetDelta')
      .replace(/\bfalloff\b/g, 'this.falloff')
      .replace(/\bhotspot\b/g, 'this.hotspot')
      .replace(/\bmax_volume\b/g, 'this.maxVolume')
      .replace(/\bpitch\b/g, 'this.pitch')
      .replace(/\bsound_id\b/g, 'this.soundId')
      .replace(/\bpath\b/g, 'this.path')
      .replace(/\bidentifier_str\b/g, 'this.identifierStr')
      .replace(/\bidentifier\b/g, 'this.identifier')
      .replace(/\bid_str\b/g, 'this.idStr')
      .replace(/\bversion_string\b/g, 'this.versionString')
      .replace(/\bmax_distance\b/g, 'this.maxDistance')
      .replace(/\bsource_file\b/g, 'this.sourceFile')
      .replace(/\bsecs_per_frame\b/g, 'this.secsPerFrame')
      .replace(/\bthreshold\b/g, 'this.threshold')
      .replace(/\bis_compressed\b/g, 'this.isCompressed')
      .replace(/\bis_custom_speed\b/g, 'this.isCustomSpeed')
      .replace(/\bbone_envelopes\b/g, 'this.boneEnvelopes')
      .replace(/\bmorph_envelopes\b/g, 'this.morphEnvelopes')
      .replace(/\bdefault_pos_m12\b/g, 'this.defaultPosM12')
      .replace(/\bpositions\b/g, 'this.positions')
      .replace(/\brotations\b/g, 'this.rotations')
      .replace(/\boffset_length\b/g, 'this.offsetLength')
      .replace(/\bframe_number\b/g, 'this.frameNumber')
      .replace(/\bx\b/g, 'this.x')
      .replace(/\by\b/g, 'this.y')
      .replace(/\bz\b/g, 'this.z')
      .replace(/\bpad\b/g, 'this.pad')
      .replace(/\bfactors\b/g, 'this.factors')
      .replace(/\banim_name\b/g, 'this.animName')
      .replace(/\bgroups\b/g, 'this.groups')
      .replace(/\beffects\b/g, 'this.effects')
      .replace(/\blods\b/g, 'this.lods')
      .replace(/\bvertices\b/g, 'this.vertices')
      .replace(/\bnormals\b/g, 'this.normals')
      .replace(/\buv_maps\b/g, 'this.uvMaps')
      .replace(/\bsurfaces\b/g, 'this.surfaces')
      .replace(/\bweight_maps\b/g, 'this.weightMaps')
      .replace(/\bmorph_maps\b/g, 'this.morphMaps')
      .replace(/\bweight_map_infos\b/g, 'this.weightMapInfos')
      .replace(/\buv_coords\b/g, 'this.uvCoords')
      .replace(/\bu\b/g, 'this.u')
      .replace(/\bv\b/g, 'this.v')
      .replace(/\bnx\b/g, 'this.nx')
      .replace(/\bny\b/g, 'this.ny')
      .replace(/\bnz\b/g, 'this.nz')
      .replace(/\bdummy\b/g, 'this.dummy')
      .replace(/\bfirst_vtx\b/g, 'this.firstVtx')
      .replace(/\btriangles\b/g, 'this.triangles')
      .replace(/\brelative_wmi\b/g, 'this.relativeWmi')
      .replace(/\bshader_exists\b/g, 'this.shaderExists')
      .replace(/\bshader_params\b/g, 'this.shaderParams')
      .replace(/\bshader_name\b/g, 'this.shaderName')
      .replace(/\bcolors\b/g, 'this.colors')
      .replace(/\bfloat_params\b/g, 'this.floatParams')
      .replace(/\bshader_flags\b/g, 'this.shaderFlags')
      .replace(/\bvtx\b/g, 'this.vtx')
      .replace(/\btexture_vtx\b/g, 'this.textureVtx')
      .replace(/\bweight\b/g, 'this.weight')
      .replace(/\bis_relative\b/g, 'this.isRelative')
      .replace(/\bsets\b/g, 'this.sets')
      .replace(/\bpos\b/g, 'this.pos')
      .replace(/\bnormal\b/g, 'this.normal')
      .replace(/\bindices\b/g, 'this.indices')
      .replace(/\bweights\b/g, 'this.weights')
      .replace(/\bbones\b/g, 'this.bones')
      .replace(/\bparent_id\b/g, 'this.parentId')
      .replace(/\babsolute_placement_matrix\b/g, 'this.absolutePlacementMatrix')
      .replace(/\babsolute_placement_q_vect\b/g, 'this.absolutePlacementQVect')
      .replace(/\bbone_length\b/g, 'this.boneLength')
      .replace(/\bw\b/g, 'this.w')
      .replace(/\btexture\b/g, 'this.texture')
      .replace(/\bchar_width\b/g, 'this.charWidth')
      .replace(/\bchar_height\b/g, 'this.charHeight')
      .replace(/\bchars\b/g, 'this.chars')
      .replace(/\boffset_x\b/g, 'this.offsetX')
      .replace(/\boffset_y\b/g, 'this.offsetY')
      .replace(/\bstart_x\b/g, 'this.startX')
      .replace(/\bstart_y\b/g, 'this.startY')
      .replace(/\bchunk_id\b/g, 'this.chunkId')
      .replace(/\bframe_infos\b/g, 'this.frameInfos')
      .replace(/\bmain_mip_vertices\b/g, 'this.mainMipVertices')
      .replace(/\bmip_masks\b/g, 'this.mipMasks')
      .replace(/\bmip_factors\b/g, 'this.mipFactors')
      .replace(/\bmodel_mip_infos\b/g, 'this.modelMipInfos')
      .replace(/\bpatches_v2\b/g, 'this.patchesV2')
      .replace(/\btexture_width\b/g, 'this.textureWidth')
      .replace(/\btexture_height\b/g, 'this.textureHeight')
      .replace(/\bshadow_quality\b/g, 'this.shadowQuality')
      .replace(/\bcenter\b/g, 'this.center')
      .replace(/\bcol_boxes\b/g, 'this.colBoxes')
      .replace(/\bcol_info\b/g, 'this.colInfo')
      .replace(/\battached_positions\b/g, 'this.attachedPositions')
      .replace(/\bcolor_names\b/g, 'this.colorNames')
      .replace(/\banimation_data\b/g, 'this.animationData')
      .replace(/\bcolor_d\b/g, 'this.colorD')
      .replace(/\bcolor_r\b/g, 'this.colorR')
      .replace(/\bcolor_s\b/g, 'this.colorS')
      .replace(/\bcolor_b\b/g, 'this.colorB')
      .replace(/\bboxes\b/g, 'this.boxes')
      .replace(/\bmasks\b/g, 'this.masks')
      .replace(/\bvalues\b/g, 'this.values')
      .replace(/\bipol\b/g, 'this.ipol')
      .replace(/\bpolygons\b/g, 'this.polygons')
      .replace(/\btexture_vertices\b/g, 'this.textureVertices')
      .replace(/\bmapping_surfaces\b/g, 'this.mappingSurfaces')
      .replace(/\bmembers\b/g, 'this.members')
      .replace(/\bpatches\b/g, 'this.patches')
      .replace(/\bfile\b/g, 'this.file')
      .replace(/\bcollide_as_cube\b/g, 'this.collideAsCube')
      .replace(/\bvelocity\b/g, 'this.velocity')
      .replace(/\bframes\b/g, 'this.frames')
      .replace(/\bvtx_c\b/g, 'this.vtxC')
      .replace(/\bvtx_f\b/g, 'this.vtxF')
      .replace(/\bvtx_u\b/g, 'this.vtxU')
      .replace(/\bpos_rel\b/g, 'this.posRel')
      .replace(/\bros_rel\b/g, 'this.rosRel')
      .replace(/\bnorm_index\b/g, 'this.normIndex')
      .replace(/\bnorm_h\b/g, 'this.normH')
      .replace(/\bnorm_p\b/g, 'this.normP')
      .replace(/\ba\b/g, 'this.a')
      .replace(/\bb\b/g, 'this.b')
      .replace(/\bface_forward\b/g, 'this.faceForward')
      .replace(/\breflections\b/g, 'this.reflections')
      .replace(/\breflections_half\b/g, 'this.reflectionsHalf')
      .replace(/\bhalf_face_forward\b/g, 'this.halfFaceForward')
      .replace(/\bcompressed_16bit\b/g, 'this.compressed16bit')
      .replace(/\bstretch_detail\b/g, 'this.stretchDetail')
      .replace(/\bbuild_number\b/g, 'this.buildNumber')
      .replace(/\bstart_id\b/g, 'this.startId')
      .replace(/\bmip_count\b/g, 'this.mipCount')
      .replace(/\bmips\b/g, 'this.mips')
      .replace(/\bsectors\b/g, 'this.sectors')
      .replace(/\bcolor\b/g, 'this.color')
      .replace(/\bambient_color\b/g, 'this.ambientColor')
      .replace(/\bflags2\b/g, 'this.flags2')
      .replace(/\bvis_flags\b/g, 'this.visFlags')
      .replace(/\bnf_flags\b/g, 'this.nfFlags')
      .replace(/\bvertices_id\b/g, 'this.verticesId')
      .replace(/\bplanes_id\b/g, 'this.planesId')
      .replace(/\bplanes\b/g, 'this.planes')
      .replace(/\bedges_id\b/g, 'this.edgesId')
      .replace(/\bedges\b/g, 'this.edges')
      .replace(/\bpolygons_id\b/g, 'this.polygonsId')
      .replace(/\bpolygons_ver\b/g, 'this.polygonsVer')
      .replace(/\bbsp0_id\b/g, 'this.bsp0Id')
      .replace(/\bbsp_tree\b/g, 'this.bspTree')
      .replace(/\bh\b/g, 'this.h')
      .replace(/\bp\b/g, 'this.p')
      .replace(/\bd\b/g, 'this.d')
      .replace(/\brot\b/g, 'this.rot')
      .replace(/\bquat\b/g, 'this.quat')
      .replace(/\bnodes\b/g, 'this.nodes')
      .replace(/\bend_marker\b/g, 'this.endMarker')
      .replace(/\bnode\b/g, 'this.node')
      .replace(/\blocation\b/g, 'this.location')
      .replace(/\bfront\b/g, 'this.front')
      .replace(/\bback\b/g, 'this.back')
      .replace(/\bplane_tag\b/g, 'this.planeTag')
      .replace(/\bvtx0\b/g, 'this.vtx0')
      .replace(/\bvtx1\b/g, 'this.vtx1')
      .replace(/\bplane_id\b/g, 'this.planeId')
      .replace(/\babzf_marker\b/g, 'this.abzfMarker')
      .replace(/\babzf_flags\b/g, 'this.abzfFlags')
      .replace(/\bproperties\b/g, 'this.properties')
      .replace(/\bvtxs\b/g, 'this.vtxs')
      .replace(/\belement_count\b/g, 'this.elementCount')
      .replace(/\belements\b/g, 'this.elements')
      .replace(/\bshadow_map\b/g, 'this.shadowMap')
      .replace(/\bshadow_color\b/g, 'this.shadowColor')
      .replace(/\blc_attribute\b/g, 'this.lcAttribute')
      .replace(/\blayers\b/g, 'this.layers')
      .replace(/\bpolygon_size_u\b/g, 'this.polygonSizeU')
      .replace(/\bpolygon_size_v\b/g, 'this.polygonSizeV')
      .replace(/\blayer\b/g, 'this.layer')
      .replace(/\btexture_id\b/g, 'this.textureId')
      .replace(/\bmapping\b/g, 'this.mapping')
      .replace(/\bscroll\b/g, 'this.scroll')
      .replace(/\bblend\b/g, 'this.blend')
      .replace(/\bsurface_type\b/g, 'this.surfaceType')
      .replace(/\billumination_type\b/g, 'this.illuminationType')
      .replace(/\bshadow_blend\b/g, 'this.shadowBlend')
      .replace(/\bmirror_type\b/g, 'this.mirrorType')
      .replace(/\bgradient_type\b/g, 'this.gradientType')
      .replace(/\bshadow_cluster_size\b/g, 'this.shadowClusterSize')
      .replace(/\bpretender_distance\b/g, 'this.pretenderDistance')
      .replace(/\buos\b/g, 'this.uos')
      .replace(/\buot\b/g, 'this.uot')
      .replace(/\bvos\b/g, 'this.vos')
      .replace(/\bvot\b/g, 'this.vot')
      .replace(/\buoffset\b/g, 'this.uoffset')
      .replace(/\bvofsset\b/g, 'this.vofsset')
      .replace(/\bportal_sector_links\b/g, 'this.portalSectorLinks')
      .replace(/\bsector_id\b/g, 'this.sectorId')
      .replace(/\bterrain_format\b/g, 'this.terrainFormat')
      .replace(/\bfile_type\b/g, 'this.fileType')
      .replace(/\bparse_entx\b/g, 'this.parseEntx')
      .replace(/\bparse_properties\b/g, 'this.parseProperties')
      .replace(/\bbrush_format\b/g, 'this.brushFormat')
      .replace(/\bhas_dtrs\b/g, 'this.hasDtrs')
      .replace(/\bname_len_inst\b/g, 'this.nameLenInst')
      .replace(/\bmisf_or_len\b/g, 'this.misfOrLen')
      .replace(/\binstance_name\b/g, 'this.instanceName')
      .replace(/\bend_magic\b/g, 'this.endMagic')
      .replace(/\bmesh_res_id\b/g, 'this.meshResId')
      .replace(/\btextures_magic\b/g, 'this.texturesmagic')
      .replace(/\bstart_magic\b/g, 'this.startMagic')
      .replace(/\banas_magic\b/g, 'this.anasMagic')
      .replace(/\bmiaq_magic\b/g, 'this.miaqMagic')
      .replace(/\bpasp_magic\b/g, 'this.paspMagic')
      .replace(/\bafbb_magic\b/g, 'this.afbbMagic')
      .replace(/\bmich_magic\b/g, 'this.michMagic')
      .replace(/\bchildren\b/g, 'this.children')
      .replace(/\bmagic_2\b/g, 'this.magic2')
      .replace(/\bmagic_3\b/g, 'this.magic3')
      .replace(/\btrhm_magic\b/g, 'this.trhmMagic')
      .replace(/\btrem_magic\b/g, 'this.tremMagic')
      .replace(/\bedge_dfnm\b/g, 'this.edgeDfnm')
      .replace(/\btrsm_chunk\b/g, 'this.trsmChunk')
      .replace(/\btrtm_lc\b/g, 'this.trtmLc')
      .replace(/\batrribute_map_lc\b/g, 'this.attributeMapLc')
      .replace(/\bheight_map\b/g, 'this.heightMap')
      .replace(/\bedge_map\b/g, 'this.edgeMap')
      .replace(/\bheight_map_size\b/g, 'this.heightMapSize')
      .replace(/\bedge_map_width\b/g, 'this.edgeMapWidth')
      .replace(/\bedge_map_height\b/g, 'this.edgeMapHeight')
      .replace(/\bedge_map_size\b/g, 'this.edgeMapSize')
      .replace(/\bshadow_map_width\b/g, 'this.shadowMapWidth')
      .replace(/\bshadow_map_height\b/g, 'this.shadowMapHeight')
      .replace(/\bshadow_map_size\b/g, 'this.shadowMapSize')
      .replace(/\btrgd_magic\b/g, 'this.trgdMagic')
      .replace(/\bdist_factor\b/g, 'this.distFactor')
      .replace(/\bmetric_size\b/g, 'this.metricSize')
      .replace(/\bmaps\b/g, 'this.maps')
      .replace(/\bshadow_time_lc\b/g, 'this.shadowTimeLc')
      .replace(/\bshadow_overbright_lc\b/g, 'this.shadowOverbrightLc')
      .replace(/\bblur_radius\b/g, 'this.blurRadius')
      .replace(/\bobject_shadow_color\b/g, 'this.objectShadowColor')
      .replace(/\bmap\b/g, 'this.map')
      .replace(/\bmap_width\b/g, 'this.mapWidth')
      .replace(/\bmap_height\b/g, 'this.mapHeight')
      .replace(/\bmap_size\b/g, 'this.mapSize')
      .replace(/\bterrain_size\b/g, 'this.terrainSize')
      .replace(/\bshading_map\b/g, 'this.shadingMap')
      .replace(/\btsen_magic\b/g, 'this.tsenMagic')
      .replace(/\bafter_tsen\b/g, 'this.afterTsen')
      .replace(/\bteen_magic\b/g, 'this.teenMagic')
      .replace(/\bthen_magic\b/g, 'this.thenMagic')
      .replace(/\bend_magic\b/g, 'this.endMagic')
      .replace(/\bshading_map_width\b/g, 'this.shadingMapWidth')
      .replace(/\bshading_map_height\b/g, 'this.shadingMapHeight')
      .replace(/\bshading_map_size\b/g, 'this.shadingMapSize')
      .replace(/\bstart_magic\b/g, 'this.startMagic')
      .replace(/\btlma_magic\b/g, 'this.tlmaMagic')
      .replace(/\bmask_width\b/g, 'this.maskWidth')
      .replace(/\bmask_height\b/g, 'this.maskHeight')
      .replace(/\bparams\b/g, 'this.params')
      .replace(/\bmask_size\b/g, 'this.maskSize')
      .replace(/\btrlt_magic\b/g, 'this.trltMagic')
      .replace(/\bversion_magic\b/g, 'this.versionMagic')
      .replace(/\btrlm_magic\b/g, 'this.trlmMagic')
      .replace(/\bmask\b/g, 'this.mask')
      .replace(/\balpha_texture\b/g, 'this.alphaTexture')
      .replace(/\btrlg_magic\b/g, 'this.trlgMagic')
      .replace(/\bis_visible\b/g, 'this.isVisible')
      .replace(/\blayer_type\b/g, 'this.layerType')
      .replace(/\bmultiply_color\b/g, 'this.multiplyColor')
      .replace(/\bmask_stretch\b/g, 'this.maskStretch')
      .replace(/\bsound_index\b/g, 'this.soundIndex')
      .replace(/\brotate_x\b/g, 'this.rotateX')
      .replace(/\brotate_y\b/g, 'this.rotateY')
      .replace(/\bstretch_x\b/g, 'this.stretchX')
      .replace(/\bstretch_y\b/g, 'this.stretchY')
      .replace(/\bis_auto_regenerated\b/g, 'this.isAutoRegenerated')
      .replace(/\bcoverage\b/g, 'this.coverage')
      .replace(/\bcoverage_noise\b/g, 'this.coverageNoise')
      .replace(/\bcoverage_random\b/g, 'this.coverageRandom')
      .replace(/\bis_apply_min_altitude\b/g, 'this.isApplyMinAltitude')
      .replace(/\bis_apply_max_altitude\b/g, 'this.isApplyMaxAltitude')
      .replace(/\bmin_altitude\b/g, 'this.minAltitude')
      .replace(/\bmax_altitude\b/g, 'this.maxAltitude')
      .replace(/\bmin_altitude_fade\b/g, 'this.minAltitudeFade')
      .replace(/\bmax_altitude_fade\b/g, 'this.maxAltitudeFade')
      .replace(/\bmin_altitude_noise\b/g, 'this.minAltitudeNoise')
      .replace(/\bmax_altitude_noise\b/g, 'this.maxAltitudeNoise')
      .replace(/\bmin_altitude_random\b/g, 'this.minAltitudeRandom')
      .replace(/\bmax_altitude_random\b/g, 'this.maxAltitudeRandom')
      .replace(/\bis_apply_min_slope\b/g, 'this.isApplyMinSlope')
      .replace(/\bis_apply_man_slope\b/g, 'this.isApplyManSlope')
      .replace(/\bmin_slope\b/g, 'this.minSlope')
      .replace(/\bmax_slope\b/g, 'this.maxSlope')
      .replace(/\bmin_slope_fade\b/g, 'this.minSlopeFade')
      .replace(/\bmax_slope_fade\b/g, 'this.maxSlopeFade')
      .replace(/\bmin_slope_noise\b/g, 'this.minSlopeNoise')
      .replace(/\bmax_slope_noise\b/g, 'this.maxSlopeNoise')
      .replace(/\bmin_slope_random\b/g, 'this.minSlopeRandom')
      .replace(/\bmax_slope_random\b/g, 'this.maxSlopeRandom')
      .replace(/\btlpr_magic\b/g, 'this.tlprMagic')
      .replace(/\bsmoothness\b/g, 'this.smoothness')
      .replace(/\btiles_in_row\b/g, 'this.tilesInRow')
      .replace(/\btiles_in_col\b/g, 'this.tilesInCol')
      .replace(/\bselected_tile\b/g, 'this.selectedTile')
      .replace(/\btile_width\b/g, 'this.tileWidth')
      .replace(/\btile_height\b/g, 'this.tileHeight')
      .replace(/\btile_u\b/g, 'this.tileU')
      .replace(/\btile_v\b/g, 'this.tileV')
      .replace(/\bis_old\b/g, 'this.isOld')
      .replace(/\bpsls_magic\b/g, 'this.pslsMagic')
      .replace(/\bpsle_magic\b/g, 'this.psleMagic')
      .replace(/\bbr3d_magic\b/g, 'this.br3dMagic')
      .replace(/\bbrmp_magic\b/g, 'this.brmpMagic')
      .replace(/\bbsc_magic\b/g, 'this.bscMagic')
      .replace(/\bvtxs_magic\b/g, 'this.vtxsMagic')
      .replace(/\bplns_magic\b/g, 'this.plnsMagic')
      .replace(/\bedgs_magic\b/g, 'this.edgsMagic')
      .replace(/\bbpos_magic\b/g, 'this.bposMagic')
      .replace(/\bbsp0_magic\b/g, 'this.bsp0Magic')
      .replace(/\bbspe_magic\b/g, 'this.bspeMagic')
      .replace(/\blshm_magic\b/g, 'this.lshmMagic')
      .replace(/\bshal_magic\b/g, 'this.shalMagic')
      .replace(/\bis_model\b/g, 'this.isModel')
      .replace(/\btexture_count\b/g, 'this.textureCount')
      .replace(/\bfilename_len\b/g, 'this.filenameLen')
      .replace(/\bfilename_str\b/g, 'this.filenameStr')
      .replace(/\bfilename\b/g, 'this.filename')
      .replace(/\bsurface\b/g, 'this.surface')
      .replace(/\bpretender_distance\b/g, 'this.pretenderDistance')
      .replace(/\bvtx_transformed\b/g, 'this.vtxTransformed')
      .replace(/\bhpb\b/g, 'this.hpb')
      .replace(/\bzoom\b/g, 'this.zoom')
      .replace(/\bshading_type\b/g, 'this.shadingType')
      .replace(/\btranslucency_type\b/g, 'this.translucencyType')
      .replace(/\bvtx_tex\b/g, 'this.vtxTex')
      .replace(/\bon_color\b/g, 'this.onColor')
      .replace(/\boff_color\b/g, 'this.offColor')
      .replace(/\boffset_2d\b/g, 'this.offset2d')
      .replace(/\bptc2_magic\b/g, 'this.ptc2Magic')
      .replace(/\bstxw_magic\b/g, 'this.stxwMagic')
      .replace(/\bstxh_magic\b/g, 'this.stxhMagic')
      .replace(/\bcoli_magic\b/g, 'this.coliMagic')
      .replace(/\bicln_magic\b/g, 'this.iclnMagic')
      .replace(/\badat_magic\b/g, 'this.adatMagic')
      .replace(/\bdfnm_magic\b/g, 'this.dfnmMagic')
      .replace(/\bchunkid\b/g, 'this.chunkId')
      .replace(/\bvalueStr\b/g, 'this.valueStr')
      .replace(/\bface_forward\b/g, 'this.faceForward')
      .replace(/\breflections\b/g, 'this.reflections')
      .replace(/\breflections_half\b/g, 'this.reflectionsHalf')
      .replace(/\bhalf_face_forward\b/g, 'this.halfFaceForward')
      .replace(/\bcompressed_16bit\b/g, 'this.compressed16bit')
      .replace(/\bstretch_detail\b/g, 'this.stretchDetail')
      .replace(/\bvertices_len\b/g, 'this.verticesLen')
      .replace(/\bafvx_magic\b/g, 'this.afvxMagic')
      .replace(/\bav17_magic\b/g, 'this.av17Magic')
      .replace(/\bafin_magic\b/g, 'this.afinMagic')
      .replace(/\bammv_magic\b/g, 'this.ammvMagic')
      .replace(/\bavmk_magic\b/g, 'this.avmkMagic')
      .replace(/\bimip_magic\b/g, 'this.imipMagic')
      .replace(/\bfmip_magic\b/g, 'this.fmipMagic')
      .replace(/\bipol_magic\b/g, 'this.ipolMagic')
      .replace(/\bmdp2_magic\b/g, 'this.mdp2Magic')
      .replace(/\btxv2_magic\b/g, 'this.txv2Magic')
      .replace(/\buv\b/g, 'this.uv')
      .replace(/\bvtx_transformed\b/g, 'this.vtxTransformed')
      .replace(/\boffset_2d\b/g, 'this.offset2d')
      .replace(/\bshading_type\b/g, 'this.shadingType')
      .replace(/\btranslucency_type\b/g, 'this.translucencyType')
      .replace(/\bvtx_tex\b/g, 'this.vtxTex')
      .replace(/\bon_color\b/g, 'this.onColor')
      .replace(/\boff_color\b/g, 'this.offColor')
      .replace(/\bctfilename\b/g, 'this.ctfilename')
      .replace(/\bmex2d\b/g, 'this.mex2d')
      .replace(/\braw\b/g, 'this.raw');
  }

  toCamelCase(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  toPascalCase(str) {
    return str.replace(/(^|_)([a-z])/g, (match, prefix, letter) => letter.toUpperCase());
  }
}