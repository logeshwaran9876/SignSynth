import React from 'react';
import { MatchResult } from '../utils/matching';
import { PlayCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoDisplayProps {
  matchResult: MatchResult;
  onReset: () => void;
}

export function VideoDisplay({ matchResult, onReset }: VideoDisplayProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full max-w-4xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700"
    >
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 w-full aspect-video bg-black rounded-xl overflow-hidden shadow-inner relative group border border-gray-200 dark:border-gray-700">
          {/* Dynamic src uses the moved public folder videos */}
          <video 
            src={`/Videos/${matchResult.video}`}
            autoPlay
            controls
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full md:w-80 flex flex-col gap-4">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">
            Result Ready
          </h2>

          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Matched File</div>
            <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={matchResult.video}>
              {matchResult.video}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
              <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{matchResult.confidence}%</div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
              <PlayCircle className="w-6 h-6 text-blue-500 mb-2" />
              <div className="text-xs text-gray-500 dark:text-gray-400">Keywords</div>
              <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{matchResult.matchedKeywords.length}</div>
            </div>
          </div>

          {matchResult.matchedKeywords.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {matchResult.matchedKeywords.map((kw, idx) => (
                <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded-full font-medium">
                  {kw}
                </span>
              ))}
            </div>
          )}

          <button 
            onClick={onReset}
            className="mt-auto flex items-center justify-center gap-2 w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-xl transition"
          >
            <RotateCcw className="w-5 h-5" />
            Translate Another
          </button>
        </div>
      </div>
    </motion.div>
  );
}
