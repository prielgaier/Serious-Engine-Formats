import React from 'react';
import { Menu, X, FileText, Trash2 } from 'lucide-react';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  fileCount: number;
  onClearAll: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  sidebarOpen,
  setSidebarOpen,
  fileCount,
  onClearAll
}) => {
  return (
    <header className="glass-effect border-b border-white/20 sticky top-0 z-50">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors duration-200"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-secondary-600" />
            ) : (
              <Menu className="w-5 h-5 text-secondary-600" />
            )}
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-secondary-900">
                Serious Engine Editor
              </h1>
              <p className="text-xs text-secondary-500">
                File Format Analyzer
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {fileCount > 0 && (
            <>
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-100 rounded-full">
                <span className="text-sm font-medium text-primary-700">
                  {fileCount} file{fileCount !== 1 ? 's' : ''}
                </span>
              </div>
              
              <button
                onClick={onClearAll}
                className="flex items-center space-x-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Clear all files"
              >
                <Trash2 className="w-4 h-4" />
                <span className="text-sm font-medium">Clear All</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};