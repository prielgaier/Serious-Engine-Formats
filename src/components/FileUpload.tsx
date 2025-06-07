import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { ParsedFile } from '../types/ParsedFile';
import { parseFile } from '../utils/fileParser';

interface FileUploadProps {
  onFilesParsed: (files: ParsedFile[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesParsed }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<string[]>([]);

  const handleFiles = useCallback(async (files: FileList) => {
    setIsProcessing(true);
    const fileArray = Array.from(files);
    setProcessingFiles(fileArray.map(f => f.name));
    
    const parsedFiles: ParsedFile[] = [];
    
    for (const file of fileArray) {
      try {
        const parsedFile = await parseFile(file);
        parsedFiles.push(parsedFile);
      } catch (error) {
        console.error(`Error parsing ${file.name}:`, error);
        parsedFiles.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: file.name.split('.').pop() || 'unknown',
          size: file.size,
          data: null,
          rawData: new ArrayBuffer(0),
          parseTime: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    onFilesParsed(parsedFiles);
    setIsProcessing(false);
    setProcessingFiles([]);
  }, [onFilesParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  return (
    <div className="max-w-2xl mx-auto">
      <div
        className={`drop-zone relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
          isDragOver
            ? 'border-primary-500 bg-primary-50/50 scale-[1.02]'
            : 'border-secondary-300 hover:border-primary-400 hover:bg-primary-50/30'
        } ${isProcessing ? 'pointer-events-none opacity-75' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          multiple
          accept=".ba,.bae,.bm,.bs,.fnt,.mdl,.wld,.tex"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-4">
          {isProcessing ? (
            <>
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center animate-pulse-soft">
                <FileText className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Processing Files<span className="loading-dots"></span>
                </h3>
                <div className="space-y-1">
                  {processingFiles.map((filename, index) => (
                    <p key={index} className="text-sm text-secondary-600">
                      {filename}
                    </p>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-primary-100 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-secondary-600 mb-4">
                  Supports .ba, .bae, .bm, .bs, .fnt, .mdl, .wld, and .tex files
                </p>
                <button className="btn-primary">
                  Choose Files
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {!isProcessing && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                File Format Support
              </h4>
              <p className="text-sm text-amber-700">
                This editor supports Serious Engine file formats. Make sure your files 
                are valid SE1 or SE2 format files. Large files may take some time to process.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};