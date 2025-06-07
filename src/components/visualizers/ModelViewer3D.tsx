import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Stats, Environment, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut, Grid as Grid3X3, Eye, EyeOff } from 'lucide-react';

interface ModelViewer3DProps {
  modelData: any;
  animationData?: any;
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({ modelData, animationData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const totalFrames = animationData?.frameCount?.value || modelData?.header?.frameCount?.value || 1;

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-[600px] bg-secondary-900 rounded-xl overflow-hidden relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary-900 z-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      )}

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 5, 5]} />
        <OrbitControls enablePan enableZoom enableRotate />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />
        
        {/* Environment */}
        <Environment preset="studio" />
        
        {/* Grid */}
        {showGrid && <Grid infiniteGrid fadeDistance={50} fadeStrength={5} />}
        
        {/* Model */}
        <ModelMesh 
          modelData={modelData}
          currentFrame={currentFrame}
          showWireframe={showWireframe}
        />
        
        {/* Animation Controller - moved inside Canvas */}
        <AnimationController
          isPlaying={isPlaying}
          currentFrame={currentFrame}
          totalFrames={totalFrames}
          speed={animationSpeed}
          onFrameChange={setCurrentFrame}
        />
        
        {/* Stats */}
        {showStats && <Stats />}
      </Canvas>

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="glass-effect rounded-lg p-3 space-y-2">
          <h3 className="text-sm font-semibold text-white mb-2">Model Controls</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`p-2 rounded ${showWireframe ? 'bg-primary-500' : 'bg-white/20'} text-white hover:bg-primary-600 transition-colors`}
              title="Toggle Wireframe"
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`p-2 rounded ${showGrid ? 'bg-primary-500' : 'bg-white/20'} text-white hover:bg-primary-600 transition-colors`}
              title="Toggle Grid"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowStats(!showStats)}
              className={`p-2 rounded ${showStats ? 'bg-primary-500' : 'bg-white/20'} text-white hover:bg-primary-600 transition-colors`}
              title="Toggle Stats"
            >
              <EyeOff className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="glass-effect rounded-lg p-3">
          <div className="text-xs text-white/80 space-y-1">
            <div>Vertices: {modelData?.header?.vtxCount?.value || 0}</div>
            <div>Frames: {totalFrames}</div>
            <div>LODs: {modelData?.header?.lodCount || modelData?.lods?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Animation Controls */}
      {totalFrames > 1 && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="glass-effect rounded-lg p-4">
            <div className="flex items-center space-x-4 mb-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="p-2 bg-primary-500 hover:bg-primary-600 rounded text-white transition-colors"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setCurrentFrame(0)}
                className="p-2 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="text-sm text-white">
                Frame {currentFrame + 1} / {totalFrames}
              </div>
            </div>
            
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={totalFrames - 1}
                value={currentFrame}
                onChange={(e) => setCurrentFrame(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>Speed:</span>
                <input
                  type="range"
                  min="0.1"
                  max="3"
                  step="0.1"
                  value={animationSpeed}
                  onChange={(e) => setAnimationSpeed(parseFloat(e.target.value))}
                  className="w-20"
                />
                <span>{animationSpeed}x</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModelMesh: React.FC<{
  modelData: any;
  currentFrame: number;
  showWireframe: boolean;
}> = ({ modelData, currentFrame, showWireframe }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    if (!modelData) return;

    const geom = new THREE.BufferGeometry();
    
    try {
      // Extract vertex data based on model format
      let vertices: number[] = [];
      let indices: number[] = [];
      let normals: number[] = [];
      let uvs: number[] = [];

      // Get the first LOD for mesh data
      const lod = modelData.lods?.[0];
      if (!lod) {
        console.warn('No LOD data found in model');
        return;
      }

      // Extract vertices
      if (lod.vertices) {
        lod.vertices.forEach((vtx: any) => {
          if (vtx.x !== undefined && vtx.y !== undefined && vtx.z !== undefined) {
            vertices.push(vtx.x, vtx.y, vtx.z);
          } else {
            // Handle old format vertices
            vertices.push(vtx.x || 0, vtx.y || 0, vtx.z || 0);
          }
        });
      }

      // Extract normals
      if (lod.normals) {
        lod.normals.forEach((normal: any) => {
          if (normal.nx !== undefined && normal.ny !== undefined && normal.nz !== undefined) {
            normals.push(normal.nx, normal.ny, normal.nz);
          } else if (normal.x !== undefined && normal.y !== undefined && normal.z !== undefined) {
            normals.push(normal.x, normal.y, normal.z);
          } else {
            normals.push(0, 1, 0); // Default normal
          }
        });
      }

      // Extract UV coordinates from first UV map
      if (lod.uvMaps?.[0]?.uvCoords) {
        lod.uvMaps[0].uvCoords.forEach((uv: any) => {
          uvs.push(uv.u || 0, uv.v || 0);
        });
      }

      // Extract indices from surfaces with proper validation
      if (lod.surfaces) {
        lod.surfaces.forEach((surface: any) => {
          if (surface.triangles) {
            surface.triangles.forEach((tri: any) => {
              if (tri.vertices && tri.vertices.length === 3) {
                // Validate vertex indices
                const v0 = tri.vertices[0];
                const v1 = tri.vertices[1];
                const v2 = tri.vertices[2];
                
                // Check if indices are within valid range
                const maxIndex = Math.floor(vertices.length / 3) - 1;
                if (v0 <= maxIndex && v1 <= maxIndex && v2 <= maxIndex && 
                    v0 >= 0 && v1 >= 0 && v2 >= 0) {
                  
                  // Handle surface-relative vertices
                  const firstVtx = surface.firstVtx || 0;
                  if (lod.flags?.isSurfaceRelativeVertices) {
                    indices.push(firstVtx + v0, firstVtx + v1, firstVtx + v2);
                  } else {
                    indices.push(v0, v1, v2);
                  }
                } else {
                  console.warn(`Invalid triangle indices: ${v0}, ${v1}, ${v2} (max: ${maxIndex})`);
                }
              }
            });
          }
        });
      }

      // Set geometry attributes
      if (vertices.length > 0) {
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        console.log(`Loaded ${vertices.length / 3} vertices`);
      }
      
      if (normals.length > 0 && normals.length === vertices.length) {
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      } else {
        geom.computeVertexNormals();
      }
      
      if (uvs.length > 0 && uvs.length === (vertices.length / 3) * 2) {
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
      
      if (indices.length > 0) {
        // Validate all indices before setting
        const maxVertexIndex = Math.floor(vertices.length / 3) - 1;
        const validIndices = indices.filter(index => index >= 0 && index <= maxVertexIndex);
        
        if (validIndices.length === indices.length && validIndices.length % 3 === 0) {
          geom.setIndex(validIndices);
          console.log(`Loaded ${validIndices.length / 3} triangles`);
        } else {
          console.warn(`Invalid indices detected. Expected ${indices.length}, got ${validIndices.length} valid indices`);
        }
      }

      geom.computeBoundingSphere();
      setGeometry(geom);
    } catch (error) {
      console.error('Error creating geometry:', error);
      // Fallback to a simple box
      setGeometry(new THREE.BoxGeometry(1, 1, 1));
    }

    return () => {
      geom.dispose();
    };
  }, [modelData, currentFrame]);

  if (!geometry) return null;

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color="#4f46e5"
        wireframe={showWireframe}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const AnimationController: React.FC<{
  isPlaying: boolean;
  currentFrame: number;
  totalFrames: number;
  speed: number;
  onFrameChange: (frame: number) => void;
}> = ({ isPlaying, currentFrame, totalFrames, speed, onFrameChange }) => {
  const frameRef = useRef(currentFrame);
  const lastTimeRef = useRef(0);

  useFrame((state) => {
    if (!isPlaying || totalFrames <= 1) return;

    const currentTime = state.clock.elapsedTime;
    const deltaTime = currentTime - lastTimeRef.current;
    
    // Update frame based on speed (assuming 30 FPS base)
    if (deltaTime >= (1 / 30) / speed) {
      frameRef.current = (frameRef.current + 1) % totalFrames;
      onFrameChange(frameRef.current);
      lastTimeRef.current = currentTime;
    }
  });

  useEffect(() => {
    frameRef.current = currentFrame;
  }, [currentFrame]);

  return null;
};