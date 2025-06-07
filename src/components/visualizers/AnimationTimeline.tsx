import React, { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';

interface AnimationTimelineProps {
  animationData: any;
  onFrameChange?: (frame: number) => void;
}

export const AnimationTimeline: React.FC<AnimationTimelineProps> = ({ 
  animationData, 
  onFrameChange 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const frameCount = animationData?.frameCount || 0;
  const secsPerFrame = animationData?.secsPerFrame || 1/30;
  const duration = frameCount * secsPerFrame;

  useEffect(() => {
    if (!isPlaying || frameCount === 0) return;

    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        const next = (prev + 1) % frameCount;
        onFrameChange?.(next);
        return next;
      });
    }, (secsPerFrame * 1000) / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, frameCount, secsPerFrame, playbackSpeed, onFrameChange]);

  const handleFrameChange = (frame: number) => {
    setCurrentFrame(frame);
    onFrameChange?.(frame);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
  };

  if (frameCount === 0) {
    return (
      <div className="glass-effect rounded-xl p-6 text-center">
        <p className="text-secondary-600">No animation data available</p>
      </div>
    );
  }

  return (
    <div className="glass-effect rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-secondary-900">Animation Timeline</h3>
        <div className="text-sm text-secondary-600">
          {formatTime(currentFrame * secsPerFrame)} / {formatTime(duration)}
        </div>
      </div>

      {/* Timeline Scrubber */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="range"
            min="0"
            max={frameCount - 1}
            value={currentFrame}
            onChange={(e) => handleFrameChange(parseInt(e.target.value))}
            className="w-full h-2 bg-secondary-200 rounded-lg appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(currentFrame / (frameCount - 1)) * 100}%, #e2e8f0 ${(currentFrame / (frameCount - 1)) * 100}%, #e2e8f0 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-secondary-500 mt-1">
            <span>0</span>
            <span>{frameCount - 1}</span>
          </div>
        </div>

        {/* Frame Markers */}
        <div className="relative h-6 bg-secondary-100 rounded overflow-hidden">
          {Array.from({ length: Math.min(frameCount, 100) }, (_, i) => {
            const frameIndex = Math.floor((i / 99) * (frameCount - 1));
            const position = (frameIndex / (frameCount - 1)) * 100;
            return (
              <div
                key={i}
                className="absolute top-0 w-px h-full bg-secondary-300"
                style={{ left: `${position}%` }}
              />
            );
          })}
          <div
            className="absolute top-0 w-1 h-full bg-primary-500 transition-all duration-100"
            style={{ left: `${(currentFrame / (frameCount - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleFrameChange(0)}
            className="p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 transition-colors"
            title="Reset to start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => handleFrameChange(Math.max(0, currentFrame - 1))}
            className="p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 transition-colors"
            title="Previous frame"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-colors"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          
          <button
            onClick={() => handleFrameChange(Math.min(frameCount - 1, currentFrame + 1))}
            className="p-2 rounded-lg bg-secondary-100 hover:bg-secondary-200 transition-colors"
            title="Next frame"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm text-secondary-600">Speed:</span>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
            className="px-2 py-1 rounded border border-secondary-200 text-sm"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
            <option value={4}>4x</option>
          </select>
        </div>
      </div>

      {/* Animation Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-secondary-200">
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary-900">{frameCount}</div>
          <div className="text-xs text-secondary-600">Frames</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary-900">{(1/secsPerFrame).toFixed(1)}</div>
          <div className="text-xs text-secondary-600">FPS</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary-900">{duration.toFixed(1)}s</div>
          <div className="text-xs text-secondary-600">Duration</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-secondary-900">{currentFrame + 1}</div>
          <div className="text-xs text-secondary-600">Current</div>
        </div>
      </div>

      {/* Bone Envelopes */}
      {animationData?.boneEnvelopes && (
        <div className="pt-4 border-t border-secondary-200">
          <h4 className="text-sm font-semibold text-secondary-900 mb-2">
            Bone Envelopes ({animationData.boneEnvelopes.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
            {animationData.boneEnvelopes.slice(0, 10).map((envelope: any, index: number) => (
              <div key={index} className="text-xs p-2 bg-secondary-50 rounded">
                <div className="font-medium">{envelope.id?.value || `Bone ${index + 1}`}</div>
                <div className="text-secondary-600">
                  Positions: {envelope.positionCount || 0} | 
                  Rotations: {envelope.rotationCount || 0}
                </div>
              </div>
            ))}
            {animationData.boneEnvelopes.length > 10 && (
              <div className="text-xs text-secondary-500 p-2">
                +{animationData.boneEnvelopes.length - 10} more...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};