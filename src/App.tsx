import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { FileViewer } from './components/FileViewer';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ParsedFile } from './types/ParsedFile';

function App() {
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ParsedFile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleFilesParsed = (files: ParsedFile[]) => {
    setParsedFiles(prev => [...prev, ...files]);
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (file: ParsedFile) => {
    setSelectedFile(file);
  };

  const handleFileRemove = (fileId: string) => {
    setParsedFiles(prev => prev.filter(f => f.id !== fileId));
    if (selectedFile?.id === fileId) {
      const remaining = parsedFiles.filter(f => f.id !== fileId);
      setSelectedFile(remaining.length > 0 ? remaining[0] : null);
    }
  };

  const clearAllFiles = () => {
    setParsedFiles([]);
    setSelectedFile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
      <Header 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        fileCount={parsedFiles.length}
        onClearAll={clearAllFiles}
      />
      
      <div className="flex">
        <Sidebar
          isOpen={sidebarOpen}
          files={parsedFiles}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
          onFileRemove={handleFileRemove}
        />
        
        <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
          <div className="p-6">
            {parsedFiles.length === 0 ? (
              <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8 animate-fade-in">
                  <h1 className="text-4xl font-bold text-secondary-900 mb-4">
                    Serious Engine File Editor
                  </h1>
                  <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
                    Import and analyze Serious Engine game files including models, animations, 
                    worlds, and more. Supports all major SE1 and SE2 formats.
                  </p>
                </div>
                
                <FileUpload onFilesParsed={handleFilesParsed} />
                
                <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="glass-effect rounded-xl p-6 card-hover">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-primary-600 font-bold text-xl">3D</span>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">3D Models</h3>
                    <p className="text-secondary-600 text-sm">
                      View and analyze .mdl files with vertices, textures, and animation data
                    </p>
                  </div>
                  
                  <div className="glass-effect rounded-xl p-6 card-hover">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-green-600 font-bold text-xl">🦴</span>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">Animations</h3>
                    <p className="text-secondary-600 text-sm">
                      Explore skeletal animations, bone data, and morph targets
                    </p>
                  </div>
                  
                  <div className="glass-effect rounded-xl p-6 card-hover">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                      <span className="text-purple-600 font-bold text-xl">🌍</span>
                    </div>
                    <h3 className="text-lg font-semibold text-secondary-900 mb-2">World Data</h3>
                    <p className="text-secondary-600 text-sm">
                      Examine complete game worlds with terrains, brushes, and entities
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <FileViewer file={selectedFile} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;