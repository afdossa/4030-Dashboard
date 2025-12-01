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
} from 'recharts';

interface ScatterPlotProps {
    data: RealEstateSale[];
    onPointClick: (sale: RealEstateSale) => void;
    selectedSale: RealEstateSale | null;
}

// Custom hook to generate consistent colors for property types
const usePropertyColors = (data: RealEstateSale[]) => {
    // ... (Color logic remains the same)
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
        // Add more colors if needed
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

    // **1. REFINED OUTLIER FILTERING**
    // Based on the new image (image_ee1a85.png) which clearly caps the axes:
    // X-Axis (Assessed Value) max around 1.5M
    // Y-Axis (Sale Amount) max around 2.0M
    const MAX_ASSESSED_VALUE = 1500000;
    const MAX_SALE_AMOUNT = 2000000;

    const filteredAndCleanData = data.filter(d =>
        // Filter out zero/null values
        d.sale_amount > 0 && d.assessed_value > 0 &&
        // Apply outlier limits
        d.assessed_value <= MAX_ASSESSED_VALUE &&
        d.sale_amount <= MAX_SALE_AMOUNT
    );

    const propertyColorMap = usePropertyColors(filteredAndCleanData);

    // Function to get the color for a point based on its property_type
    const getColor = (payload: RealEstateSale) => propertyColorMap[payload.property_type] || '#ccc';

    // Function to format axis ticks in M (Million)
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
                // Reduce the radius of unselected points to reduce overlap and clicking ambiguity
                r={isSelected ? 8 : 2.5}
                fill={isSelected ? "#F66733" : getColor(props.payload)} // Use contrasting color for selected
                stroke={isSelected ? "#ffffff" : "none"}
                strokeWidth={isSelected ? 2 : 0}
                opacity={isSelected ? 1 : 0.7}
            />
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
                margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
                cursor="default"
            >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />

                <XAxis
                    type="number"
                    dataKey="assessed_value"
                    name="Assessed Value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    // Fix domain to the max filter value
                    domain={[0, MAX_ASSESSED_VALUE]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                />

                <YAxis
                    type="number"
                    dataKey="sale_amount"
                    name="Sale Amount"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    // Fix domain to the max filter value
                    domain={[0, MAX_SALE_AMOUNT]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                />

                <ZAxis dataKey="property_type" type="category" range={[10, 100]} />

                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: '5 5', stroke: '#fff', opacity: 0.5 }}
                />

                <Scatter
                    name="Sales Data"
                    data={filteredAndCleanData}
                    shape={renderScatterShape}
                    // **2. SELECTION FIX:** Ensure we only call onPointClick with the first payload element
                    onClick={(e: any) => {
                        // The 'e' object passed by recharts contains the event and the payload data
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