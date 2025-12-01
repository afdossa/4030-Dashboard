import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, ScatterChart, Scatter, Legend, Label, ZAxis
} from 'recharts';

type RealEstateSale = {
    serial_number: number;
    list_year: number;
    date_recorded: string;
    town: string;
    property_type: string;
    address: string;
    sale_amount: number;
    assessed_value: number;
    [key: string]: string | number;
};
type ChartSize = 'small' | 'medium' | 'large' | 'full';
type ChartName = 'bar' | 'bar2' | 'line' | 'scatter';
type ChartConfig = Record<ChartName, { size: ChartSize, title: string }>;
type DisplayField = keyof RealEstateSale | 'sales_count' | 'avg_sale_amount' | 'count' | 'avg_assessed_value' | 'total_sale_amount';
type FilterState = { towns: string[]; propertyTypes: string[] };

const CHATBOT_TOOLS = [
    {
        name: "applyFilters",
        description: "Apply filters to the real estate sales data displayed in the dashboard. Use this when the user wants to narrow down the visible data.",
        parameters: {
            type: "OBJECT",
            properties: {
                towns: {
                    type: "ARRAY",
                    description: "List of town names to filter by. Only sales in these towns will be shown. Use this if the user is asking about a specific town or set of towns.",
                    items: { type: "STRING" }
                },
                propertyTypes: {
                    type: "ARRAY",
                    description: "List of property types (e.g., 'Residential', 'Commercial', 'Apartment') to filter by. Only sales of these types will be shown.",
                    items: { type: "STRING" }
                }
            }
        }
    },
    {
        name: "setChartDisplay",
        description: "Change the data field displayed in one of the bar charts (bar or bar2). Only use this if the user specifically mentions changing what a bar chart shows (e.g., 'change bar chart to show average price').",
        parameters: {
            type: "OBJECT",
            properties: {
                chartName: {
                    type: "STRING",
                    enum: ["bar", "bar2"],
                    description: "The chart to modify. 'bar' is the first bar chart (grouped by town); 'bar2' is the second bar chart (grouped by property type)."
                },
                field: {
                    type: "STRING",
                    enum: ["sale_amount", "assessed_value", "sales_count", "avg_sale_amount", "total_sale_amount", "avg_assessed_value", "count"],
                    description: "The field to display on the Y-axis. 'sale_amount' and 'assessed_value' show raw data points. Aggregates like 'sales_count', 'avg_sale_amount', 'total_sale_amount', 'avg_assessed_value', or 'count' show aggregated data."
                },
                title: {
                    type: "STRING",
                    description: "A new descriptive title for the chart to reflect the change, e.g., 'Average Sale Price by Town'."
                }
            }
        }
    },
    {
        name: "calculateAggregate",
        description: "Calculate and report an aggregate metric (sum, average, count, or median) across the currently filtered data set. Use this when the user asks for a specific summary statistic like 'What is the average sale amount?' or 'How many sales were there?'",
        parameters: {
            type: "OBJECT",
            properties: {
                field: {
                    type: "STRING",
                    enum: ["sale_amount", "assessed_value", "list_year", "serial_number"],
                    description: "The numeric field to perform the calculation on."
                },
                operation: {
                    type: "STRING",
                    enum: ["average", "sum", "count", "median"],
                    description: "The mathematical operation to perform."
                },
                groupBy: {
                    type: "STRING",
                    enum: ["town", "property_type", "list_year"],
                    description: "Optional: The field to group the calculation by, if specified by the user (e.g., 'average by town')."
                }
            }
        }
    }
];

