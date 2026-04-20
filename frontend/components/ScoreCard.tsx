'use client';

import { motion } from 'framer-motion';

interface ScoreCardProps {
  title: string;
  score: number;
  evidence: string[];
}

export default function ScoreCard({ title, score, evidence }: ScoreCardProps) {
  const percentage = (score / 10) * 100;
  
  let colorClass = 'bg-red-500';
  if (score >= 7) colorClass = 'bg-green-500';
  else if (score >= 5.5) colorClass = 'bg-amber-500';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg"
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-slate-200 capitalize">
          {title.replace('_', ' ')}
        </h3>
        <span className={`px-3 py-1 rounded-full text-sm font-bold bg-slate-800 text-white ${score >= 7 ? 'text-green-400' : score >= 5.5 ? 'text-amber-400' : 'text-red-400'}`}>
          {score}/10
        </span>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-4 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Evidence</p>
        <ul className="space-y-2">
          {evidence.map((quote, idx) => (
            <li key={idx} className="text-slate-400 text-sm italic pl-3 border-l-2 border-slate-700">
              &quot;{quote}&quot;
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}
