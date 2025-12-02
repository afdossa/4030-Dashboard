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
    Legend
} from 'recharts';

interface ScatterPlotProps {
    data: RealEstateSale[];
    onPointClick: (sale: RealEstateSale | null) => void;
    selectedSale: RealEstateSale | null;
}

const usePropertyColors = (data: RealEstateSale[]) => {
    const uniquePropertyTypes = React.useMemo(
        () => Array.from(new Set(data.map(d => d.property_type))).sort(),
        [data]
    );

    const standardColors = [
        '#6366f1', '#f59e0b', '#10b9b9', '#06b6d4', '#eab308', '#a855f7',
        '#f97316', '#84cc16', '#ec4899', '#4b5563', '#34d399',
        '#fcd34d', '#a78bfa'
    ];

    return React.useMemo(() => {
        const acc: Record<string, string> = {};
        let i = 0;

        if (uniquePropertyTypes.includes('Residential')) {
            acc['Residential'] = '#ef4444';
        }

        for (const type of uniquePropertyTypes) {
            if (type !== 'Residential') {
                acc[type] = standardColors[i % standardColors.length];
                i++;
            }
        }
        return acc;
    }, [uniquePropertyTypes]);
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload as RealEstateSale;
        if (!d?.serial_number) return null;

        return (
            <div className="bg-gray-700/90 text-white p-3 border border-gray-600 rounded-lg shadow-xl text-sm">
                <p className="font-bold mb-1">{d.property_type}</p>
                <p>Sale: ${d.sale_amount.toLocaleString()}</p>
                <p>Assessed: ${d.assessed_value.toLocaleString()}</p>
                <p>Town: {d.town}</p>
                <p className="text-gray-400 mt-1">Click to select</p>
            </div>
        );
    }
    return null;
};

const ScatterPlotComponent: React.FC<ScatterPlotProps> = ({
                                                              data,
                                                              onPointClick,
                                                              selectedSale
                                                          }) => {
    const filtered = data.filter(
        d => d.sale_amount > 0 && d.assessed_value > 0
    );

    const uniqueData = React.useMemo(
        () =>
            Array.from(
                new Map(filtered.map(item => [item.serial_number, item])).values()
            ),
        [filtered]
    );

    const propertyColorMap = usePropertyColors(uniqueData);

    const uniquePropertyTypes = Array.from(
        new Set(uniqueData.map(d => d.property_type))
    ).sort();

    const getColor = (p: RealEstateSale) =>
        propertyColorMap[p.property_type] || '#ccc';

    const axisFormatter = (v: number) => {
        if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
        if (v >= 1000) return `${(v / 1000).toLocaleString()}k`;
        return v.toLocaleString();
    };

    const renderScatterShape = (props: any) => {
        const selected =
            selectedSale?.serial_number === props.payload.serial_number;
        const color = getColor(props.payload);

        return (
            <circle
                cx={props.cx}
                cy={props.cy}
                r={selected ? 6 : 3}
                fill={selected ? "#ff00ff" : color}
                stroke={selected ? "#ffffff" : color}
                strokeWidth={selected ? 2 : 0}
                opacity={selected ? 1 : 0.6}
                style={{ pointerEvents: "all", cursor: "pointer" }}

                onClick={props.onClick}
                onMouseDown={props.onMouseDown}
                onMouseUp={props.onMouseUp}
                onMouseEnter={props.onMouseEnter}
                onMouseLeave={props.onMouseLeave}
                onMouseMove={props.onMouseMove}
            />
        );
    };

    const CustomLegend = () => (
        <div className="bg-gray-700/50 p-3 rounded-lg text-sm max-h-full overflow-y-auto">
            <h4 className="font-bold text-gray-300 mb-2">Property Type Legend</h4>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1">
                {uniquePropertyTypes.map(t => (
                    <li key={t} className="flex items-center text-gray-400">
                        <span
                            style={{ backgroundColor: propertyColorMap[t] }}
                            className="inline-block w-3 h-3 rounded-full mr-2 opacity-70"
                        ></span>
                        {t}
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
                margin={{ top: 10, right: 100, bottom: 20, left: 10 }}
                cursor={false}
                useVoronoi={false}
            >
                <CartesianGrid
                    stroke="rgba(255,255,255,0.1)"
                    strokeDasharray="3 3"
                />

                <XAxis
                    type="number"
                    dataKey="sale_amount"
                    name="Sale Amount"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 1500000]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    label={{
                        value: 'Sale Amount',
                        position: 'bottom',
                        fill: '#9ca3af',
                        dy: 10
                    }}
                />

                <YAxis
                    type="number"
                    dataKey="assessed_value"
                    name="Assessed Value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 2000000]}
                    tickLine={false}
                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                    label={{
                        value: 'Assessed Value',
                        position: 'left',
                        fill: '#9ca3af',
                        dx: -10
                    }}
                />

                <Tooltip
                    trigger="click"
                    cursor={false}
                    wrapperStyle={{ pointerEvents: 'none' }}
                    content={<CustomTooltip />}
                />

                <Legend
                    content={<CustomLegend />}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ top: 0, right: 0, padding: '10px' }}
                />

                <Scatter
                    data={uniqueData}
                    shape={renderScatterShape}
                    activeDot={false}
                    activeShape={null}
                    legendType="none"
                    isAnimationActive={false}
                    onClick={(e: any) => {
                        const p = Array.isArray(e.payload)
                            ? e.payload[0]
                            : e.payload;
                        if (!p?.serial_number) return;

                        if (selectedSale?.serial_number === p.serial_number) {
                            onPointClick(null);
                        } else {
                            onPointClick(p as RealEstateSale);
                        }
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;
