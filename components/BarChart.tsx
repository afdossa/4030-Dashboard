
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  xAxisKey: string;
  yAxisKey: string;
  yAxisName: string;
  fill: string;
  yAxisTickFormatter?: (value: any) => string;
}

const BarChartComponent: React.FC<BarChartProps> = ({ data, xAxisKey, yAxisKey, yAxisName, fill, yAxisTickFormatter }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis dataKey={xAxisKey} stroke="#9ca3af" tick={{ fontSize: 12 }} />
        <YAxis stroke="#9ca3af" tickFormatter={yAxisTickFormatter} />
        <Tooltip
            contentStyle={{
                backgroundColor: 'rgba(49, 24, 98, 0.9)',
                border: '1px solid #5b21b6',
                color: '#e5e7eb',
                backdropFilter: 'blur(4px)'
            }}
            formatter={(value: number) => {
              const formattedValue = yAxisTickFormatter ? yAxisTickFormatter(value) : value.toLocaleString();
              return [formattedValue, yAxisName];
            }}
        />
        <Legend />
        <Bar dataKey={yAxisKey} fill={fill} name={yAxisName} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default BarChartComponent;
