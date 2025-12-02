import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import type { RealEstateSale } from '../types';

interface BarChartProps {
    data: RealEstateSale[];
    selectedSale: RealEstateSale | null;
}

const BarChartComponent: React.FC<BarChartProps> = ({ data, selectedSale }) => {
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
        const m: Record<string, { total: number; count: number }> = {};
        for (const d of filtered) {
            if (!m[d.property_type]) m[d.property_type] = { total: 0, count: 0 };
            m[d.property_type].total += d.assessed_value;
            m[d.property_type].count += 1;
        }
        return Object.entries(m).map(([type, x]) => ({
            property_type: type,
            assessed_value: x.count > 0 ? x.total / x.count : 0
        }));
    }, [filtered]);

    const selectedType = selectedSale?.property_type ?? null;

    const displayed = React.useMemo(() => {
        if (!selectedType) return grouped;
        return grouped.filter(g => g.property_type === selectedType);
    }, [grouped, selectedType]);

    return (
        <ResponsiveContainer width="100%" height="100%">
            <BarChart data={displayed} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <XAxis dataKey="property_type" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Bar
                    dataKey="assessed_value"
                    name="Average Assessed Value"
                    fill="#f59e0b"
                />
            </BarChart>
        </ResponsiveContainer>
    );
};

export default BarChartComponent;