'use client';

import { useEffect, useState } from 'react';
import { getStudentOverallPerformance, getConceptMastery, getStudentSyllabus } from '@/lib/xamine-api';
import { Loader2, TrendingUp, BookOpen, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export function PerformanceCard() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentOverallPerformance()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card className="my-2 border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/50">
        <CardContent className="p-4 flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-medium">Failed to load performance data</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="my-2 p-6 flex flex-col items-center justify-center min-h-[120px] bg-slate-50/50 dark:bg-slate-900/20 backdrop-blur-sm border-slate-200 dark:border-slate-800">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500 mb-2" />
        <p className="text-sm text-slate-500 font-medium">Analyzing performance metrics...</p>
      </Card>
    );
  }

  return (
    <Card className="my-2 overflow-hidden border-purple-100 dark:border-purple-900/50 bg-gradient-to-br from-white to-purple-50 dark:from-slate-900 dark:to-purple-900/10 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="flex items-center gap-2 text-lg text-slate-800 dark:text-slate-200">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Overall Performance
        </CardTitle>
        <CardDescription className="text-xs">Based on latest Xamine assessments</CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Score</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  {data?.score ?? 85}%
                </span>
                <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">+4%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Rank</p>
              <p className="text-xl font-bold text-slate-700 dark:text-slate-300">Top 15%</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400">
              <span>Goal Progress</span>
              <span>{data?.score ?? 85}/100</span>
            </div>
            <Progress value={data?.score ?? 85} className="h-2 bg-purple-100 dark:bg-purple-950" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConceptMasteryList() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConceptMastery()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Card className="my-2 border-red-200 bg-red-50 dark:bg-red-900/10">
        <CardContent className="p-4 text-xs text-red-600">Failed to load mastery data</CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="my-2 p-6 flex flex-col items-center justify-center h-[120px] bg-slate-50/50 dark:bg-slate-900/20">
        <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
      </Card>
    );
  }

  const concepts = data?.concepts || [
    { name: 'Thermodynamics', level: 'Mastered', score: 92 },
    { name: 'Quantum Mechanics', level: 'Needs Review', score: 65 },
    { name: 'Electromagnetism', level: 'Proficient', score: 78 },
  ];

  return (
    <Card className="my-2 border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md shadow-sm">
      <CardHeader className="pb-2 px-4 pt-4 border-b border-slate-100 dark:border-slate-800/50">
        <CardTitle className="text-[14px] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          Concept Mastery
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
          {concepts.map((concept: any, idx: number) => (
            <div key={idx} className="p-3 px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{concept.name}</span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider">{concept.level}</span>
              </div>
              <Badge 
                variant="outline" 
                className={cn(
                  "font-mono font-medium",
                  concept.score >= 90 ? "text-green-600 border-green-200 bg-green-50" :
                  concept.score >= 75 ? "text-blue-600 border-blue-200 bg-blue-50" :
                  "text-amber-600 border-amber-200 bg-amber-50"
                )}
              >
                {concept.score}%
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SyllabusTracker() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudentSyllabus()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return <Card className="my-2 p-3 text-xs text-red-500 bg-red-50">Error loading syllabus</Card>;
  }

  if (!data) {
    return (
      <Card className="my-2 p-4 flex justify-center bg-slate-50/50">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
      </Card>
    );
  }

  const syllabus = data?.syllabus || { total: 40, completed: 25, currentModule: 'Atomic Physics' };
  const percentage = Math.round((syllabus.completed / syllabus.total) * 100);

  return (
    <Card className="my-2 border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none" />
      
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-800/50">
            <CheckCircle2 className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Syllabus Progress</h4>
            <p className="text-xs text-slate-500">Currently on: <span className="text-indigo-600 dark:text-indigo-400 font-medium">{syllabus.currentModule}</span></p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{percentage}% Completed</span>
            <span className="text-slate-500">{syllabus.completed} of {syllabus.total} modules</span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-indigo-500 rounded-full relative"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 w-1/2 rounded-full transform -skew-x-12 translate-x-full animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
