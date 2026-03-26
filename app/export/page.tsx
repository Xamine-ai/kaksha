'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { 
  Cloud, 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Database,
  Search,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { listStages, loadStageData } from '@/lib/utils/stage-storage';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

export default function ExportPage() {
  const router = useRouter();
  const [stages, setStages] = useState<any[]>([]);
  const [uploading, setUploading] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [s3Projects, setS3Projects] = useState<string[]>([]);

  useEffect(() => {
    const fetchStages = async () => {
      try {
        const [localList, s3ListResponse] = await Promise.all([
          listStages(),
          fetch('/api/s3/list').then(res => res.json()).catch(() => ({ projects: [] }))
        ]);
        
        setStages(localList);
        const s3Ids = (s3ListResponse?.projects || []).map((p: any) => p.id);
        setS3Projects(s3Ids);

        const statusMap: Record<string, 'idle' | 'success' | 'loading' | 'error'> = {};
        localList.forEach(s => {
          statusMap[s.id] = s3Ids.includes(s.id) ? 'success' : 'idle';
        });
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

      const { db } = await import('@/lib/utils/database');

      // 1. Process and Upload Associated Audio Files
      const audioIds = new Set<string>();
      data.scenes.forEach(scene => {
        (scene.actions || []).forEach(action => {
           if (action.type === 'speech' && action.audioId) {
             audioIds.add(action.audioId);
           }
        });
      });

      if (audioIds.size > 0) {
        console.log(`Processing ${audioIds.size} audio files...`);
        for (const audioId of audioIds) {
          let blob: Blob | undefined;
          let format = 'mp3';

          const record = await db.audioFiles.get(audioId);
          if (record && record.blob) {
            blob = record.blob;
            format = record.format;
          } else {
            // Try to fetch from server if missing in local DB (server-generated projects)
            const allActions = data.scenes.flatMap(s => s.actions || []);
            const action = allActions.find(a => a.type === 'speech' && a.audioId === audioId);
            if (action && (action as any).audioUrl) {
              const url = (action as any).audioUrl;
              try {
                const response = await fetch(url);
                if (response.ok) {
                  blob = await response.blob();
                  // Extract format from URL extension
                  const urlParts = url.split('.');
                  format = urlParts.length > 1 ? urlParts.pop()! : 'mp3';
                  console.log(`Fetched missing audio ${audioId} from server as .${format}`);
                }
              } catch (e) {
                console.error(`Failed to fetch audio from server: ${url}`, e);
              }
            }
          }

          if (blob) {
            const formData = new FormData();
            formData.append('file', blob, `${audioId}.${format}`);
            formData.append('assetId', audioId);
            formData.append('prefix', 'media/audio');
            
            const uploadRes = await fetch('/api/s3/upload-asset', {
              method: 'POST',
              body: formData,
            });

            if (uploadRes.ok) {
              const { key } = await uploadRes.json();
              // Update ALL actions using this audioId to point to the new S3 URL
              data.scenes.forEach(scene => {
                (scene.actions || []).forEach(action => {
                  if (action.type === 'speech' && action.audioId === audioId) {
                    (action as any).audioUrl = `/api/s3/asset?key=${encodeURIComponent(key)}`;
                  }
                });
              });
            } else {
              console.error(`Failed to sync audio ${audioId}`);
            }
          } else {
            console.warn(`Audio ${audioId} not found in DB or server; skipping.`);
          }
        }
      }

      // 2. Process and Upload AI-generated Media Files (images/videos)
      const mediaRecords = await db.mediaFiles.where('stageId').equals(id).toArray();
      if (mediaRecords.length > 0) {
        console.log(`Processing ${mediaRecords.length} media files...`);
        for (const rec of mediaRecords) {
           const format = rec.mimeType.split('/')[1] || (rec.type === 'image' ? 'png' : 'mp4');
           const formData = new FormData();
           formData.append('file', rec.blob, `${rec.id}.${format}`);
           formData.append('assetId', rec.id); 
           formData.append('prefix', rec.type === 'image' ? 'media/image' : 'media/video');
           
           const uploadRes = await fetch('/api/s3/upload-asset', { 
             method: 'POST',
             body: formData,
           });

           if (uploadRes.ok) {
              const { key } = await uploadRes.json();
              // Update scenes to use S3 URL
              data.scenes.forEach(scene => {
                if (scene.type !== 'slide') return;
                const canvas = (scene.content as any)?.canvas;
                if (!canvas?.elements) return;
                canvas.elements.forEach((el: any) => {
                  if (el.id === rec.id) {
                    el.src = `/api/s3/asset?key=${encodeURIComponent(key)}`;
                  }
                });
              });
           }
        }
      }

      // 3. Upload Updated Project JSON
      const jsonResponse = await fetch('/api/s3/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, data }),
      });

      if (!jsonResponse.ok) {
        throw new Error(`Project JSON upload failed: ${jsonResponse.statusText}`);
      }

      setUploading(prev => ({ ...prev, [id]: 'success' }));
      toast.success(`Project "${data.stage.name}" synced with Cloud.`);
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

  const filteredStages = stages.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            Cloud Sync Tool
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-10">
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            Sync Local Projects
            <Cloud className="size-8 text-xamine-purple" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl text-lg font-medium leading-relaxed">
            Upload your local classrooms to S3 and update all media links to point to the cloud. This ensures the project plays correctly on all devices.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input 
              placeholder="Search local projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <Button 
            onClick={uploadAll} 
            disabled={stages.length === 0 || isBulkUploading}
            className="rounded-xl bg-xamine-purple hover:bg-xamine-purple/90 shrink-0 gap-2"
          >
            {isBulkUploading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Sync All Pending
          </Button>
        </div>

        <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200/60 dark:border-slate-800/60 rounded-[2rem] p-6 mb-8 overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {filteredStages.length} Classroom{filteredStages.length !== 1 ? 's' : ''} Locally
            </h3>
          </div>

          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredStages.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <Database className="size-12 mx-auto mb-3 opacity-20" />
                <p>No local classrooms found</p>
              </div>
            ) : (
              filteredStages.map((stage) => (
                <div 
                  key={stage.id} 
                  className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all group"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{stage.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-slate-400 py-0.5 px-2 bg-slate-100 dark:bg-slate-800 rounded">ID: {stage.id.slice(0, 8)}...</span>
                      <span className="text-[10px] text-slate-400">{new Date(stage.updatedAt || stage.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {uploading[stage.id] === 'success' && (
                      <div className="flex items-center gap-1.5 text-green-500 bg-green-50 dark:bg-green-500/10 px-3 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-500/20">
                        <CheckCircle2 className="size-3" />
                        Synced
                      </div>
                    )}
                    {uploading[stage.id] === 'error' && (
                      <div className="flex items-center gap-1.5 text-red-500 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-full text-xs font-bold border border-red-200 dark:border-red-500/20">
                        <AlertCircle className="size-3" />
                        Failed
                      </div>
                    )}
                    
                    <Button
                      size="sm"
                      onClick={() => uploadToS3(stage.id)}
                      disabled={uploading[stage.id] === 'loading'}
                      className={cn(
                        "rounded-xl gap-2 transition-all min-w-[100px]",
                        uploading[stage.id] === 'success' 
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          : "bg-purple-600 hover:bg-purple-700 text-white"
                      )}
                    >
                      {uploading[stage.id] === 'loading' ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" />
                          Processing
                        </>
                      ) : uploading[stage.id] === 'success' ? (
                        <>
                          <RefreshCw className="size-3.5" />
                          Resync
                        </>
                      ) : (
                        <>
                          <Upload className="size-3.5" />
                          Sync to Cloud
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {loadError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-200 dark:border-red-900/20 text-center mb-6">
            <AlertCircle className="size-5 mx-auto mb-2" />
            {loadError}
          </div>
        )}

        <div className="text-center text-xs text-slate-400 italic">
          Tip: Sync projects after generation to make them available across all machines.
        </div>
      </motion.div>
    </AuroraBackground>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
