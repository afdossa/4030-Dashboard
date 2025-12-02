import React, { useState, useEffect } from 'react';
import type { RealEstateSale } from '../types';
import BarChartComponent from './BarChart';

interface SaleDistributionData { price_bucket: string; count: string; }
interface SaleDistributionChartProps { selectedSale: RealEstateSale | null; }
const formatCount = (value: number) => value.toLocaleString();

const SaleDistributionChart: React.FC<SaleDistributionChartProps> = ({ selectedSale }) => {
    const [data, setData] = useState<SaleDistributionData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const town = selectedSale?.town || '';
        const property_type = selectedSale?.property_type || '';
        const serial_number = selectedSale?.serial_number || '';

        setLoading(true);
        setError(null);
        const API_BASE_URL = 'https://four030-dashboard.onrender.com';
        const endpoint = `${API_BASE_URL}/api/sales/context?town=${town}&property_type=${property_type}&serial_number=${serial_number}`;

        fetch(endpoint)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch distribution data.');
                return response.json();
            })
            .then(contextData => {
                const processedData = contextData.saleDistribution.map((d: any) => ({
                    ...d,
                    count: parseInt(d.count, 10),
                }));
                // FIX: Replaces state entirely
                setData(processedData);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message || 'Error fetching data.');
                setLoading(false);
            });
    }, [selectedSale]);

    const chartData = data;

    if (loading) {
        return <div className="text-gray-400 p-4 h-full flex items-center justify-center">Loading Distribution Data...</div>;
    }
    if (error) {
        return <div className="text-red-400 p-4 h-full flex items-center justify-center">Error: {error}</div>;
    }

    const title = selectedSale
        ? `Sale Price Distribution for "${selectedSale.property_type}"`
        : `Sale Price Distribution for All Property Types (Global)`;

    return (
        <div className="h-full">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
            <div style={{ height: 'calc(100% - 30px)' }}>
                <BarChartComponent
                    data={chartData}
                    xAxisKey="price_bucket"
                    yAxisKey="count"
                    yAxisName="Frequency (Count)"
                    fill="#f59e0b" // Amber
                    yAxisTickFormatter={formatCount}
                />
            </div>
        </div>
    );
};

export default SaleDistributionChart;