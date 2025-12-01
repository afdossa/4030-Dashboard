import React from 'react';
import type { RealEstateSale } from '../types';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    ZAxis
} from 'recharts'; // Added Tooltip

interface ScatterPlotProps {
    data: RealEstateSale[];
    onPointClick: (sale: RealEstateSale) => void;
    selectedSale: RealEstateSale | null;
}

// Custom hook to generate consistent colors for property types
const usePropertyColors = (data: RealEstateSale[]) => {
    const uniquePropertyTypes = Array.from(new Set(data.map(d => d.property_type))).sort();
    const colors = [
        '#6366f1', // Indigo 500
        '#f59e0b', // Amber 500
        '#10b981', // Emerald 500
        '#ef4444', // Red 500
        '#06b6d4', // Cyan 500
        '#eab308', // Yellow 600
        '#a855f7', // Purple 500
        '#f97316', // Orange 500
        '#84cc16', // Lime 500
        '#ec4899', // Pink 500
        // Add more colors if you have more categories
    ];
    return uniquePropertyTypes.reduce((acc, type, index) => {
        acc[type] = colors[index % colors.length];
        return acc;
    }, {} as Record<string, string>);
};

// Custom Tooltip component to display full details
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as RealEstateSale;
        // Check if data is valid and not the selected point's summary
        if (data && data.serial_number) {
            return (
                <div className="bg-gray-700/90 text-white p-3 border border-gray-600 rounded-lg shadow-xl text-sm">
                    <p className="font-bold mb-1">{data.property_type}</p>
                    <p>Sale: ${data.sale_amount.toLocaleString()}</p>
                    <p>Assessed: ${data.assessed_value.toLocaleString()}</p>
                    <p>Town: {data.town}</p>
                    <p className="text-gray-400 mt-1">Click to select</p>
                </div>
            );
        }
    }
    return null;
};


const ScatterPlotComponent: React.FC<ScatterPlotProps> = ({ data, onPointClick, selectedSale }) => {
    // Filter out rows where sale_amount or assessed_value is zero (to clean up the dense zero-axis lines often seen in raw data)
    const cleanData = data.filter(d => d.sale_amount > 0 && d.assessed_value > 0);

    // Separate selected sale for different styling
    const defaultData = cleanData.filter(d => !selectedSale || d.serial_number !== selectedSale.serial_number);
    const selectedData = selectedSale ? [selectedSale] : [];

    // Get color map
    const propertyColorMap = usePropertyColors(cleanData);

    // Function to format axis ticks in M (Million)
    const axisFormatter = (value: number) => {
        return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toLocaleString()}k`;
    };

    // Function to get the color for a point based on its property_type
    const getColor = (payload: RealEstateSale) => propertyColorMap[payload.property_type] || '#ccc';

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
                margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                cursor="default"
            >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />

                {/* X-Axis: Assessed Value */}
                <XAxis
                    type="number"
                    dataKey="assessed_value"
                    name="Assessed Value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 'dataMax + 100000']} // Ensure the axis starts at 0 and goes slightly past the max
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                />

                {/* Y-Axis: Sale Amount */}
                <YAxis
                    type="number"
                    dataKey="sale_amount"
                    name="Sale Amount"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 'dataMax + 100000']} // Ensure the axis starts at 0 and goes slightly past the max
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                />

                {/* Z-Axis maps property_type to color */}
                <ZAxis dataKey="property_type" type="category" range={[10, 100]} />

                {/* Tooltip */}
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: '5 5', stroke: '#fff', opacity: 0.5 }}
                />

                {/* Default Sales Data (colored by property type) */}
                <Scatter
                    name="Sales Data"
                    data={defaultData}
                    fill={getColor} // Use the custom color function
                    shape="circle"
                    opacity={0.65}
                    onClick={({ payload }) => onPointClick(payload as RealEstateSale)}
                />

                {/* Selected Sale Data (highlighted) */}
                <Scatter
                    name="Selected Sale"
                    data={selectedData}
                    fill="#F66733" // Use a strong contrasting color (Orange)
                    shape="circle"
                    stroke="#ffffff"
                    strokeWidth={2}
                    radius={8}
                    opacity={1}
                    onClick={({ payload }) => onPointClick(payload as RealEstateSale)}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;