
import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage, RealEstateSale } from '../types';
import { runChat } from '../services/geminiService';
import { SendIcon, BotIcon, UserIcon } from '../constants';

interface ChatbotProps {
    onFunctionCall: (name: string, args: any) => Promise<string>;
    salesData: RealEstateSale[];
}

const Chatbot: React.FC<ChatbotProps> = ({ onFunctionCall, salesData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
        role: 'model',
        content: "Hello! I'm your AI dashboard assistant. You can ask me to analyze the data, resize charts, or apply filters. Try 'show me data for Brookfield' or 'what is the median sale amount?'"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await runChat(input, salesData);

      if (response.type === 'text') {
        setMessages(prev => [...prev, { role: 'model', content: response.content }]);
      } else if (response.type === 'functionCall') {
        const resultMessage = await onFunctionCall(response.name, response.args);
        setMessages(prev => [...prev, { role: 'model', content: resultMessage }]);
      }
    } catch (error) {
      console.error("Error communicating with Gemini:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setMessages(prev => [...prev, { role: 'model', content: `Sorry, I ran into an issue: ${errorMessage}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-700/50">
        <h2 className="text-xl font-semibold text-orange-500">AI Assistant</h2>
      </div>
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'model' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-orange-500/20 flex items-center justify-center"><BotIcon className="w-5 h-5 text-orange-400" /></div>}
            <div className={`max-w-xs md:max-w-sm rounded-lg px-4 py-2 ${msg.role === 'user' ? 'bg-purple-800 text-white rounded-br-none' : 'bg-gray-700/80 text-gray-200 rounded-bl-none'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
             {msg.role === 'user' && <div className="w-8 h-8 flex-shrink-0 rounded-full bg-purple-500/20 flex items-center justify-center"><UserIcon className="w-5 h-5 text-purple-400" /></div>}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-orange-500/20 flex items-center justify-center"><BotIcon className="w-5 h-5 text-orange-400" /></div>
                <div className="max-w-xs md:max-w-sm rounded-lg px-4 py-2 bg-gray-700/80 text-gray-200 rounded-bl-none">
                    <div className="flex items-center space-x-1">
                        <span className="h-2 w-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 bg-orange-400 rounded-full animate-bounce"></span>
                    </div>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700/50">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the data..."
            className="flex-1 bg-gray-700/50 border border-gray-600 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-full p-2.5 transition-colors"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatbot;