const Chatbot = ({ onFunctionCall, salesData, selectedSale }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const userMessage = { role: "user", text: input };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setLoading(true);

        // Fixed template literal syntax error here: used backticks correctly
        const systemInfo = `Current Dashboard State:
Total Data Points: ${salesData.length}
Selected Sale (Scatter Plot Highlighted): ${selectedSale ? `SN: ${selectedSale.serial_number}, Town: ${selectedSale.town}, Type: ${selectedSale.property_type}` : 'None'}`;

        const chatHistory = newMessages.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
        chatHistory.unshift({ role: "user", parts: [{ text: systemInfo }] });

        const payload = {
            contents: chatHistory,
            tools: [{ functionDeclarations: CHATBOT_TOOLS }],
            systemInstruction: {
                parts: [{
                    text: "You are a Real Estate Data Analyst assistant. Your goal is to guide the user in exploring the dashboard data using the available tools. When a tool is called, you MUST respond only with the function call block (e.g., 'applyFilters(towns:['New Haven'])') and NO natural language text. When responding to user questions without a tool, provide a concise, friendly, and helpful text response. Only call one tool per turn. If a user asks a calculation, use the 'calculateAggregate' tool. If the user asks to filter the data, use the 'applyFilters' tool. If the user asks to change what a bar chart is showing, use the 'setChartDisplay' tool. The user can refer to the bar charts as 'Town chart' (bar) and 'Property Type chart' (bar2)."
                }]
            }
        };

        const apiKey = "";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

        let callCount = 0;
        let finalResponseText = '';
        let currentMessages = newMessages;

        const processRequest = async (currentPayload) => {
            if (callCount >= 5) {
                return "The conversation loop reached maximum iterations for function calls.";
            }

            const maxRetries = 3;
            let response;
            for (let i = 0; i < maxRetries; i++) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(currentPayload)
                    });
                    if (response.ok) break;
                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    }
                } catch (error) {
                    if (i < maxRetries - 1) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                    } else {
                        throw error;
                    }
                }
            }

            if (!response || !response.ok) {
                return "API failed to respond after retries.";
            }

            const result = await response.json();
            const candidate = result.candidates?.[0];

            if (candidate?.functionCalls?.length > 0) {
                callCount++;
                const call = candidate.functionCalls[0];
                const functionResult = await onFunctionCall(call.name, call.args);

                const functionResponsePart = {
                    functionResponse: {
                        name: call.name,
                        response: { name: call.name, content: functionResult }
                    }
                };

                currentMessages = [...currentMessages, { role: "function", text: JSON.stringify(functionResponsePart) }];
                const nextChatHistory = currentMessages.map(msg => {
                    if (msg.role === 'function') {
                        return { role: 'tool', parts: [JSON.parse(msg.text)] };
                    }
                    return { role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] };
                });

                const nextPayload = { ...currentPayload, contents: nextChatHistory };
                return processRequest(nextPayload);

            } else if (candidate?.content?.parts?.[0]?.text) {
                return candidate.content.parts[0].text;
            } else {
                return "I'm sorry, I couldn't generate a meaningful response or function call.";
            }
        };

        try {
            finalResponseText = await processRequest(payload);
        } catch (error) {
            finalResponseText = "An unexpected error occurred during the API call.";
        } finally {
            setMessages(prev => [...prev, { role: "model", text: finalResponseText }]);
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/90 p-4">
            <h3 className="text-xl font-bold text-orange-500 mb-4 border-b border-gray-700 pb-2">Data Assistant</h3>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2">
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10">
                        Ask me to filter the data (e.g., "Show only sales in New Haven") or perform calculations (e.g., "What is the average assessed value?").
                    </div>
                )}
                {messages.map((msg, index) => (
                    <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-sm lg:max-w-md p-3 rounded-xl shadow-lg transition-all duration-300 ${msg.role === 'user' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-tl-none'}`}>
                            {msg.text.startsWith('{') && msg.role === 'function' ? (
                                <p className="font-mono text-sm text-gray-300">Tool execution successful.</p>
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.text}</p>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="mt-4 flex items-center pt-2 border-t border-gray-700">
                <input
                    type="text"
                    className="flex-grow p-3 rounded-l-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder={loading ? "Thinking..." : "Enter command or question..."}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                />
                <button
                    onClick={handleSend}
                    className="p-3 bg-orange-600 hover:bg-orange-700 text-white rounded-r-lg disabled:opacity-50 transition-colors"
                    disabled={loading}
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    )}
                </button>
            </div>
        </div>
    );
};

const BarChartComponent = ({ data, xAxisKey, yAxisKey, yAxisName, fill, yAxisTickFormatter }) => (
    <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey={xAxisKey} stroke="#9ca3af" interval={0} angle={-35} textAnchor="end" height={80} />
            <YAxis stroke="#9ca3af" tickFormatter={yAxisTickFormatter}>
                <Label value={yAxisName} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#9ca3af' }} />
            </YAxis>
            <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#f9fafb' }}
                formatter={(value) => yAxisTickFormatter(value)}
            />
            <Bar dataKey={yAxisKey} fill={fill} radius={[4, 4, 0, 0]} />
        </BarChart>
    </ResponsiveContainer>
);

const LineChartComponent = ({ data }) => (
    <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="year" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af">
                <Label value="Number of Sales" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#9ca3af' }} />
            </YAxis>
            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#f9fafb' }} />
            <Line type="monotone" dataKey="sales_count" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
    </ResponsiveContainer>
);

const ScatterPlotComponent = ({ data, onPointClick, selectedSale }) => {
    const isSelected = (sale) => selectedSale && selectedSale.serial_number === sale.serial_number;

    return (
        <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                <XAxis
                    dataKey="assessed_value"
                    type="number"
                    name="Assessed Value"
                    stroke="#9ca3af"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${(value / 1000).toLocaleString()}K`}
                >
                    <Label value="Assessed Value" offset={-15} position="bottom" style={{ fill: '#9ca3af' }} />
                </XAxis>
                <YAxis
                    dataKey="sale_amount"
                    type="number"
                    name="Sale Amount"
                    stroke="#9ca3af"
                    domain={['auto', 'auto']}
                    tickFormatter={(value) => `$${(value / 1000).toLocaleString()}K`}
                >
                    <Label value="Sale Amount" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: '#9ca3af' }} />
                </YAxis>
                <ZAxis dataKey="list_year" range={[50, 150]} name="Year" />
                <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#f9fafb' }}
                    formatter={(value, name, props) => {
                        if (name === 'list_year') return [`Year: ${value}`, 'Year'];
                        return [`$${Number(value).toLocaleString()}`, name];
                    }}
                    labelFormatter={(label, payload) => {
                        const sale = payload.find(p => p.payload)?.payload;
                        if (sale) return `SN: ${sale.serial_number} | ${sale.town}`;
                        return '';
                    }}
                />
                <Legend />
                <Scatter
                    name="Sale"
                    data={data}
                    fill="#F66733"
                    shape={(props) => {
                        const isSelectedPoint = isSelected(props.payload);
                        return (
                            <circle
                                cx={props.cx}
                                cy={props.cy}
                                r={isSelectedPoint ? 7 : 5}
                                fill={isSelectedPoint ? '#10b981' : '#F66733'}
                                stroke={isSelectedPoint ? '#ffffff' : 'none'}
                                strokeWidth={2}
                                opacity={isSelectedPoint ? 1 : 0.6}
                                onClick={() => onPointClick(props.payload)}
                                style={{ cursor: 'pointer', transition: 'all 0.1s' }}
                            />
                        );
                    }}
                />
            </ScatterChart>
        </ResponsiveContainer>
    );
};

interface ChartDisplayConfig {
    bar: { displayField: DisplayField, title: string };
    bar2: { displayField: DisplayField, title: string };
}

const App = () => {
    const [salesData, setSalesData] = useState<RealEstateSale[]>([]);
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
    const [showChatbot, setShowChatbot] = useState(false);

    useEffect(() => {
        // FIX: Reverting to a simple relative path to resolve the 'import.meta' compilation warning.
        fetch(`real_estate_data.json`)
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

                    resultParts.push(` - ${key}: ${aggValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
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

    const renderChart = (chartName: ChartName, config: ChartConfig[ChartName]) => {
        const className = `bg-gray-800/50 rounded-lg p-4 shadow-xl transition-all duration-500 min-h-[400px] flex flex-col ${getGridClass(config.size)}`;

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
        <div className="relative min-h-screen bg-gray-900 font-sans text-gray-100">
            <main className="p-6 lg:p-10 overflow-y-auto pb-20">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-extrabold text-orange-500 tracking-tight">Real Estate Sales Dashboard</h1>
                    <button
                        onClick={() => setShowChatbot(!showChatbot)}
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center space-x-2 active:scale-95 z-50"
                        title="Toggle Data Assistant"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z" />
                        </svg>
                        <span className="hidden md:inline">{showChatbot ? 'Close Assistant' : 'Open Assistant'}</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    {renderChart('scatter', { ...chartConfig.scatter, size: 'full' })}
                    {renderChart('bar', { ...chartConfig.bar, size: 'small' })}
                    {renderChart('bar2', { ...chartConfig.bar2, size: 'small' })}
                    {renderChart('line', { ...chartConfig.line, size: 'small' })}
                </div>
            </main>

            <div
                className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${showChatbot ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setShowChatbot(false)}
            ></div>

            <div
                className={`fixed top-0 right-0 h-full w-full max-w-sm md:max-w-md lg:max-w-lg z-50 bg-gray-900/90 backdrop-blur-lg border-l border-gray-700/50 shadow-2xl transition-transform duration-500 ease-in-out ${showChatbot ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-4 flex justify-end">
                    <button
                        onClick={() => setShowChatbot(false)}
                        className="p-2 text-gray-400 hover:text-orange-500 transition-colors rounded-full bg-gray-800/50"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="h-[calc(100%-60px)]">
                    <Chatbot onFunctionCall={handleFunctionCall} salesData={salesData} selectedSale={selectedSale} />
                </div>
            </div>
        </div>
    );
};

export default App;