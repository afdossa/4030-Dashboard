
import React, { useState, useEffect, useMemo } from 'react';
import type { RealEstateSale, ChartConfig, ChartName, ChartSize, FilterState } from './types';
import BarChartComponent from './components/BarChart';
import LineChartComponent from './components/LineChart';
import ScatterPlotComponent from './components/ScatterPlot';
import Chatbot from './components/Chatbot';
import FilterControls from './components/FilterControls';

const App: React.FC = () => {
  const [salesData, setSalesData] = useState<RealEstateSale[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    bar: { size: 'medium', title: 'Average Sale Amount by Town' },
    bar2: { size: 'medium', title: 'Sales Count by Property Type' },
    line: { size: 'medium', title: 'Sales Trend Over Years' },
    scatter: { size: 'medium', title: 'Assessed Value vs. Sale Amount' },
  });
  const [filters, setFilters] = useState<FilterState>({
    towns: [],
    propertyTypes: [],
  });

  useEffect(() => {
    fetch('real_estate_data.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setSalesData(data))
      .catch(error => console.error('Error fetching real estate data:', error));
  }, []);

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
    }));
  }, [filteredData]);

  const propertyTypeBarChartData = useMemo(() => {
    const dataByPropType = filteredData.reduce((acc, sale) => {
        const propType = sale.property_type;
        if (!acc[propType]) acc[propType] = { count: 0 };
        acc[propType].count++;
        return acc;
    }, {} as Record<string, { count: number }>);

    return Object.entries(dataByPropType).map(([type, data]) => ({
        property_type: type,
        count: data.count,
    })).sort((a,b) => b.count - a.count);
  }, [filteredData]);

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

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans">
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
        <h1 className="text-3xl font-bold text-orange-500 mb-6">Real Estate Sales Dashboard</h1>
        <div className="mb-6">
            <FilterControls
                towns={[...new Set(salesData.map(d => d.town))]}
                propertyTypes={[...new Set(salesData.map(d => d.property_type))]}
                activeFilters={filters}
                onFilterChange={(newFilters) => setFilters(newFilters)}
            />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {Object.entries(chartConfig).map(([key, config]) => {
                const chartName = key as ChartName;
                const className = `bg-gray-800/50 rounded-lg p-4 shadow-lg transition-all duration-500 min-h-[400px] flex flex-col ${getGridClass(config.size)}`;
                return (
                    <div key={chartName} className={className}>
                        <h2 className="text-lg font-semibold text-gray-300 mb-4">{config.title}</h2>
                         <div className="flex-grow">
                            {chartName === 'bar' && <BarChartComponent 
                                data={barChartData} 
                                xAxisKey="town" 
                                yAxisKey="avg_sale_amount" 
                                yAxisName="Average Sale Amount" 
                                fill="#F66733" 
                                yAxisTickFormatter={(value) => `$${Number(value).toLocaleString()}`} 
                            />}
                             {chartName === 'bar2' && <BarChartComponent 
                                data={propertyTypeBarChartData} 
                                xAxisKey="property_type" 
                                yAxisKey="count" 
                                yAxisName="Number of Sales" 
                                fill="#5b21b6" 
                                yAxisTickFormatter={(value) => Number(value).toLocaleString()}
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
