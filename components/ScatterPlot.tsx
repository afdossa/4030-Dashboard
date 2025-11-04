
import React from 'react';
import type { RealEstateSale } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from 'recharts';

interface ScatterPlotProps {
  data: RealEstateSale[];
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: RealEstateSale = payload[0].payload;
      return (
        <div className="bg-purple-950/80 border border-purple-700 rounded-lg p-3 text-sm text-gray-200 shadow-lg backdrop-blur-sm">
          <p className="font-bold text-orange-400">{data.address}, {data.town}</p>
          <p>Sale Amount: <span className="font-semibold">${data.sale_amount.toLocaleString()}</span></p>
          <p>Assessed Value: <span className="font-semibold">${data.assessed_value.toLocaleString()}</span></p>
          <p>Property Type: <span className="font-semibold">{data.property_type}</span></p>
        </div>
      );
    }
    return null;
  };

const ScatterPlotComponent: React.FC<ScatterPlotProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart
        margin={{
          top: 20,
          right: 20,
          bottom: 20,
          left: 20,
        }}
      >
        <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
            type="number" 
            dataKey="assessed_value" 
            name="Assessed Value" 
            stroke="#9ca3af"
            tickFormatter={(value) => `${(Number(value) / 1000).toLocaleString()}k`}
        />
        <YAxis 
            type="number" 
            dataKey="sale_amount" 
            name="Sale Amount" 
            stroke="#9ca3af"
            tickFormatter={(value) => `${(Number(value) / 1000).toLocaleString()}k`}
        />
        <ZAxis type="number" range={[10, 100]} />
        <Tooltip 
            cursor={{ strokeDasharray: '3 3' }} 
            content={<CustomTooltip />}
        />
        <Scatter name="Sales Data" data={data} fill="#D95C28" shape="circle" />
      </ScatterChart>
    </ResponsiveContainer>
  );
};

export default ScatterPlotComponent;
