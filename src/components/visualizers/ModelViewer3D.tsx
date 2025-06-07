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

  const totalFrames = animationData?.frameCount?.value || modelData?.header?.frameCount?.value || 1;

  return (
    <div className="w-full h-[600px] bg-secondary-900 rounded-xl overflow-hidden relative">
      {/* 3D Canvas */}
      <Canvas shadows>
        <Suspense fallback={<LoadingSpinner />}>
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
          
          {/* Stats */}
          {showStats && <Stats />}
        </Suspense>
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

      {/* Animation Loop */}
      <AnimationController
        isPlaying={isPlaying}
        currentFrame={currentFrame}
        totalFrames={totalFrames}
        speed={animationSpeed}
        onFrameChange={setCurrentFrame}
      />
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

      if (modelData.vertices?.data) {
        // Handle AFVX/AV17 format (frame-based vertices)
        const frameVertices = modelData.vertices.data;
        const vtxCount = modelData.header?.vtxCount?.value || 0;
        const frameOffset = currentFrame * vtxCount;
        
        for (let i = 0; i < vtxCount; i++) {
          const vtx = frameVertices[frameOffset + i];
          if (vtx) {
            vertices.push(vtx.x || 0, vtx.y || 0, vtx.z || 0);
          }
        }
      } else if (modelData.mainMipVertices?.vertices) {
        // Handle main mip vertices
        modelData.mainMipVertices.vertices.forEach((vtx: any) => {
          vertices.push(vtx.x || 0, vtx.y || 0, vtx.z || 0);
        });
      } else if (modelData.lods?.[0]?.vertices) {
        // Handle LOD vertices
        modelData.lods[0].vertices.forEach((vtx: any) => {
          vertices.push(vtx.x || 0, vtx.y || 0, vtx.z || 0);
        });
      }

      // Extract normals
      if (modelData.lods?.[0]?.normals) {
        modelData.lods[0].normals.forEach((normal: any) => {
          normals.push(normal.x || 0, normal.y || 0, normal.z || 0);
        });
      }

      // Extract UV coordinates
      if (modelData.lods?.[0]?.uvMaps?.[0]?.uvCoords) {
        modelData.lods[0].uvMaps[0].uvCoords.forEach((uv: any) => {
          uvs.push(uv.u || 0, uv.v || 0);
        });
      }

      // Extract indices from surfaces
      if (modelData.lods?.[0]?.surfaces) {
        modelData.lods[0].surfaces.forEach((surface: any) => {
          if (surface.triangles) {
            surface.triangles.forEach((tri: any) => {
              if (tri.vertices) {
                indices.push(...tri.vertices);
              }
            });
          }
        });
      }

      // Set geometry attributes
      if (vertices.length > 0) {
        geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      }
      
      if (normals.length > 0) {
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      } else {
        geom.computeVertexNormals();
      }
      
      if (uvs.length > 0) {
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      }
      
      if (indices.length > 0) {
        geom.setIndex(indices);
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

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
);