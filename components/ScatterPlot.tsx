import React from 'react';
import type { RealEstateSale } from '../types';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ZAxis } from 'recharts';

interface ScatterPlotProps {
    data: RealEstateSale[];
    onPointClick: (sale: RealEstateSale) => void;
    selectedSale: RealEstateSale | null;
}

const ScatterPlotComponent: React.FC<ScatterPlotProps> = ({ data, onPointClick, selectedSale }) => {
    const defaultData = data.filter(d => !selectedSale || d.serial_number !== selectedSale.serial_number);
    const selectedData = selectedSale ? [selectedSale] : [];

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
                margin={{
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20,
                }}
                cursor="default"
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
                <Scatter
                    name="Sales Data"
                    data={defaultData}
                    fill="#D95C28"
                    shape="circle"
                    opacity={0.6}
                    onClick={({ payload }) => onPointClick(payload as RealEstateSale)}
                />
                <Scatter
                    name="Selected Sale"
                    data={selectedData}
                    fill="#10b981"
                    shape="circle"
                    stroke="#ffffff"
                    strokeWidth={2}
                    radius={8}
                    onClick={({ payload }) => onPointClick(payload as RealEstateSale)}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;