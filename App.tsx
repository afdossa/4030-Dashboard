import React, { useState, useEffect, useMemo } from 'react';
import type { RealEstateSale, ChartConfig, ChartName, ChartSize, FilterState } from './types';
import BarChartComponent from './components/BarChart';
import LineChartComponent from './components/LineChart';
import ScatterPlotComponent from './components/ScatterPlot';
import Chatbot from './components/Chatbot';

type DisplayField = keyof RealEstateSale | 'sales_count' | 'avg_sale_amount' | 'count' | 'avg_assessed_value' | 'total_sale_amount';

interface ChartDisplayConfig {
    bar: { displayField: DisplayField, title: string };
    bar2: { displayField: DisplayField, title: string };
}

const App: React.FC = () => {
    const [salesData, setSalesData] = useState<RealEstateSale[]>([]);
    // **NEW STATE** to manage the Data Assistant panel visibility
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);
    // NOTE: chartConfig state is kept to track potential user/chatbot size changes,
    // but the final rendering logic below overrides the 'size' property to enforce the fixed layout.
    const [chartConfig, setChartConfig] = useState<ChartConfig>({
        bar: { size: 'small', title: 'Raw Sale Amount by Town' },
        bar2: { size: 'small', title: 'Raw Assessed Value by Property Type' },
        line: { size: 'small', title: 'Sales Trend Over Years' },
        scatter: { size: 'full', title: 'Assessed Value vs. Sale Amount' },
    });
    const [chartDisplay, setChartDisplay] = useState<ChartDisplayConfig>({
        bar: { displayField: 'sale_amount', title: 'Raw Sale Amount by Town' },
        bar2: { displayField: 'assessed_value', title: 'Raw Assessed Value by Property Type' },
    });
    const [filters, setFilters] = useState<FilterState>({
        towns: [],
        propertyTypes: [],
    });
    const [selectedSale, setSelectedSale] = useState<RealEstateSale | null>(null);

    // ⬇️ BEGIN CHANGE: Update the useEffect hook to fetch from the API ⬇️
    useEffect(() => {
        // ⚠️ IMPORTANT: Replace 'YOUR-RENDER-API-URL' with the actual URL of your deployed Render Web Service!
        const API_ENDPOINT = 'https://YOUR-RENDER-API-URL.onrender.com/api/sales';

        fetch(API_ENDPOINT)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
                return response.json();
            })
            .then(data => setSalesData(data))
            .catch(error => console.error('Error fetching real estate data from API:', error));
    }, []);
    // ⬆️ END CHANGE ⬆️

    const setChartDisplayField = (chartName: 'bar' | 'bar2', displayField: DisplayField, title: string) => {
        setChartDisplay(prevConfig => ({
            ...prevConfig,
            [chartName]: { displayField, title },
        }));
        setChartConfig(prevConfig => ({
            ...prevConfig,
            [chartName]: { ...prevConfig[chartName], title: title || prevConfig[chartName].title },
        }));
        return `Successfully changed the data displayed in the ${chartName} chart to show ${title}.`;
    };

    const handlePointClick = (sale: RealEstateSale) => {
        if (selectedSale && selectedSale.serial_number === sale.serial_number) {
            setSelectedSale(null);
        } else {
            setSelectedSale(sale);
        }
    };

    const handleFunctionCall = async (name: string, args: any): Promise<string> => {
        if (name === 'resizeChart') {
            const { chartName, size } = args as { chartName: ChartName, size: ChartSize };
            if (chartConfig[chartName]) {
                setChartConfig(prevConfig => ({
                    ...prevConfig,
                    [chartName]: { ...prevConfig[chartName], size },
                }));
                // Acknowledge the change for the user but note the visual effect might be limited due to the fixed layout.
                return `Successfully updated the internal size configuration for '${chartName}' to '${size}'. Note: The dashboard's layout is currently fixed (scatter full, others small) to ensure a stable view.`;
            }
            return `Error: Chart '${chartName}' not found.`;
        }
        if (name === 'applyFilters') {
            const { towns = [], propertyTypes = [] } = args as { towns?: string[], propertyTypes?: string[] };
            setFilters({ towns, propertyTypes });
            const townText = towns.length > 0 ? towns.join(', ') : 'All';
            const propText = propertyTypes.length > 0 ? propertyTypes.join(', ') : 'All';
            setSelectedSale(null);
            return `Filters applied. Showing towns: ${townText}; property types: ${propText}.`;
        }
        if (name === 'setChartDisplay') {
            const { chartName, field, title } = args as { chartName: 'bar' | 'bar2', field: DisplayField, title: string };
            if (chartName === 'bar' || chartName === 'bar2') {
                return setChartDisplayField(chartName, field, title);
            }
            return `Error: Chart '${chartName}' does not support changing display field.`;
        }
        if (name === 'calculateAggregate') {
            const { field, operation, groupBy } = args as { field: keyof RealEstateSale, operation: 'average' | 'sum' | 'count' | 'median', groupBy?: keyof RealEstateSale };

            if (!filteredData.length) {
                return "No data available for the current filters to perform calculation.";
            }

            if (groupBy) {
                const groups = filteredData.reduce((acc, item) => {
                    const key = item[groupBy] as string | number;
                    if (!acc[key]) acc[key] = [];
                    if (typeof item[field] === 'number') acc[key].push(item[field] as number);
                    return acc;
                }, {} as Record<string | number, number[]>);

                let resultParts: string[] = [`${operation.charAt(0).toUpperCase() + operation.slice(1)} of ${field} by ${groupBy}:`];
                for (const key in groups) {
                    const values = groups[key];
                    if (values.length === 0) continue;
                    let aggValue: number;
                    if (operation === 'average') aggValue = values.reduce((a, b) => a + b, 0) / values.length;
                    else if (operation === 'sum') aggValue = values.reduce((a, b) => a + b, 0);
                    else if (operation === 'median') {
                        const sorted = [...values].sort((a, b) => a - b);
                        const mid = Math.floor(sorted.length / 2);
                        aggValue = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
                    }
                    else aggValue = values.length;

                    resultParts.push(`- ${key}: ${aggValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
                }
                return resultParts.join('\n');
            } else {
                const values = filteredData.map(d => d[field]).filter(v => typeof v === 'number') as number[];
                if (!values.length) return `No numerical data for field ${field}.`;

                let result: number;
                if (operation === 'average') result = values.reduce((a, b) => a + b, 0) / values.length;
                else if (operation === 'sum') result = values.reduce((a, b) => a + b, 0);
                else if (operation === 'median') {
                    const sorted = [...values].sort((a, b) => a - b);
                    const mid = Math.floor(sorted.length / 2);
                    result = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
                }
                else result = filteredData.length;
                return `The ${operation} for ${field} is ${result.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`;
            }
        }
        return `Unknown function: ${name}`;
    };

    const getGridClass = (size: ChartSize): string => {
        switch (size) {
            case 'small': return 'lg:col-span-4';
            case 'medium': return 'lg:col-span-6';
            case 'large': return 'lg:col-span-8';
            case 'full': return 'lg:col-span-12';
            default: return 'lg:col-span-12';
        }
    };

    const filteredData = useMemo(() => {
        return salesData.filter(item => {
            const townMatch = filters.towns.length === 0 || filters.towns.includes(item.town);
            const propTypeMatch = filters.propertyTypes.length === 0 || filters.propertyTypes.includes(item.property_type);
            return townMatch && propTypeMatch;
        });
    }, [salesData, filters]);

    const chartBaseData = useMemo(() => {
        if (selectedSale) {
            return filteredData.filter(sale => sale.town === selectedSale.town && sale.property_type === selectedSale.property_type);
        }
        return filteredData;
    }, [filteredData, selectedSale]);

    const barChartData = useMemo(() => {
        if (chartBaseData.length === 0) {
            return [];
        }

        const field = chartDisplay.bar.displayField;
        if (field === 'sale_amount' || field === 'assessed_value') {
            return chartBaseData;
        }

        const dataByTown = chartBaseData.reduce((acc, sale) => {
            const town = sale.town;
            if (!acc[town]) acc[town] = { sales: [], count: 0 };
            acc[town].sales.push(sale.sale_amount);
            acc[town].count++;
            return acc;
        }, {} as Record<string, { sales: number[], count: number }>);

        return Object.entries(dataByTown).map(([town, data]) => ({
            town,
            avg_sale_amount: data.sales.reduce((a, b) => a + b, 0) / data.count,
            total_sale_amount: data.sales.reduce((a, b) => a + b, 0),
            sales_count: data.count,
        }));
    }, [chartBaseData, chartDisplay.bar.displayField]);

    const propertyTypeBarChartData = useMemo(() => {
        if (chartBaseData.length === 0) {
            return [];
        }

        const field = chartDisplay.bar2.displayField;
        if (field === 'sale_amount' || field === 'assessed_value') {
            return chartBaseData;
        }

        const dataByPropType = chartBaseData.reduce((acc, sale) => {
            const propType = sale.property_type;
            if (!acc[propType]) acc[propType] = { count: 0, sum_sale_amount: 0, sum_assessed_value: 0 };
            acc[propType].count++;
            acc[propType].sum_sale_amount += sale.sale_amount;
            acc[propType].sum_assessed_value += sale.assessed_value;
            return acc;
        }, {} as Record<string, { count: number, sum_sale_amount: number, sum_assessed_value: number }>);

        return Object.entries(dataByPropType).map(([type, data]) => ({
            property_type: type,
            count: data.count,
            avg_sale_amount: data.sum_sale_amount / data.count,
            total_sale_amount: data.sum_sale_amount,
            avg_assessed_value: data.sum_assessed_value / data.count,
        })).sort((a, b) => b.count - a.count);
    }, [chartBaseData, chartDisplay.bar2.displayField]);

    const lineChartData = useMemo(() => {
        const dataByYear = chartBaseData.reduce((acc, sale) => {
            const year = sale.list_year;
            if (!acc[year]) acc[year] = { count: 0 };
            acc[year].count++;
            return acc;
        }, {} as Record<number, { count: number }>);

        return Object.entries(dataByYear).map(([year, data]) => ({
            year: parseInt(year),
            sales_count: data.count,
        })).sort((a, b) => a.year - b.year);
    }, [chartBaseData]);

    const barChartConfig = useMemo(() => {
        const field = chartDisplay.bar.displayField;
        let yAxisName: string;
        let yAxisTickFormatter = (value: number) => Number(value).toLocaleString();
        let fill = "#F66733";
        let xAxisKey: keyof RealEstateSale | 'town' = "town";

        if (field === 'sale_amount' || field === 'assessed_value') {
            yAxisName = field === 'sale_amount' ? 'Sale Amount' : 'Assessed Value';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            xAxisKey = 'town';
        } else if (field === 'avg_sale_amount' || field === 'total_sale_amount') {
            yAxisName = field === 'avg_sale_amount' ? 'Average Sale Amount' : 'Total Sale Amount';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
        } else if (field === 'sales_count') {
            yAxisName = 'Number of Sales';
            fill = "#5b21b6";
        } else {
            yAxisName = field as string;
        }
        return { xAxisKey: "town", yAxisKey: field, yAxisName, yAxisTickFormatter, fill };
    }, [chartDisplay.bar.displayField]);

    const propertyTypeBarChartConfig = useMemo(() => {
        const field = chartDisplay.bar2.displayField;
        let yAxisName: string;
        let yAxisTickFormatter = (value: number) => Number(value).toLocaleString();
        let fill = "#5b21b6";
        let xAxisKey: keyof RealEstateSale | 'property_type' = "property_type";

        if (field === 'sale_amount' || field === 'assessed_value') {
            yAxisName = field === 'sale_amount' ? 'Sale Amount' : 'Assessed Value';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            fill = "#F66733";
            xAxisKey = 'property_type';
        } else if (field === 'avg_sale_amount' || field === 'total_sale_amount') {
            yAxisName = field === 'avg_sale_amount' ? 'Average Sale Amount' : 'Total Sale Amount';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            fill = "#F66733";
        } else if (field === 'count') {
            yAxisName = 'Number of Sales';
        } else if (field === 'avg_assessed_value') {
            yAxisName = 'Average Assessed Value';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            fill = "#10b981";
        } else {
            yAxisName = field as string;
        }
        return { xAxisKey: "property_type", yAxisKey: field, yAxisName, yAxisTickFormatter, fill };
    }, [chartDisplay.bar2.displayField]);

    // Define the order of charts for rendering
    const chartOrder: ChartName[] = ['scatter', 'bar', 'bar2', 'line'];

    const renderChart = (chartName: ChartName, config: ChartConfig[ChartName]) => {
        // This function now uses the size passed in the config object
        const className = `bg-gray-800/50 rounded-lg p-4 shadow-lg transition-all duration-500 min-h-[400px] flex flex-col ${getGridClass(config.size)}`;

        const title = (chartName === 'bar' || chartName === 'bar2')
            ? chartDisplay[chartName].title
            : config.title;

        return (
            <div key={chartName} className={className}>
                <h2 className="text-lg font-semibold text-gray-300 mb-4">{title}</h2>
                <div className="flex-grow">
                    {chartName === 'bar' && <BarChartComponent
                        data={barChartData}
                        xAxisKey={barChartConfig.xAxisKey}
                        yAxisKey={barChartConfig.yAxisKey as string}
                        yAxisName={barChartConfig.yAxisName}
                        fill={barChartConfig.fill}
                        yAxisTickFormatter={barChartConfig.yAxisTickFormatter}
                    />}
                    {chartName === 'bar2' && <BarChartComponent
                        data={propertyTypeBarChartData}
                        xAxisKey={propertyTypeBarChartConfig.xAxisKey}
                        yAxisKey={propertyTypeBarChartConfig.yAxisKey as string}
                        yAxisName={propertyTypeBarChartConfig.yAxisName}
                        fill={propertyTypeBarChartConfig.fill}
                        yAxisTickFormatter={propertyTypeBarChartConfig.yAxisTickFormatter}
                    />}
                    {chartName === 'line' && <LineChartComponent data={lineChartData} />}
                    {chartName === 'scatter' && <ScatterPlotComponent
                        data={filteredData}
                        onPointClick={handlePointClick}
                        selectedSale={selectedSale}
                    />}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen font-sans">
            <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold text-orange-500">Real Estate Sales Dashboard</h1>
                    {/* **NEW BUTTON** to open the Data Assistant */}
                    <button
                        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-200"
                    >
                        Data Assistant
                    </button>
                </div>

                {/* --- IMPORTANT CHANGE: Use 12 columns --- */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

                    {/* 1. SCATTER PLOT: Full Width (12/12) */}
                    {renderChart('scatter', { ...chartConfig.scatter, size: 'full' })}

                    {/* 2. BAR CHART 1 ('Raw Sale Amount'): 1/3 Width (4/12) */}
                    {renderChart('bar', { ...chartConfig.bar, size: 'small' })}

                    {/* 3. BAR CHART 2 ('Raw Assessed Value'): 1/3 Width (4/12) */}
                    {renderChart('bar2', { ...chartConfig.bar2, size: 'small' })}

                    {/* 4. LINE CHART ('Sales Trend'): 1/3 Width (4/12) */}
                    {renderChart('line', { ...chartConfig.line, size: 'small' })}
                </div>
            </main>

            {/* **REPLACED ASIDE WITH FLOATING PANEL/MODAL** */}
            <div
                className={`fixed top-0 right-0 w-full md:w-96 lg:w-[450px] bg-gray-900/80 backdrop-blur-sm border-l border-gray-700/50 flex flex-col h-full max-h-screen z-50 transition-transform duration-300 ease-in-out
                ${isAssistantOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {/* Close Button at the top of the assistant */}
                <button
                    onClick={() => setIsAssistantOpen(false)}
                    className="absolute top-4 left-4 text-gray-300 hover:text-white text-xl font-bold z-10 p-2"
                >
                    &times;
                </button>
                <div className="flex-grow overflow-y-auto pt-10"> {/* Added padding top for close button */}
                    <Chatbot onFunctionCall={handleFunctionCall} salesData={salesData} selectedSale={selectedSale} />
                </div>
            </div>
        </div>
    );
};

export default App;