import React, { useState } from 'react';
import { ParsedFile, FILE_TYPES } from '../types/ParsedFile';
import { FileText, AlertCircle, Clock, HardDrive, Eye, BarChart3, Youtube as Cube, Mountain, Play, Binary } from 'lucide-react';
import { DataViewer } from './DataViewer';
import { ModelViewer3D } from './visualizers/ModelViewer3D';
import { TerrainViewer } from './visualizers/TerrainViewer';
import { AnimationTimeline } from './visualizers/AnimationTimeline';
import { DataChart } from './visualizers/DataChart';
import { HexViewer } from './visualizers/HexViewer';

interface FileViewerProps {
  file: ParsedFile | null;
}

type ViewMode = 'data' | '3d' | 'chart' | 'hex' | 'animation' | 'terrain';

export const FileViewer: React.FC<FileViewerProps> = ({ file }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('data');

  if (!file) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <FileText className="w-16 h-16 text-secondary-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-600 mb-2">
            No file selected
          </h3>
          <p className="text-secondary-500">
            Select a file from the sidebar to view its contents
          </p>
        </div>
      </div>
    );
  }

  const typeInfo = FILE_TYPES[file.type] || {
    extension: file.type,
    name: 'Unknown',
    description: 'Unknown file type',
    color: 'bg-gray-500',
    icon: '📄'
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getAvailableViews = (): { mode: ViewMode; label: string; icon: React.ReactNode }[] => {
    const views = [
      { mode: 'data' as ViewMode, label: 'Data Structure', icon: <Eye className="w-4 h-4" /> },
      { mode: 'chart' as ViewMode, label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
      { mode: 'hex' as ViewMode, label: 'Hex Viewer', icon: <Binary className="w-4 h-4" /> }
    ];

    // Add specialized views based on file type
    if (['mdl', 'bm'].includes(file.type)) {
      views.splice(1, 0, { mode: '3d' as ViewMode, label: '3D Model', icon: <Cube className="w-4 h-4" /> });
    }

    if (['ba', 'bae'].includes(file.type)) {
      views.splice(1, 0, { mode: 'animation' as ViewMode, label: 'Animation', icon: <Play className="w-4 h-4" /> });
    }

    if (file.type === 'wld') {
      views.splice(1, 0, { mode: 'terrain' as ViewMode, label: 'Terrain', icon: <Mountain className="w-4 h-4" /> });
    }

    return views;
  };

  const renderContent = () => {
    if (file.error) {
      return (
        <div className="glass-effect rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">Parse Error</h3>
          <p className="text-red-600">{file.error}</p>
        </div>
      );
    }

    switch (viewMode) {
      case '3d':
        return <ModelViewer3D modelData={file.data} />;
      
      case 'terrain':
        return <TerrainViewer terrainData={file.data} />;
      
      case 'animation':
        return <AnimationTimeline animationData={file.data} />;
      
      case 'chart':
        return <DataChart data={file.data} fileType={file.type} />;
      
      case 'hex':
        return <HexViewer data={file.rawData} fileName={file.name} />;
      
      case 'data':
      default:
        return <DataViewer data={file.data} fileType={file.type} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* File Header */}
      <div className="glass-effect rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start space-x-4">
            <div className={`w-12 h-12 ${typeInfo.color} rounded-xl flex items-center justify-center text-white text-lg`}>
              {typeInfo.icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900 mb-1">
                {file.name}
              </h1>
              <p className="text-secondary-600 mb-2">
                {typeInfo.name} • {typeInfo.description}
              </p>
              
              {file.error && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Parse Error: {file.error}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
            <HardDrive className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm font-medium text-secondary-900">File Size</p>
              <p className="text-xs text-secondary-600">{formatFileSize(file.size)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
            <Clock className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm font-medium text-secondary-900">Parse Time</p>
              <p className="text-xs text-secondary-600">{file.parseTime}ms</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-white/50 rounded-lg">
            <FileText className="w-5 h-5 text-secondary-500" />
            <div>
              <p className="text-sm font-medium text-secondary-900">Format</p>
              <p className="text-xs text-secondary-600">.{file.type.toUpperCase()}</p>
            </div>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex flex-wrap gap-2">
          {getAvailableViews().map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-primary-500 text-white shadow-lg'
                  : 'bg-white/50 text-secondary-700 hover:bg-white/70'
              }`}
            >
              {icon}
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};