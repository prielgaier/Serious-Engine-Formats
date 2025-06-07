export interface ParsedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: any;
  rawData: ArrayBuffer;
  parseTime: number;
  error?: string;
}

export interface FileTypeInfo {
  extension: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const FILE_TYPES: Record<string, FileTypeInfo> = {
  ba: {
    extension: 'ba',
    name: 'Bone Animation',
    description: 'Skeletal animation data with bone envelopes and morph targets',
    color: 'bg-blue-500',
    icon: '🦴'
  },
  bae: {
    extension: 'bae',
    name: 'Bone Animation Effects',
    description: 'Animation effect groups with timing and flags',
    color: 'bg-purple-500',
    icon: '✨'
  },
  bm: {
    extension: 'bm',
    name: 'Bone Mesh',
    description: 'Mesh data with vertices, UV maps, and weight maps',
    color: 'bg-green-500',
    icon: '🔺'
  },
  bs: {
    extension: 'bs',
    name: 'Bone Skeleton',
    description: 'Skeleton hierarchy with bone placement data',
    color: 'bg-orange-500',
    icon: '🦴'
  },
  fnt: {
    extension: 'fnt',
    name: 'Font',
    description: 'Font texture and character data definitions',
    color: 'bg-pink-500',
    icon: '🔤'
  },
  mdl: {
    extension: 'mdl',
    name: 'Model',
    description: '3D model with textures, collision, and animation data',
    color: 'bg-indigo-500',
    icon: '🎯'
  },
  wld: {
    extension: 'wld',
    name: 'World',
    description: 'Complete world/level data with brushes and terrains',
    color: 'bg-emerald-500',
    icon: '🌍'
  },
  tex: {
    extension: 'tex',
    name: 'SE2 Metadata',
    description: 'Serious Engine 2 resource and type definitions',
    color: 'bg-cyan-500',
    icon: '📋'
  }
};