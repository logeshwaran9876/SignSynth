import React from 'react';
import { motion } from 'framer-motion';

interface ProgressSectionProps {
  progress: number;
  statusText: string;
}

export function ProgressSection({ progress, statusText }: ProgressSectionProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 animate-pulse">
          {statusText || "Initializing..."}
        </h3>
        <span className="text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 py-1 px-3 rounded-full">
        {Math.min(Math.max(0, Math.floor(progress || 0)), 100)}%
        </span>
      </div>

      <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.1, ease: "linear" }}
        />
      </div>

      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        AI Engine Active • Secure Local rendering
      </p>
    </div>
  );
}
