import React from 'react';
import { ParsedFile, FILE_TYPES } from '../types/ParsedFile';
import { FileText, AlertCircle, Clock, HardDrive } from 'lucide-react';
import { DataViewer } from './DataViewer';

interface FileViewerProps {
  file: ParsedFile | null;
}

export const FileViewer: React.FC<FileViewerProps> = ({ file }) => {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

      {/* File Data */}
      {!file.error && file.data && (
        <DataViewer data={file.data} fileType={file.type} />
      )}
    </div>
  );
};