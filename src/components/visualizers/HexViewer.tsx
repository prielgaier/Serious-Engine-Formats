import React, { useState, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Search, Download, Copy, Check } from 'lucide-react';

interface HexViewerProps {
  data: ArrayBuffer;
  fileName: string;
}

export const HexViewer: React.FC<HexViewerProps> = ({ data, fileName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [copiedOffset, setCopiedOffset] = useState<number | null>(null);

  const uint8Array = useMemo(() => new Uint8Array(data), [data]);
  const totalRows = Math.ceil(uint8Array.length / 16);

  const hexData = useMemo(() => {
    const rows = [];
    for (let i = 0; i < totalRows; i++) {
      const offset = i * 16;
      const rowData = uint8Array.slice(offset, offset + 16);
      rows.push({
        offset,
        bytes: Array.from(rowData),
        ascii: Array.from(rowData).map(byte => 
          byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
        ).join('')
      });
    }
    return rows;
  }, [uint8Array, totalRows]);

  const handleSearch = () => {
    if (!searchTerm) {
      setSearchResults([]);
      return;
    }

    const results: number[] = [];
    const searchBytes = searchTerm.match(/[0-9a-fA-F]{2}/g);
    
    if (searchBytes) {
      // Hex search
      const pattern = searchBytes.map(hex => parseInt(hex, 16));
      for (let i = 0; i <= uint8Array.length - pattern.length; i++) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
          if (uint8Array[i + j] !== pattern[j]) {
            match = false;
            break;
          }
        }
        if (match) results.push(i);
      }
    } else {
      // ASCII search
      const encoder = new TextEncoder();
      const pattern = encoder.encode(searchTerm);
      for (let i = 0; i <= uint8Array.length - pattern.length; i++) {
        let match = true;
        for (let j = 0; j < pattern.length; j++) {
          if (uint8Array[i + j] !== pattern[j]) {
            match = false;
            break;
          }
        }
        if (match) results.push(i);
      }
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
  };

  const copyToClipboard = async (text: string, offset: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedOffset(offset);
      setTimeout(() => setCopiedOffset(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const exportHex = () => {
    const hexString = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join(' ');
    
    const blob = new Blob([hexString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.hex`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = hexData[index];
    const isSearchResult = searchResults.some(result => 
      result >= row.offset && result < row.offset + 16
    );

    return (
      <div style={style} className={`flex font-mono text-sm ${isSearchResult ? 'bg-yellow-100' : ''}`}>
        {/* Offset */}
        <div className="w-20 text-secondary-500 pr-4 flex-shrink-0">
          {row.offset.toString(16).padStart(8, '0').toUpperCase()}
        </div>

        {/* Hex bytes */}
        <div className="flex-1 grid grid-cols-16 gap-1 pr-4">
          {Array.from({ length: 16 }, (_, i) => {
            const byte = row.bytes[i];
            const globalOffset = row.offset + i;
            const isHighlighted = searchResults.includes(globalOffset);
            
            return (
              <button
                key={i}
                className={`text-center hover:bg-primary-100 rounded px-1 ${
                  isHighlighted ? 'bg-yellow-300' : ''
                } ${byte === undefined ? 'text-secondary-300' : 'text-secondary-700'}`}
                onClick={() => copyToClipboard(
                  byte?.toString(16).padStart(2, '0').toUpperCase() || '',
                  globalOffset
                )}
                title={`Offset: 0x${globalOffset.toString(16).toUpperCase()}, Value: ${byte || 0}`}
              >
                {byte !== undefined ? byte.toString(16).padStart(2, '0').toUpperCase() : '  '}
              </button>
            );
          })}
        </div>

        {/* ASCII */}
        <div className="w-20 text-secondary-600 font-mono border-l border-secondary-200 pl-2">
          {row.ascii}
        </div>

        {/* Copy indicator */}
        {copiedOffset !== null && copiedOffset >= row.offset && copiedOffset < row.offset + 16 && (
          <div className="ml-2 text-green-600">
            <Check className="w-4 h-4" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-effect rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary-900">Hex Viewer</h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={exportHex}
            className="btn-secondary text-sm py-2 px-3 flex items-center space-x-1"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search hex (e.g., 4D 44 41 54) or ASCII text..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="input-field pr-10"
          />
          <button
            onClick={handleSearch}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-secondary-100 rounded"
          >
            <Search className="w-4 h-4 text-secondary-500" />
          </button>
        </div>
        
        {searchResults.length > 0 && (
          <div className="flex items-center space-x-2 text-sm text-secondary-600">
            <span>{searchResults.length} results</span>
            <button
              onClick={() => setCurrentSearchIndex(Math.max(0, currentSearchIndex - 1))}
              disabled={currentSearchIndex === 0}
              className="px-2 py-1 bg-secondary-100 rounded disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={() => setCurrentSearchIndex(Math.min(searchResults.length - 1, currentSearchIndex + 1))}
              disabled={currentSearchIndex === searchResults.length - 1}
              className="px-2 py-1 bg-secondary-100 rounded disabled:opacity-50"
            >
              ↓
            </button>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="flex items-center justify-between text-sm text-secondary-600 bg-secondary-50 rounded-lg p-3">
        <div>
          <span className="font-medium">Size:</span> {uint8Array.length.toLocaleString()} bytes
        </div>
        <div>
          <span className="font-medium">Rows:</span> {totalRows.toLocaleString()}
        </div>
        <div>
          <span className="font-medium">Format:</span> 16 bytes per row
        </div>
      </div>

      {/* Header */}
      <div className="flex font-mono text-xs text-secondary-500 border-b border-secondary-200 pb-2">
        <div className="w-20 pr-4">Offset</div>
        <div className="flex-1 grid grid-cols-16 gap-1 pr-4">
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} className="text-center">
              {i.toString(16).toUpperCase()}
            </div>
          ))}
        </div>
        <div className="w-20 border-l border-secondary-200 pl-2">ASCII</div>
      </div>

      {/* Hex Data */}
      <div className="border border-secondary-200 rounded-lg overflow-hidden">
        <List
          height={400}
          itemCount={totalRows}
          itemSize={24}
          itemData={hexData}
        >
          {Row}
        </List>
      </div>

      {/* Instructions */}
      <div className="text-xs text-secondary-500 bg-secondary-50 rounded-lg p-3">
        <p><strong>Instructions:</strong></p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>Click on any hex byte to copy it to clipboard</li>
          <li>Search for hex patterns (e.g., "4D 44 41 54") or ASCII text</li>
          <li>Use arrow buttons to navigate through search results</li>
          <li>Export the entire hex dump using the Export button</li>
        </ul>
      </div>
    </div>
  );
};