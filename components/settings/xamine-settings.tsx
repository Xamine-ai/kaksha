'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Globe } from 'lucide-react';
import { getStudentOverallPerformance, getConceptMastery, getStudentSyllabus, getNewStudentToken } from '@/lib/xamine-api';

export function XamineSettings() {
  const [debugOutput, setDebugOutput] = useState<string>('');
  const [isDebugging, setIsDebugging] = useState<boolean>(false);

  const handleDebugApi = async (apiName: string, apiCall: () => Promise<any>) => {
    setIsDebugging(true);
    setDebugOutput(`Calling ${apiName}...`);
    try {
      const result = await apiCall();
      setDebugOutput(JSON.stringify(result, null, 2));
    } catch (err: any) {
      setDebugOutput(`Error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDebugging(false);
    }
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Xamine API Integration</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Test internal Server Actions mapped securely to https://api.xamine.ai/</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <Button 
            variant="outline" size="sm" 
            disabled={isDebugging}
            onClick={() => handleDebugApi('getStudentOverallPerformance', getStudentOverallPerformance)}
          >
            Performance
          </Button>
          <Button 
            variant="outline" size="sm" 
            disabled={isDebugging}
            onClick={() => handleDebugApi('getConceptMastery', getConceptMastery)}
          >
            Concept Mastery
          </Button>
          <Button 
            variant="outline" size="sm" 
            disabled={isDebugging}
            onClick={() => handleDebugApi('getStudentSyllabus', getStudentSyllabus)}
          >
            Student Syllabus
          </Button>
          <Button 
            variant="outline" size="sm" 
            disabled={isDebugging}
            onClick={() => handleDebugApi('getNewStudentToken', () => getNewStudentToken('demo-student-123'))}
          >
            New Student Token
          </Button>
        </div>

        <div className="bg-slate-950 rounded-lg p-4 overflow-x-auto min-h-[300px] max-h-[500px] overflow-y-auto w-full">
          {isDebugging && debugOutput.startsWith('Calling') ? (
            <div className="flex items-center justify-center h-full min-h-[250px] gap-2 text-indigo-400 text-sm font-mono">
              <Loader2 className="w-5 h-5 animate-spin" />
              {debugOutput}
            </div>
          ) : (
            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap leading-relaxed">
              {debugOutput || 'Click a button above to run a fetch against the remote API.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
