import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import type { RealEstateSale } from '../types';

interface LineChartProps {
    data: RealEstateSale[];
    selectedSale: RealEstateSale | null;
}

const LineChartComponent: React.FC<LineChartProps> = ({ data, selectedSale }) => {
    const cleaned = React.useMemo(
        () =>
            data
                .map(d => ({
                    town: d.town,
                    sale_amount: Number(d.sale_amount),
                    assessed_value: Number(d.assessed_value)
                }))
                .filter(d => d.sale_amount > 0 && d.assessed_value > 0),
        [data]
    );

    const selectedTown = selectedSale ? selectedSale.town : null;

    const dataset = React.useMemo(() => {
        if (!selectedTown) {
            return cleaned.sort((a, b) => a.sale_amount - b.sale_amount);
        }

        const townData = cleaned
            .filter(d => d.town === selectedTown)
            .sort((a, b) => a.sale_amount - b.sale_amount);

        return townData.length > 0 ? townData : cleaned;
    }, [cleaned, selectedTown]);

    if (dataset.length === 0) {
        return (
            <div className="text-gray-400 p-4 text-center">
                No data available for line chart
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dataset} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.15)" strokeDasharray="3 3" />
                <XAxis dataKey="sale_amount" stroke="#9ca3af" />
                <YAxis dataKey="assessed_value" stroke="#9ca3af" />
                <Tooltip formatter={(v: number) => v.toLocaleString()} />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="assessed_value"
                    name={selectedTown ? `${selectedTown} Trend` : "Sale vs Assessment Trend"}
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default LineChartComponent;
