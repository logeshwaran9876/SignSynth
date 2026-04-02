import React, { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

interface InputSectionProps {
  onGenerate: (text: string) => void;
  isProcessing: boolean;
}

export function InputSection({ onGenerate, isProcessing }: InputSectionProps) {
  const [inputText, setInputText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isProcessing) return;
    onGenerate(inputText.trim());
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="relative flex flex-col items-end gap-3">
        <div className="w-full relative">
          <textarea
            className="w-full p-4 h-32 text-lg text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none disabled:opacity-50"
            placeholder="Type a sentence to translate to sign language..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isProcessing}
          />
          <Sparkles className="absolute top-4 right-4 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
        
        <button
          type="submit"
          disabled={!inputText.trim() || isProcessing}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all ${
            (!inputText.trim() || isProcessing) 
              ? "bg-blue-400 cursor-not-allowed opacity-70" 
              : "bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Generate Sign Video
            </>
          )}
        </button>
      </form>
    </div>
  );
}
