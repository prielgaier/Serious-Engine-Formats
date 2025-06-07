import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';

interface DataViewerProps {
  data: any;
  fileType: string;
}

export const DataViewer: React.FC<DataViewerProps> = ({ data, fileType }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleNode = (path: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedNodes(newExpanded);
  };

  const copyToClipboard = async (text: string, path: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const renderValue = (value: any, path: string, key?: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-secondary-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return <span className={`font-medium ${value ? 'text-green-600' : 'text-red-600'}`}>{String(value)}</span>;
    }

    if (typeof value === 'number') {
      return <span className="text-blue-600 font-mono">{value}</span>;
    }

    if (typeof value === 'string') {
      return (
        <div className="flex items-center space-x-2">
          <span className="text-green-700 font-mono">"{value}"</span>
          <button
            onClick={() => copyToClipboard(value, path)}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary-100 rounded transition-all duration-200"
            title="Copy value"
          >
            {copiedPath === path ? (
              <Check className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3 text-secondary-400" />
            )}
          </button>
        </div>
      );
    }

    if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      const bytes = value instanceof ArrayBuffer ? new Uint8Array(value) : value;
      const preview = Array.from(bytes.slice(0, 16))
        .map(b => b.toString(16).padStart(2, '0'))
        .join(' ');
      
      return (
        <div className="space-y-2">
          <span className="text-purple-600 font-mono text-sm">
            Binary data ({bytes.length} bytes)
          </span>
          <div className="bg-secondary-50 p-2 rounded font-mono text-xs text-secondary-600">
            {preview}{bytes.length > 16 ? '...' : ''}
          </div>
        </div>
      );
    }

    if (Array.isArray(value)) {
      const isExpanded = expandedNodes.has(path);
      return (
        <div>
          <button
            onClick={() => toggleNode(path)}
            className="flex items-center space-x-1 hover:bg-secondary-50 rounded px-1 py-0.5 transition-colors duration-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-secondary-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-secondary-500" />
            )}
            <span className="text-orange-600 font-medium">
              Array ({value.length} items)
            </span>
          </button>
          
          {isExpanded && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-secondary-100 pl-4">
              {value.slice(0, 100).map((item, index) => (
                <div key={index} className="group">
                  <div className="flex items-start space-x-2">
                    <span className="text-secondary-500 font-mono text-sm min-w-[2rem]">
                      [{index}]
                    </span>
                    <div className="flex-1">
                      {renderValue(item, `${path}[${index}]`)}
                    </div>
                  </div>
                </div>
              ))}
              {value.length > 100 && (
                <div className="text-secondary-500 text-sm italic">
                  ... and {value.length - 100} more items
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (typeof value === 'object') {
      const isExpanded = expandedNodes.has(path);
      const entries = Object.entries(value);
      
      return (
        <div>
          <button
            onClick={() => toggleNode(path)}
            className="flex items-center space-x-1 hover:bg-secondary-50 rounded px-1 py-0.5 transition-colors duration-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-secondary-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-secondary-500" />
            )}
            <span className="text-indigo-600 font-medium">
              Object ({entries.length} properties)
            </span>
          </button>
          
          {isExpanded && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-secondary-100 pl-4">
              {entries.map(([objKey, objValue]) => (
                <div key={objKey} className="group">
                  <div className="flex items-start space-x-2">
                    <span className="text-secondary-700 font-medium min-w-[8rem] text-sm">
                      {objKey}:
                    </span>
                    <div className="flex-1">
                      {renderValue(objValue, `${path}.${objKey}`, objKey)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return <span className="text-secondary-600">{String(value)}</span>;
  };

  return (
    <div className="glass-effect rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-900">
          Parsed Data Structure
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setExpandedNodes(new Set(['root']))}
            className="btn-secondary text-sm py-2 px-4"
          >
            Collapse All
          </button>
          <button
            onClick={() => {
              const allPaths = new Set(['root']);
              const addPaths = (obj: any, currentPath: string) => {
                if (typeof obj === 'object' && obj !== null) {
                  allPaths.add(currentPath);
                  if (Array.isArray(obj)) {
                    obj.forEach((_, index) => {
                      addPaths(obj[index], `${currentPath}[${index}]`);
                    });
                  } else {
                    Object.keys(obj).forEach(key => {
                      addPaths(obj[key], `${currentPath}.${key}`);
                    });
                  }
                }
              };
              addPaths(data, 'root');
              setExpandedNodes(allPaths);
            }}
            className="btn-secondary text-sm py-2 px-4"
          >
            Expand All
          </button>
        </div>
      </div>
      
      <div className="bg-white/50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-[600px]">
        {renderValue(data, 'root')}
      </div>
    </div>
  );
};