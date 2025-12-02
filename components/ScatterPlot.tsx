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

/* ---------------------------------------------
   PROPERTY TYPE COLOR MAPPING
---------------------------------------------- */
const usePropertyColors = (data: RealEstateSale[]) => {
    const unique = React.useMemo(
        () => [...new Set(data.map(d => d.property_type))].sort(),
        [data]
    );

    const palette = [
        '#6366f1','#f59e0b','#10b981','#ef4444','#06b6d4','#eab308','#a855f7',
        '#f97316','#84cc16','#ec4899','#4b5563','#34d399','#fcd34d','#a78bfa'
    ];

    return React.useMemo(
        () =>
            unique.reduce((acc, type, idx) => {
                acc[type] = palette[idx % palette.length];
                return acc;
            }, {} as Record<string, string>),
        [unique]
    );
};

/* ---------------------------------------------
   TOOLTIP
---------------------------------------------- */
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
        const d = payload[0].payload as RealEstateSale;
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

/* ---------------------------------------------
   LEGEND (fixed)
---------------------------------------------- */
const CustomLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg text-sm max-h-full overflow-y-auto">
            <h4 className="font-bold text-gray-300 mb-2">Property Type Legend</h4>
            <ul className="flex flex-col gap-1">
                {payload.map((entry: any) => (
                    <li key={entry.value} className="flex items-center text-gray-400">
                        <span
                            className="inline-block w-3 h-3 rounded-full mr-2"
                            style={{ background: entry.color }}
                        />
                        {entry.value}
                    </li>
                ))}
            </ul>
        </div>
    );
};

/* ---------------------------------------------
   MAIN COMPONENT
---------------------------------------------- */
const ScatterPlotComponent: React.FC<ScatterPlotProps> = ({
                                                              data,
                                                              onPointClick,
                                                              selectedSale
                                                          }) => {

    /* -------------------------
       APPLY POWER BI FILTERS
    --------------------------*/
    const filtered = data.filter(
        d =>
            d.sale_amount > 0 &&
            d.assessed_value > 0 &&
            d.assessed_value < 150000 &&
            d.sale_amount < 200000
    );

    const propertyColorMap = usePropertyColors(filtered);

    const axisFormatter = (v: number) =>
        v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1_000).toFixed(0)}k`;

    /* -------------------------
       CUSTOM POINT SHAPE
    --------------------------*/
    const renderShape = (props: any) => {
        const isSelected =
            selectedSale?.serial_number === props.payload.serial_number;

        return (
            <circle
                cx={props.cx}
                cy={props.cy}
                r={isSelected ? 8 : 2.5}
                fill={isSelected ? '#ff00ff' : propertyColorMap[props.payload.property_type]}
                stroke={isSelected ? '#ffffff' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
                opacity={isSelected ? 1 : 0.75}
            />
        );
    };

    /* -------------------------
       CLICK HANDLER
    --------------------------*/
    const handleClick = (e: any) => {
        if (!e?.payload) return;

        const clicked = e.payload as RealEstateSale;

        if (selectedSale?.serial_number === clicked.serial_number) {
            onPointClick(null); // deselect
        } else {
            onPointClick(clicked);
        }
    };

    /* -------------------------
              RENDER
    --------------------------*/
    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 140, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />

                <XAxis
                    type="number"
                    dataKey="assessed_value"
                    stroke="#9ca3af"
                    tickFormatter={axisFormatter}
                    domain={[0, 'auto']}
                    label={{ value: 'Assessed Value', position: 'bottom', fill: '#9ca3af', dy: 10 }}
                />

                <YAxis
                    type="category"
                    dataKey="property_type"
                    stroke="#9ca3af"
                    scale="point"
                />

                <ZAxis dataKey="property_type" type="category" />

                <Tooltip content={<CustomTooltip />} />

                {/* FIXED: legend must receive a function, not JSX */}
                <Legend
                    content={CustomLegend}
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    wrapperStyle={{ right: 0 }}
                />

                <Scatter
                    data={filtered}
                    shape={renderShape}
                    onClick={handleClick}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default ScatterPlotComponent;
