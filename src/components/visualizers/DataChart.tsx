import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { TrendingUp, PieChart as PieChartIcon, BarChart3, Activity } from 'lucide-react';

interface DataChartProps {
  data: any;
  fileType: string;
}

export const DataChart: React.FC<DataChartProps> = ({ data, fileType }) => {
  const chartData = useMemo(() => {
    switch (fileType) {
      case 'mdl':
        return generateModelChartData(data);
      case 'ba':
        return generateAnimationChartData(data);
      case 'bm':
        return generateMeshChartData(data);
      case 'wld':
        return generateWorldChartData(data);
      default:
        return generateGenericChartData(data);
    }
  }, [data, fileType]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="glass-effect rounded-xl p-6 text-center">
        <Activity className="w-12 h-12 text-secondary-300 mx-auto mb-3" />
        <p className="text-secondary-600">No chart data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {chartData.stats?.map((stat: any, index: number) => (
          <div key={index} className="glass-effect rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{stat.value}</div>
            <div className="text-sm text-secondary-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        {chartData.barData && (
          <div className="glass-effect rounded-xl p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              {chartData.barData.title}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.barData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Line Chart */}
        {chartData.lineData && (
          <div className="glass-effect rounded-xl p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              {chartData.lineData.title}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData.lineData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Pie Chart */}
        {chartData.pieData && (
          <div className="glass-effect rounded-xl p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2" />
              {chartData.pieData.title}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.pieData.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.pieData.data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Scatter Plot */}
        {chartData.scatterData && (
          <div className="glass-effect rounded-xl p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              {chartData.scatterData.title}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart data={chartData.scatterData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis dataKey="y" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter fill="#4f46e5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

function generateModelChartData(data: any) {
  const stats = [];
  const barData = [];
  const pieData = [];

  // Extract model statistics
  if (data.header) {
    stats.push(
      { label: 'Vertices', value: data.header.vtxCount?.value || 0 },
      { label: 'Frames', value: data.header.frameCount?.value || 0 },
      { label: 'MIP Levels', value: data.mipCount?.count || 0 },
      { label: 'Polygons', value: data.modelMipInfos?.[0]?.ipol?.count || 0 }
    );
  }

  // MIP level distribution
  if (data.modelMipInfos) {
    data.modelMipInfos.forEach((mip: any, index: number) => {
      barData.push({
        name: `MIP ${index}`,
        value: mip.ipol?.count || 0
      });
    });
  }

  // Collision boxes distribution
  if (data.colBoxes) {
    pieData.push(
      { name: 'Collision Boxes', value: data.colBoxes.length },
      { name: 'Attachment Points', value: data.attachedPositions?.length || 0 }
    );
  }

  return {
    stats,
    barData: barData.length > 0 ? { title: 'MIP Level Polygons', data: barData } : null,
    pieData: pieData.length > 0 ? { title: 'Model Components', data: pieData } : null
  };
}

function generateAnimationChartData(data: any) {
  const stats = [];
  const lineData = [];
  const barData = [];

  if (data.header) {
    stats.push(
      { label: 'Animations', value: data.header.animCount || 0 },
      { label: 'Total Frames', value: data.lods?.reduce((sum: number, anim: any) => sum + (anim.frameCount || 0), 0) || 0 }
    );
  }

  // Animation frame counts
  if (data.lods) {
    data.lods.forEach((anim: any, index: number) => {
      barData.push({
        name: `Anim ${index + 1}`,
        value: anim.frameCount || 0
      });
    });

    // Bone envelope positions over time
    if (data.lods[0]?.boneEnvelopes) {
      const envelope = data.lods[0].boneEnvelopes[0];
      if (envelope?.positions) {
        envelope.positions.forEach((pos: any, index: number) => {
          lineData.push({
            name: `Frame ${pos.frameNumber || index}`,
            value: Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z)
          });
        });
      }
    }
  }

  return {
    stats,
    barData: barData.length > 0 ? { title: 'Animation Frame Counts', data: barData } : null,
    lineData: lineData.length > 0 ? { title: 'Bone Position Magnitude', data: lineData } : null
  };
}

function generateMeshChartData(data: any) {
  const stats = [];
  const barData = [];
  const pieData = [];

  if (data.header) {
    stats.push(
      { label: 'LOD Levels', value: data.header.lodCount || 0 },
      { label: 'Version', value: data.header.version || 0 }
    );
  }

  // LOD vertex counts
  if (data.lods) {
    data.lods.forEach((lod: any, index: number) => {
      barData.push({
        name: `LOD ${index}`,
        value: lod.vtxCount || 0
      });
    });

    // Surface distribution
    if (data.lods[0]?.surfaces) {
      data.lods[0].surfaces.forEach((surface: any, index: number) => {
        pieData.push({
          name: surface.id?.value || `Surface ${index + 1}`,
          value: surface.triCount || 0
        });
      });
    }
  }

  return {
    stats,
    barData: barData.length > 0 ? { title: 'LOD Vertex Counts', data: barData } : null,
    pieData: pieData.length > 0 ? { title: 'Surface Triangle Distribution', data: pieData } : null
  };
}

function generateWorldChartData(data: any) {
  const stats = [];
  const barData = [];
  const pieData = [];

  // World statistics
  if (data.world?.chunks) {
    const chunkTypes = data.world.chunks.reduce((acc: any, chunk: any) => {
      const type = chunk.typeStr || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});

    Object.entries(chunkTypes).forEach(([type, count]) => {
      pieData.push({ name: type, value: count as number });
    });

    stats.push(
      { label: 'Total Chunks', value: data.world.chunks.length },
      { label: 'Chunk Types', value: Object.keys(chunkTypes).length }
    );
  }

  return {
    stats,
    pieData: pieData.length > 0 ? { title: 'World Chunk Distribution', data: pieData } : null
  };
}

function generateGenericChartData(data: any) {
  // Generic data analysis for unknown file types
  const stats = [];
  
  if (data.fileInfo) {
    stats.push(
      { label: 'File Size', value: `${(data.fileInfo.size / 1024).toFixed(1)}KB` },
      { label: 'Format', value: data.fileInfo.extension }
    );
  }

  return { stats };
}