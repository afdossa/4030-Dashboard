import React, { useState, useEffect } from 'react';
import type { RealEstateSale } from '../types';
import BarChartComponent from './BarChart';

interface MarketPenetrationData { town: string; count: number; }
interface MarketPenetrationChartProps { selectedSale: RealEstateSale | null; }
const formatCount = (value: number) => value.toLocaleString();

const MarketPenetrationChart: React.FC<MarketPenetrationChartProps> = ({ selectedSale }) => {
    const [data, setData] = useState<MarketPenetrationData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Determine query parameters (defaults to empty strings for global)
        const town = selectedSale?.town || '';
        const property_type = selectedSale?.property_type || '';
        const serial_number = selectedSale?.serial_number || '';

        setLoading(true);
        setError(null);
        const API_BASE_URL = 'https://four030-dashboard.onrender.com';
        const endpoint = `${API_BASE_URL}/api/sales/context?town=${town}&property_type=${property_type}&serial_number=${serial_number}`;

        fetch(endpoint)
            .then(response => {
                if (!response.ok) throw new Error('Failed to fetch market data.');
                return response.json();
            })
            .then(contextData => {
                const processedData = contextData.marketPenetration.map((d: any) => ({
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

    if (loading) {
        return <div className="text-gray-400 p-4 h-full flex items-center justify-center">Loading Market Data...</div>;
    }
    if (error) {
        return <div className="text-red-400 p-4 h-full flex items-center justify-center">Error: {error}</div>;
    }

    const title = selectedSale
        ? `Sales Count of "${selectedSale.property_type}" by Town`
        : `Sales Count of All Property Types by Town (Global)`;

    return (
        <div className="h-full">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">{title}</h3>
            <div style={{ height: 'calc(100% - 30px)' }}>
                <BarChartComponent
                    data={data}
                    xAxisKey="town"
                    yAxisKey="count"
                    yAxisName="Number of Sales"
                    fill="#10b981" // Emerald
                    yAxisTickFormatter={formatCount}
                />
            </div>
        </div>
    );
};

export default MarketPenetrationChart;