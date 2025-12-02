
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface LineChartProps {
  data: { year: number; sales_count: number }[];
}

const LineChartComponent: React.FC<LineChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis dataKey="year" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
            contentStyle={{
                backgroundColor: 'rgba(49, 24, 98, 0.9)',
                border: '1px solid #5b21b6',
                color: '#e5e7eb',
                backdropFilter: 'blur(4px)'
            }}
        />
        <Legend />
        <Line type="monotone" dataKey="sales_count" name="Number of Sales" stroke="#5b21b6" strokeWidth={2} activeDot={{ r: 8 }} />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default LineChartComponent;
