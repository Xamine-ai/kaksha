'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  Database,
  Cloud,
  ChevronRight,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { listStages, loadStageData, StageListItem } from '@/lib/utils/stage-storage';
import { toast } from 'sonner';
import { AuroraBackground } from '@/components/ui/aurora-background';

export default function ExportPage() {
  const router = useRouter();
  const [stages, setStages] = useState<StageListItem[]>([]);
  const [uploading, setUploading] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const list = await listStages();
        setStages(list);
        const statusMap: Record<string, 'idle'> = {};
        list.forEach(s => statusMap[s.id] = 'idle');
        setUploading(statusMap);
      } catch (err) {
        console.error('Failed to load local stages:', err);
        setLoadError('Failed to load local classrooms from IndexedDB');
      }
    };
    fetchStages();
  }, []);

  const uploadToS3 = async (id: string) => {
    setUploading(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const data = await loadStageData(id);
      if (!data) throw new Error('Stage data not found');

      const response = await fetch('/api/s3/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, data }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      setUploading(prev => ({ ...prev, [id]: 'success' }));
      toast.success(`Project "${data.stage.name}" uploaded to S3 successfully`);
    } catch (err) {
      console.error(`Upload error for stage ${id}:`, err);
      setUploading(prev => ({ ...prev, [id]: 'error' }));
      toast.error(`Failed to upload ${id}`);
    }
  };

  const uploadAll = async () => {
    setIsBulkUploading(true);
    for (const stage of stages) {
      if (uploading[stage.id] !== 'success') {
        await uploadToS3(stage.id);
      }
    }
    setIsBulkUploading(false);
    toast.success('All local classrooms have been processed');
  };

  return (
    <AuroraBackground className="min-h-screen w-full flex flex-col p-4 md:p-8 pt-24 items-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl glass rounded-3xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => router.push('/')} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full gap-2 transition-all">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2 px-4 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-bold border border-purple-200/50">
            <Database className="size-4" />
            Migration Tool
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Local Projects Migration
            <Cloud className="size-8 text-xamine-purple" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg font-medium leading-relaxed">
            Upload your local browser-stored classrooms to your AWS S3 bucket. This makes them available for everyone and ensures your data is permanently backed up.
          </p>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-[2rem] p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Found {stages.length} classrooms locally
            </h3>
            <Button 
              disabled={stages.length === 0 || isBulkUploading} 
              onClick={uploadAll}
              className="bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-transform rounded-2xl px-6 font-bold"
            >
              {isBulkUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Migrate All to S3
            </Button>
          </div>

          {loadError && (
             <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-2xl mb-4 border border-red-100/50">
                <AlertCircle className="size-5" />
                <span className="font-semibold">{loadError}</span>
             </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {stages.map((stage) => (
              <motion.div 
                key={stage.id} 
                layout
                className="group flex flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl hover:border-purple-300 dark:hover:border-purple-700/50 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-xamine-purple transition-colors">
                      {stage.name || 'Untitled Classroom'}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                      {stage.sceneCount} Scenes
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center justify-center p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/40">
                    {uploading[stage.id] === 'success' ? (
                      <CheckCircle2 className="size-5 text-green-500" />
                    ) : uploading[stage.id] === 'loading' ? (
                      <Loader2 className="size-5 text-purple-500 animate-spin" />
                    ) : uploading[stage.id] === 'error' ? (
                      <AlertCircle className="size-5 text-red-500" />
                    ) : (
                      <div className="size-5 rounded-full border-2 border-slate-200 dark:border-slate-700" />
                    )}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                   <p className="text-xs text-slate-400 font-medium">
                     ID: {stage.id.substring(0, 8)}...
                   </p>
                   {uploading[stage.id] !== 'success' && (
                     <button 
                       onClick={() => uploadToS3(stage.id)}
                       disabled={uploading[stage.id] === 'loading'}
                       className="text-xs font-bold text-xamine-purple hover:underline underline-offset-4 flex items-center gap-1 group/btn"
                     >
                       Upload Now
                       <ChevronRight className="size-3 transition-transform group-hover/btn:translate-x-0.5" />
                     </button>
                   )}
                </div>
              </motion.div>
            ))}
            {stages.length === 0 && (
               <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3">
                  <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <Database className="size-8 text-slate-300" />
                  </div>
                  <p className="font-bold text-slate-400">No local classrooms found</p>
               </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/40">
              <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                 <Cloud className="size-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h5 className="font-bold mb-2">S3 Storage</h5>
              <p className="text-sm text-slate-500 dark:text-slate-400">Unified storage for all users using AWS S3 Bucket (xamine2).</p>
           </div>
           
           <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/40">
              <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                 <ChevronRight className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <h5 className="font-bold mb-2">CloudFront</h5>
              <p className="text-sm text-slate-500 dark:text-slate-400">Low-latency global delivery of classroom data.</p>
           </div>
           
           <div className="p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-900/40">
              <div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
                 <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
              </div>
              <h5 className="font-bold mb-2">Everyone Can See</h5>
              <p className="text-sm text-slate-500 dark:text-slate-400">Migrated classrooms can be shared with simple links.</p>
           </div>
        </div>
      </motion.div>
    </AuroraBackground>
  );
}
