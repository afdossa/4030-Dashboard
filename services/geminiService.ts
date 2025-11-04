
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import type { RealEstateSale } from '../types';

// Ensure the API key is available.
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. Using a placeholder. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "AIzaSyBvLw_ytxa0KskssT8jXcjFLkaxHWKZWIw" });

const resizeChartFunction: FunctionDeclaration = {
    name: 'resizeChart',
    description: 'Resizes a specified chart on the dashboard.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            chartName: {
                type: Type.STRING,
                description: 'The name of the chart to resize. Options are: bar, bar2, line, scatter.',
                enum: ['bar', 'bar2', 'line', 'scatter'],
            },
            size: {
                type: Type.STRING,
                description: 'The target size for the chart. Options are: small, medium, large, full.',
                enum: ['small', 'medium', 'large', 'full'],
            },
        },
        required: ['chartName', 'size'],
    },
};

const calculateAggregateFunction: FunctionDeclaration = {
    name: 'calculateAggregate',
    description: 'Calculates an aggregate value (average, sum, count, median) for a specific data field, optionally grouped by another field.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            field: {
                type: Type.STRING,
                description: 'The data field to perform the calculation on. E.g., sale_amount, assessed_value.',
                enum: ['assessed_value', 'sale_amount', 'sales_ratio', 'list_year'],
            },
            operation: {
                type: Type.STRING,
                description: 'The aggregation operation to perform.',
                enum: ['average', 'sum', 'count', 'median'],
            },
            groupBy: {
                type: Type.STRING,
                description: 'Optional. The field to group the results by. E.g., town, property_type, list_year.',
                enum: ['town', 'property_type', 'residential_type', 'list_year'],
            },
        },
        required: ['field', 'operation'],
    },
};

const applyFiltersFunction: FunctionDeclaration = {
    name: 'applyFilters',
    description: 'Applies filters to the dataset to update the charts. Call with empty arrays or omit properties to clear specific filters.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            towns: {
                type: Type.ARRAY,
                description: 'An array of town names to filter by. An empty array removes the town filter.',
                items: { type: Type.STRING },
            },
            propertyTypes: {
                type: Type.ARRAY,
                description: 'An array of property types to filter by. An empty array removes the property type filter.',
                items: { type: Type.STRING },
            },
        },
    },
};

type GeminiResponse = 
    | { type: 'text'; content: string }
    | { type: 'functionCall'; name: string; args: any };

export async function runChat(prompt: string, data: RealEstateSale[]): Promise<GeminiResponse> {
    if (!API_KEY) {
        return { type: 'text', content: "AI is not configured. Please set the API_KEY environment variable." };
    }

    // Basic summary of data to provide context
    const dataSummary = `The dataset contains ${data.length} real estate sales records. Key fields include: town, list_year, assessed_value, sale_amount, property_type, residential_type.`;
    const availableTowns = [...new Set(data.map(d => d.town))];
    const availablePropTypes = [...new Set(data.map(d => d.property_type))];
    const context = `Available towns are: ${availableTowns.join(', ')}. Available property types are: ${availablePropTypes.join(', ')}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                role: 'user',
                parts: [{ text: prompt }]
            },
            config: {
                systemInstruction: `You are an AI assistant for a real estate data dashboard. ${dataSummary} ${context} You can answer questions about the data and control the dashboard UI. When asked to perform an action like resizing a chart, filtering data, or calculating metrics, use the provided tools. For general conversation or data questions that don't require specific calculations, provide a helpful text response.`,
                tools: [{ functionDeclarations: [resizeChartFunction, calculateAggregateFunction, applyFiltersFunction] }],
            }
        });

        const functionCalls = response.functionCalls;
        
        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            return {
                type: 'functionCall',
                name: call.name,
                args: call.args,
            };
        }

        const text = response.text;
        if (text) {
             return { type: 'text', content: text };
        }
       
        throw new Error("No valid response from Gemini.");

    } catch (error) {
        console.error("Gemini API Error:", error);
        if (error instanceof Error) {
            return { type: 'text', content: `Error communicating with AI: ${error.message}`};
        }
        return { type: 'text', content: "An unknown error occurred while contacting the AI."};
    }
}
