import React, { useState, useEffect, useMemo } from 'react';
import type { RealEstateSale, ChartConfig, ChartName, ChartSize, FilterState } from './types';
import BarChartComponent from './components/BarChart';
import LineChartComponent from './components/LineChart';
import ScatterPlotComponent from './components/ScatterPlot';
import Chatbot from './components/Chatbot';

type DisplayField = keyof RealEstateSale | 'sales_count' | 'avg_sale_amount' | 'count';

interface ChartDisplayConfig {
    bar: { displayField: DisplayField, title: string };
    bar2: { displayField: DisplayField, title: string };
}

const App: React.FC = () => {
    const [salesData, setSalesData] = useState<RealEstateSale[]>([]);
    const [chartConfig, setChartConfig] = useState<ChartConfig>({
        bar: { size: 'medium', title: 'Raw Sale Amount by Town' },
        bar2: { size: 'medium', title: 'Raw Assessed Value by Property Type' },
        line: { size: 'medium', title: 'Sales Trend Over Years' },
        scatter: { size: 'medium', title: 'Assessed Value vs. Sale Amount' },
    });
    const [chartDisplay, setChartDisplay] = useState<ChartDisplayConfig>({
        bar: { displayField: 'sale_amount', title: 'Raw Sale Amount by Town' },
        bar2: { displayField: 'assessed_value', title: 'Raw Assessed Value by Property Type' },
    });
    const [filters, setFilters] = useState<FilterState>({
        towns: [],
        propertyTypes: [],
    });

    useEffect(() => {
        fetch(`${import.meta.env.BASE_URL}real_estate_data.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => setSalesData(data))
            .catch(error => console.error('Error fetching real estate data:', error));
    }, []);

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

    const handleFunctionCall = async (name: string, args: any): Promise<string> => {
        if (name === 'resizeChart') {
            const { chartName, size } = args as { chartName: ChartName, size: ChartSize };
            if (chartConfig[chartName]) {
                setChartConfig(prevConfig => ({
                    ...prevConfig,
                    [chartName]: { ...prevConfig[chartName], size },
                }));
                return `Successfully resized the ${chartName} chart to ${size}.`;
            }
            return `Error: Chart '${chartName}' not found.`;
        }
        if (name === 'applyFilters') {
            const { towns = [], propertyTypes = [] } = args as { towns?: string[], propertyTypes?: string[] };
            setFilters({ towns, propertyTypes });
            const townText = towns.length > 0 ? towns.join(', ') : 'All';
            const propText = propertyTypes.length > 0 ? propertyTypes.join(', ') : 'All';
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

                    // FIX: Changed this line to remove the redundant group key from the output string
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
            case 'small': return 'lg:col-span-1';
            case 'medium': return 'lg:col-span-2';
            case 'large': return 'lg:col-span-3';
            case 'full': return 'lg:col-span-4';
            default: return 'lg:col-span-2';
        }
    };

    const filteredData = useMemo(() => {
        return salesData.filter(item => {
            const townMatch = filters.towns.length === 0 || filters.towns.includes(item.town);
            const propTypeMatch = filters.propertyTypes.length === 0 || filters.propertyTypes.includes(item.property_type);
            return townMatch && propTypeMatch;
        });
    }, [salesData, filters]);

    const barChartData = useMemo(() => {
        // ADDED CHECK: If there's no data, return an empty array immediately
        if (filteredData.length === 0) {
            return [];
        }

        const field = chartDisplay.bar.displayField;
        // If the display field is a raw data field, just return the filtered data
        if (field === 'sale_amount' || field === 'assessed_value') {
            return filteredData;
        }

        // Keep the aggregation logic for calculated fields (like count/average)
        const dataByTown = filteredData.reduce((acc, sale) => {
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
    }, [filteredData, chartDisplay.bar.displayField]);

    const propertyTypeBarChartData = useMemo(() => {
        // ADDED CHECK: If there's no data, return an empty array immediately
        if (filteredData.length === 0) {
            return [];
        }

        const field = chartDisplay.bar2.displayField;
        // If the display field is a raw data field, just return the filtered data
        if (field === 'sale_amount' || field === 'assessed_value') {
            return filteredData;
        }

        // Keep the aggregation logic for calculated fields (like count/average)
        const dataByPropType = filteredData.reduce((acc, sale) => {
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
        })).sort((a,b) => b.count - a.count);
    }, [filteredData, chartDisplay.bar2.displayField]);

    const lineChartData = useMemo(() => {
        const dataByYear = filteredData.reduce((acc, sale) => {
            const year = sale.list_year;
            if (!acc[year]) acc[year] = { count: 0 };
            acc[year].count++;
            return acc;
        }, {} as Record<number, { count: number }>);

        return Object.entries(dataByYear).map(([year, data]) => ({
            year: parseInt(year),
            sales_count: data.count,
        })).sort((a, b) => a.year - b.year);
    }, [filteredData]);

    const barChartConfig = useMemo(() => {
        const field = chartDisplay.bar.displayField;
        let yAxisName: string;
        let yAxisTickFormatter = (value: number) => Number(value).toLocaleString();
        let fill = "#F66733";
        let xAxisKey: keyof RealEstateSale | 'town' = "town";

        // Check for raw data fields
        if (field === 'sale_amount' || field === 'assessed_value') {
            yAxisName = field === 'sale_amount' ? 'Sale Amount' : 'Assessed Value';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            // When raw data is shown, we use the Town field for grouping/labeling on the X axis, even if it shows all records
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
        // Ensure xAxisKey is always 'town' for this specific chart
        return { xAxisKey: "town", yAxisKey: field, yAxisName, yAxisTickFormatter, fill };
    }, [chartDisplay.bar.displayField]);

    const propertyTypeBarChartConfig = useMemo(() => {
        const field = chartDisplay.bar2.displayField;
        let yAxisName: string;
        let yAxisTickFormatter = (value: number) => Number(value).toLocaleString();
        let fill = "#5b21b6";
        let xAxisKey: keyof RealEstateSale | 'property_type' = "property_type";

        // Check for raw data fields
        if (field === 'sale_amount' || field === 'assessed_value') {
            yAxisName = field === 'sale_amount' ? 'Sale Amount' : 'Assessed Value';
            yAxisTickFormatter = (value: number) => `$${Number(value).toLocaleString()}`;
            fill = "#F66733";
            // When raw data is shown, we use the Property Type field for grouping/labeling on the X axis
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
        // Ensure xAxisKey is always 'property_type' for this specific chart
        return { xAxisKey: "property_type", yAxisKey: field, yAxisName, yAxisTickFormatter, fill };
    }, [chartDisplay.bar2.displayField]);


    return (
        <div className="flex flex-col md:flex-row h-screen font-sans">
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <h1 className="text-3xl font-bold text-orange-500 mb-6">Real Estate Sales Dashboard</h1>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {Object.entries(chartConfig).map(([key, config]) => {
                        const chartName = key as ChartName;
                        const className = `bg-gray-800/50 rounded-lg p-4 shadow-lg transition-all duration-500 min-h-[400px] flex flex-col ${getGridClass(config.size)}`;
                        return (
                            <div key={chartName} className={className}>
                                <h2 className="text-lg font-semibold text-gray-300 mb-4">
                                    {(chartName === 'bar' || chartName === 'bar2') ? chartDisplay[chartName].title : config.title}
                                </h2>
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
                                    {chartName === 'scatter' && <ScatterPlotComponent data={filteredData} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>
            <aside className="w-full md:w-96 lg:w-[450px] bg-gray-900/80 backdrop-blur-sm border-l border-gray-700/50 flex flex-col h-full max-h-screen">
                <Chatbot onFunctionCall={handleFunctionCall} salesData={salesData} />
            </aside>
        </div>
    );
};

export default App;
