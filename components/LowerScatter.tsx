import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { RealEstateSale } from '../types';

interface PointChartProps {
    data: RealEstateSale[];
    selectedSale: RealEstateSale | null;
}

const PointChartComponent: React.FC<PointChartProps> = ({ data, selectedSale }) => {
    const cleaned = React.useMemo(
        () =>
            data.map(d => ({
                ...d,
                sale_amount: Number(d.sale_amount),
                assessed_value: Number(d.assessed_value)
            })),
        [data]
    );

    const filtered = cleaned.filter(
        d => d.sale_amount > 0 && d.assessed_value > 0
    );

    const grouped = React.useMemo(() => {
        const m: Record<string, number> = {};
        for (const d of filtered) {
            if (!m[d.property_type]) m[d.property_type] = 0;
            m[d.property_type] += d.sale_amount;
        }
        return Object.entries(m).map(([type, total]) => ({
            property_type: type,
            total_sale: total
        }));
    }, [filtered]);

    const selectedType = selectedSale?.property_type ?? null;

    const colors: Record<string, string> = {
        Apartments: '#3b82f6',
        Commercial: '#f59e0b',
        Industrial: '#10b981',
        PublicUtility: '#06b6d4',
        Residential: '#ef4444',
        VacantLand: '#8b5cf6'
    };

    const renderDot = (props: any) => {
        const type = props.payload.property_type;
        const active = type === selectedType;
        const fill = active ? colors[type] || '#ffffff' : 'transparent';
        const stroke = colors[type] || '#ffffff';

        return (
            <circle
                cx={props.cx}
                cy={props.cy}
                r={active ? 7 : 6}
                fill={fill}
                stroke={stroke}
                strokeWidth={2}
            />
        );
    };

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <XAxis dataKey="property_type" type="category" stroke="#9ca3af" />
                <YAxis dataKey="total_sale" stroke="#9ca3af" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} labelFormatter={l => l} />
                <Scatter data={grouped} shape={renderDot} />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

export default PointChartComponent;
