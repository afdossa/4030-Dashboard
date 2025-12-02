import React, { useState, useEffect } from 'react';
import type { RealEstateSale } from '../types'; // Assuming you have this type


import BarChartComponent from './BarChart'; // Corrected path to BarChart.tsx

// Define the expected structure for the data used in this chart
interface MarketPenetrationData {
    town: string;
    count: number;
}

interface MarketPenetrationChartProps {
    selectedSale: RealEstateSale | null;
}

// Helper function for formatting large count values
const formatCount = (value: number) => value.toLocaleString();

const MarketPenetrationChart: React.FC<MarketPenetrationChartProps> = ({ selectedSale }) => {
    const [data, setData] = useState<MarketPenetrationData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!selectedSale) {
            setData([]);
            return;
        }

        const { town, property_type, serial_number } = selectedSale;
        setLoading(true);
        setError(null);

        const API_BASE_URL = 'https://four030-dashboard.onrender.com';
        // Ensure the Express API endpoint /api/sales/context is active and deployed
        const endpoint = `${API_BASE_URL}/api/sales/context?town=${town}&property_type=${property_type}&serial_number=${serial_number}`;

        fetch(endpoint)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch contextual market data.');
                }
                return response.json();
            })
            .then(contextData => {
                // We only care about the marketPenetration part for this chart
                const processedData = contextData.marketPenetration.map((d: any) => ({
                    ...d,
                    count: parseInt(d.count, 10),
                }));
                setData(processedData);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetching error:", err);
                setError(err.message || 'Error fetching data.');
                setLoading(false);
            });
    }, [selectedSale]);


    if (!selectedSale) {
        return (
            <div className="text-gray-400 p-4 border border-gray-700 rounded-lg h-full flex items-center justify-center">
                Click a point on the Scatter Plot to see Market Penetration by Town.
            </div>
        );
    }

    if (loading) {
        return <div className="text-gray-400 p-4 h-full flex items-center justify-center">Loading Market Data...</div>;
    }

    if (error) {
        return <div className="text-red-400 p-4 h-full flex items-center justify-center">Error: {error}</div>;
    }

    return (
        <div className="h-full">
            <h3 className="text-lg font-semibold text-gray-200 mb-2">
                Sales Count of "{selectedSale.property_type}" by Town
            </h3>
            <div style={{ height: 'calc(100% - 30px)' }}>
                <BarChartComponent
                    data={data}
                    xAxisKey="town"
                    yAxisKey="count"
                    yAxisName="Number of Sales"
                    fill="#10b981"
                    yAxisTickFormatter={formatCount}
                />
            </div>
        </div>
    );
};

export default MarketPenetrationChart;