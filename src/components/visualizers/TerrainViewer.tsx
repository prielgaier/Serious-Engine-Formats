import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Mountain, Layers, Palette, Eye, EyeOff } from 'lucide-react';

interface TerrainViewerProps {
  terrainData: any;
}

export const TerrainViewer: React.FC<TerrainViewerProps> = ({ terrainData }) => {
  const [showWireframe, setShowWireframe] = useState(false);
  const [showLayers, setShowLayers] = useState(true);
  const [selectedLayer, setSelectedLayer] = useState(0);
  const [heightScale, setHeightScale] = useState(1);

  const terrainMesh = useMemo(() => {
    if (!terrainData?.data) return null;

    try {
      const width = terrainData.data.hmWidth || 64;
      const height = terrainData.data.hmHeight || 64;
      const heightMap = terrainData.heightMap;

      if (!heightMap) return null;

      // Create geometry from height map
      const geometry = new THREE.PlaneGeometry(width, height, width - 1, height - 1);
      const vertices = geometry.attributes.position.array as Float32Array;

      // Apply height data
      for (let i = 0; i < vertices.length; i += 3) {
        const x = Math.floor((i / 3) % width);
        const y = Math.floor((i / 3) / width);
        const heightIndex = (y * width + x) * 2; // 2 bytes per height value
        
        if (heightIndex < heightMap.length - 1) {
          const heightValue = (heightMap[heightIndex] | (heightMap[heightIndex + 1] << 8)) / 65535.0;
          vertices[i + 2] = heightValue * heightScale * 10; // Scale height
        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals();

      return geometry;
    } catch (error) {
      console.error('Error creating terrain mesh:', error);
      return null;
    }
  }, [terrainData, heightScale]);

  const layers = terrainData?.layers || [];

  return (
    <div className="w-full h-[600px] bg-secondary-900 rounded-xl overflow-hidden relative">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[50, 50, 50]} />
        <OrbitControls enablePan enableZoom enableRotate />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[100, 100, 50]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-100}
          shadow-camera-right={100}
          shadow-camera-top={100}
          shadow-camera-bottom={-100}
        />

        {/* Terrain Mesh */}
        {terrainMesh && (
          <mesh geometry={terrainMesh} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <meshLambertMaterial
              color="#4ade80"
              wireframe={showWireframe}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </Canvas>

      {/* Controls */}
      <div className="absolute top-4 left-4 glass-effect rounded-lg p-4 max-w-xs">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center">
          <Mountain className="w-4 h-4 mr-2" />
          Terrain Controls
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/80">Wireframe</span>
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              className={`p-1 rounded ${showWireframe ? 'bg-primary-500' : 'bg-white/20'} text-white`}
            >
              <Eye className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-white/80">Height Scale</span>
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={heightScale}
              onChange={(e) => setHeightScale(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="text-xs text-white/60">{heightScale}x</div>
          </div>

          {layers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center">
                <Layers className="w-3 h-3 mr-1" />
                <span className="text-xs text-white/80">Layers ({layers.length})</span>
              </div>
              <select
                value={selectedLayer}
                onChange={(e) => setSelectedLayer(parseInt(e.target.value))}
                className="w-full bg-white/20 text-white text-xs rounded px-2 py-1"
              >
                {layers.map((layer: any, index: number) => (
                  <option key={index} value={index} className="bg-secondary-800">
                    Layer {index + 1}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Terrain Info */}
      <div className="absolute top-4 right-4 glass-effect rounded-lg p-3">
        <div className="text-xs text-white/80 space-y-1">
          <div>Size: {terrainData?.data?.hmWidth || 0} × {terrainData?.data?.hmHeight || 0}</div>
          <div>Layers: {layers.length}</div>
          <div>Version: {terrainData?.version || 'Unknown'}</div>
        </div>
      </div>

      {/* Layer Details */}
      {layers.length > 0 && selectedLayer < layers.length && (
        <div className="absolute bottom-4 left-4 right-4 glass-effect rounded-lg p-4">
          <h4 className="text-sm font-semibold text-white mb-2">
            Layer {selectedLayer + 1} Details
          </h4>
          <div className="grid grid-cols-2 gap-4 text-xs text-white/80">
            <div>
              <div>Type: {layers[selectedLayer]?.params?.layerType || 'Unknown'}</div>
              <div>Visible: {layers[selectedLayer]?.params?.isVisible ? 'Yes' : 'No'}</div>
            </div>
            <div>
              <div>Coverage: {layers[selectedLayer]?.params?.coverage || 0}</div>
              <div>Auto-gen: {layers[selectedLayer]?.params?.isAutoRegenerated ? 'Yes' : 'No'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};