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
    ZAxis,
    Legend
} from 'recharts';

interface ScatterPlotProps {
    data: RealEstateSale[];
    onPointClick: (sale: RealEstateSale) => void;
    selectedSale: RealEstateSale | null;
}

// Custom hook to generate consistent colors for property types
const usePropertyColors = (data: RealEstateSale[]) => {
    const uniquePropertyTypes = React.useMemo(() => Array.from(new Set(data.map(d => d.property_type))).sort(), [data]);
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
        '#4b5563', // Gray
        '#34d399', // Light Emerald
        '#fcd34d', // Light Amber
        '#a78bfa', // Light Purple
    ];
    return React.useMemo(() => uniquePropertyTypes.reduce((acc, type, index) => {
        acc[type] = colors[index % colors.length];
        return acc;
    }, {} as Record<string, string>), [uniquePropertyTypes]);
};

// Custom Tooltip component
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload as RealEstateSale;
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

    // Filter out rows where sale_amount or assessed_value is zero (The API handles the upper bounds)
    const filteredAndCleanData = data.filter(d =>
        d.sale_amount > 0 && d.assessed_value > 0
    );

    const propertyColorMap = usePropertyColors(filteredAndCleanData);
    const uniquePropertyTypes = Array.from(new Set(filteredAndCleanData.map(d => d.property_type))).sort();

    const getColor = (payload: RealEstateSale) => propertyColorMap[payload.property_type] || '#ccc';

    const axisFormatter = (value: number) => {
        return value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toLocaleString()}k`;
    };

    // Custom shape function to apply styling based on selection and color
    const renderScatterShape = (props: any) => {
        const isSelected = selectedSale && props.payload.serial_number === selectedSale.serial_number;

        return (
            <circle
                cx={props.cx}
                cy={props.cy}
                // Small radius (2.5) to minimize overlap for cleaner visualization
                r={isSelected ? 8 : 2.5}
                fill={isSelected ? "#ff00ff" : getColor(props.payload)} // Neon color for selection
                stroke={isSelected ? "#ffffff" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                opacity={isSelected ? 1 : 0.7}
                key={props.payload.serial_number}
            />
        );
    };

    // **LEGEND FIX:** Custom Legend component
    const CustomLegend = () => (
        <div className="bg-gray-700/50 p-3 rounded-lg text-sm max-h-full overflow-y-auto">
            <h4 className="font-bold text-gray-300 mb-2">Property Type Legend</h4>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1">
                {uniquePropertyTypes.map(type => (
                    <li key={type} className="flex items-center text-gray-400">
                        <span style={{ backgroundColor: propertyColorMap[type] }}
                              className="inline-block w-3 h-3 rounded-full mr-2 opacity-70"></span>
                        {type}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
                // Adjusted right margin to make space for the vertical legend
                margin={{ top: 10, right: 100, bottom: 20, left: 10 }}
                cursor="default"
            >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />

                {/* X-Axis: Assessed Value (Numeric) */}
                <XAxis
                    type="number"
                    dataKey="assessed_value"
                    name="Assessed Value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 'auto']}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                    label={{ value: 'Assessed Value', position: 'bottom', fill: '#9ca3af', dy: 10 }}
                />

                {/* Y-Axis: Property Type (Categorical) - For the Power BI Strip Plot Look */}
                <YAxis
                    type="category"
                    dataKey="property_type"
                    name="Property Type"
                    stroke="#9ca3af"
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                    scale="point"
                    allowDuplicatedCategory={false}
                />

                <ZAxis dataKey="property_type" type="category" range={[10, 100]} />

                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: '5 5', stroke: '#fff', opacity: 0.5 }}
                />

                {/* LEGEND FIX: Place the custom component inside the Legend wrapper */}
                <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ top: 0, right: 0, padding: '10px' }}
                />

                <Scatter
                    name="Sales Data"
                    data={filteredAndCleanData}
                    shape={renderScatterShape}
                    onClick={(e: any) => {
                        if (e && e.payload) {
                            onPointClick(e.payload as RealEstateSale);
                        }
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;