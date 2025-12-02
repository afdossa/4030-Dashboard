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
    onPointClick: (sale: RealEstateSale | null) => void;
    selectedSale: RealEstateSale | null;
}

// Custom hook: ensures 'Residential' is red and generates other colors
const usePropertyColors = (data: RealEstateSale[]) => {
    const uniquePropertyTypes = React.useMemo(() => Array.from(new Set(data.map(d => d.property_type))).sort(), [data]);
    const standardColors = [
        '#6366f1', '#f59e0b', '#10b981', '#06b6d4', '#eab308',
        '#a855f7', '#f97316', '#84cc16', '#ec4899', '#4b5563',
        '#34d399', '#fcd34d', '#a78bfa',
    ];

    return React.useMemo(() => {
        const acc: Record<string, string> = {};
        let colorIndex = 0;

        if (uniquePropertyTypes.includes('Residential')) {
            acc['Residential'] = '#ef4444'; // Red
        }

        for (const type of uniquePropertyTypes) {
            if (type !== 'Residential') {
                let color = standardColors[colorIndex % standardColors.length];
                colorIndex++;
                acc[type] = color;
            }
        }
        return acc;
    }, [uniquePropertyTypes]);
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        // Use the original (non-jittered) values for display
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

    // Jitter function: adds a tiny random offset to the coordinate
    const applyJitter = (value: number, range: number) => {
        const jitterAmount = (Math.random() - 0.5) * range;
        return value + jitterAmount;
    };

    // Filter, clean, and JITTER the data (FIXED FOR NAN ERROR)
    const filteredAndJitteredData = React.useMemo(() => {
        return data
            .filter(d =>
                // Ensure data is robustly numeric and positive before plotting/jittering
                typeof d.sale_amount === 'number' && isFinite(d.sale_amount) && d.sale_amount > 0 &&
                typeof d.assessed_value === 'number' && isFinite(d.assessed_value) && d.assessed_value > 0
            )
            .map(d => ({
                ...d,
                // Use a small range (e.g., +/- 1000) for visual separation
                sale_amount_j: applyJitter(d.sale_amount, 2000),
                assessed_value_j: applyJitter(d.assessed_value, 2000),
            }));
    }, [data]);

    const propertyColorMap = usePropertyColors(filteredAndJitteredData);
    const uniquePropertyTypes = Array.from(new Set(filteredAndJitteredData.map(d => d.property_type))).sort();

    const getColor = (payload: RealEstateSale) => propertyColorMap[payload.property_type] || '#ccc';

    const axisFormatter = (value: number) => {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
        if (value >= 1000) return `${(value / 1000).toLocaleString()}k`;
        return value.toLocaleString();
    };

    // Custom shape function to apply styling based on selection and color
    const renderScatterShape = (props: any) => {
        const isSelected = selectedSale && props.payload.serial_number === selectedSale.serial_number;
        const color = getColor(props.payload);

        return (
            <circle
                cx={props.cx}
                cy={props.cy}
                r={isSelected ? 6 : 3}
                fill={isSelected ? "#ff00ff" : color}
                stroke={isSelected ? "#ffffff" : color}
                strokeWidth={isSelected ? 2 : 0}
                opacity={isSelected ? 1 : 0.6}
                key={props.payload.serial_number}
                style={{ pointerEvents: 'all', cursor: 'pointer' }}
            />
        );
    };

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
                margin={{ top: 10, right: 100, bottom: 20, left: 10 }}
                cursor="default"
            >
                <CartesianGrid stroke="rgba(255, 255, 255, 0.1)" strokeDasharray="3 3" />

                <XAxis
                    type="number"
                    dataKey="sale_amount_j" // Using jittered X-coordinate
                    name="Sale Amount"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 1500000]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                    label={{ value: 'Sale Amount', position: 'bottom', fill: '#9ca3af', dy: 10 }}
                />

                <YAxis
                    type="number"
                    dataKey="assessed_value_j" // Using jittered Y-coordinate
                    name="Assessed Value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 2000000]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255, 255, 255, 0.2)' }}
                    label={{ value: 'Assessed Value', position: 'left', fill: '#9ca3af', dx: -10 }}
                />

                <ZAxis dataKey="property_type" type="category" range={[10, 100]} />

                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ strokeDasharray: '5 5', stroke: '#fff', opacity: 0.5 }}
                />

                <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ top: 0, right: 0, padding: '10px' }}
                />

                <Scatter
                    name="Sales Data"
                    data={filteredAndJitteredData}
                    shape={renderScatterShape}
                    onMouseDown={(e: any) => {
                        // FIX: Force single selection by checking if payload is an array and taking only the first item
                        const clickedPayload = Array.isArray(e.payload) ? e.payload[0] : e.payload;

                        if (clickedPayload && clickedPayload.serial_number) {
                            const selectedSerialNumber = clickedPayload.serial_number;

                            if (selectedSale && selectedSale.serial_number === selectedSerialNumber) {
                                // Deselect if the same point is clicked
                                onPointClick(null);
                            } else {
                                // Select only the single, unique data point
                                onPointClick(clickedPayload as RealEstateSale);
                            }
                        }
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;