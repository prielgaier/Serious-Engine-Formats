import React from 'react';
import { X, FileText, Clock } from 'lucide-react';
import { ParsedFile, FILE_TYPES } from '../types/ParsedFile';

interface SidebarProps {
  isOpen: boolean;
  files: ParsedFile[];
  selectedFile: ParsedFile | null;
  onFileSelect: (file: ParsedFile) => void;
  onFileRemove: (fileId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  files,
  selectedFile,
  onFileSelect,
  onFileRemove
}) => {
  if (!isOpen) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileTypeInfo = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    return FILE_TYPES[extension] || {
      extension,
      name: 'Unknown',
      description: 'Unknown file type',
      color: 'bg-gray-500',
      icon: '📄'
    };
  };

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-80 glass-effect border-r border-white/20 z-40 overflow-hidden">
      <div className="p-4 border-b border-white/20">
        <h2 className="text-lg font-semibold text-secondary-900 mb-1">
          Loaded Files
        </h2>
        <p className="text-sm text-secondary-600">
          {files.length} file{files.length !== 1 ? 's' : ''} imported
        </p>
      </div>

      <div className="overflow-y-auto h-full pb-20">
        {files.length === 0 ? (
          <div className="p-4 text-center">
            <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
            <p className="text-secondary-500 text-sm">
              No files loaded yet
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {files.map((file) => {
              const typeInfo = getFileTypeInfo(file.name);
              const isSelected = selectedFile?.id === file.id;
              
              return (
                <div
                  key={file.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-primary-100 border border-primary-200'
                      : 'hover:bg-white/50 border border-transparent'
                  }`}
                  onClick={() => onFileSelect(file)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 ${typeInfo.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>
                      {typeInfo.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-secondary-900 truncate">
                        {file.name}
                      </h3>
                      <p className="text-xs text-secondary-600 truncate">
                        {typeInfo.name}
                      </p>
                      
                      <div className="flex items-center space-x-3 mt-2 text-xs text-secondary-500">
                        <span>{formatFileSize(file.size)}</span>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{file.parseTime}ms</span>
                        </div>
                      </div>
                      
                      {file.error && (
                        <p className="text-xs text-red-600 mt-1 truncate">
                          Error: {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove(file.id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-500 transition-all duration-200"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};