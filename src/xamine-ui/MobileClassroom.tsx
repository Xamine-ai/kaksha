'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStageStore } from '@/lib/store';
import { PENDING_SCENE_ID } from '@/lib/store/stage';
import { useCanvasStore } from '@/lib/store/canvas';
import { useSettingsStore } from '@/lib/store/settings';
import { useI18n } from '@/lib/hooks/use-i18n';
import { SceneSidebar } from '@/components/stage/scene-sidebar';
import { Header } from '@/components/header';
import { CanvasArea } from '@/components/canvas/canvas-area';
import { Roundtable } from '@/components/roundtable';
import { PlaybackEngine, computePlaybackView } from '@/lib/playback';
import type { EngineMode, TriggerEvent, Effect } from '@/lib/playback';
import { ActionEngine } from '@/lib/action/engine';
import { createAudioPlayer } from '@/lib/utils/audio-player';
import type { Action, DiscussionAction, SpeechAction } from '@/lib/types/action';
import { ChatArea, type ChatAreaRef } from '@/components/chat/chat-area';
import { agentsToParticipants, useAgentRegistry } from '@/lib/orchestration/registry/store';
import type { AgentConfig } from '@/lib/orchestration/registry/types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { VisuallyHidden } from 'radix-ui';
import { cn } from '@/lib/utils';

/**
 * MobileClassroom Component
 *
 * Mobile-first refactor of the Stage component.
 * Uses a vertical stack: Whiteboard (40vh) on top, Chat/Interactions (60vh) below.
 */
export function MobileClassroom({
  onRetryOutline,
}: {
  onRetryOutline?: (outlineId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const { mode, getCurrentScene, scenes, currentSceneId, setCurrentSceneId, generatingOutlines } =
    useStageStore();
  const failedOutlines = useStageStore.use.failedOutlines();

  const currentScene = getCurrentScene();

  // Layout state from settings store (persisted via localStorage)
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useSettingsStore((s) => s.setSidebarCollapsed);
  const chatAreaWidth = useSettingsStore((s) => s.chatAreaWidth);
  const setChatAreaWidth = useSettingsStore((s) => s.setChatAreaWidth);
  const chatAreaCollapsed = useSettingsStore((s) => s.chatAreaCollapsed);
  const setChatAreaCollapsed = useSettingsStore((s) => s.setChatAreaCollapsed);

  // PlaybackEngine state
  const [engineMode, setEngineMode] = useState<EngineMode>('idle');
  const [playbackCompleted, setPlaybackCompleted] = useState(false);
  const [lectureSpeech, setLectureSpeech] = useState<string | null>(null);
  const [liveSpeech, setLiveSpeech] = useState<string | null>(null);
  const [speechProgress, setSpeechProgress] = useState<number | null>(null);
  const [discussionTrigger, setDiscussionTrigger] = useState<TriggerEvent | null>(null);

  // Speaking agent tracking
  const [speakingAgentId, setSpeakingAgentId] = useState<string | null>(null);

  // Thinking state
  const [thinkingState, setThinkingState] = useState<{
    stage: string;
    agentId?: string;
  } | null>(null);

  // Cue user state
  const [isCueUser, setIsCueUser] = useState(false);

  // End flash state
  const [showEndFlash, setShowEndFlash] = useState(false);
  const [endFlashSessionType, setEndFlashSessionType] = useState<'qa' | 'discussion'>('discussion');

  // Streaming state for stop button
  const [chatIsStreaming, setChatIsStreaming] = useState(false);
  const [chatSessionType, setChatSessionType] = useState<string | null>(null);

  // Topic pending state
  const [isTopicPending, setIsTopicPending] = useState(false);

  // Active bubble ID for playback highlight
  const [activeBubbleId, setActiveBubbleId] = useState<string | null>(null);

  // Scene switch confirmation dialog state
  const [pendingSceneId, setPendingSceneId] = useState<string | null>(null);

  // Whiteboard state
  const whiteboardOpen = useCanvasStore.use.whiteboardOpen();
  const setWhiteboardOpen = useCanvasStore.use.setWhiteboardOpen();

  // Selected agents
  const selectedAgentIds = useSettingsStore((s) => s.selectedAgentIds);

  // Generate participants
  const participants = useMemo(
    () => agentsToParticipants(selectedAgentIds, t),
    [selectedAgentIds, t],
  );

  // Pick a student agent for discussion trigger
  const pickStudentAgent = useCallback((): string => {
    const registry = useAgentRegistry.getState();
    const agents = selectedAgentIds
      .map((id) => registry.getAgent(id))
      .filter((a): a is AgentConfig => a != null);
    const students = agents.filter((a) => a.role === 'student');
    if (students.length > 0) {
      return students[Math.floor(Math.random() * students.length)].id;
    }
    const nonTeachers = agents.filter((a) => a.role !== 'teacher');
    if (nonTeachers.length > 0) {
      return nonTeachers[Math.floor(Math.random() * nonTeachers.length)].id;
    }
    return agents[0]?.id || 'default-1';
  }, [selectedAgentIds]);

  const engineRef = useRef<PlaybackEngine | null>(null);
  const audioPlayerRef = useRef(createAudioPlayer());
  const chatAreaRef = useRef<ChatAreaRef>(null);
  const lectureSessionIdRef = useRef<string | null>(null);
  const lectureActionCounterRef = useRef(0);
  const discussionAbortRef = useRef<AbortController | null>(null);
  const manualStopRef = useRef(false);
  const sceneEpochRef = useRef(0);
  const autoStartRef = useRef(false);

  const doSoftPause = useCallback(async () => {
    await chatAreaRef.current?.softPauseActiveSession();
    setLiveSpeech((prev) => (prev !== null ? prev + '...' : null));
    setThinkingState(null);
    setChatIsStreaming(false);
    setIsTopicPending(true);
  }, []);

  const doResumeTopic = useCallback(async () => {
    setIsTopicPending(false);
    setLiveSpeech(null);
    setSpeakingAgentId(null);
    setThinkingState({ stage: 'director' });
    setChatIsStreaming(true);
    await chatAreaRef.current?.resumeActiveSession();
  }, []);

  const resetLiveState = useCallback(() => {
    setLiveSpeech(null);
    setSpeakingAgentId(null);
    setSpeechProgress(null);
    setThinkingState(null);
    setIsCueUser(false);
    setIsTopicPending(false);
    setChatIsStreaming(false);
    setChatSessionType(null);
  }, []);

  const resetSceneState = useCallback(() => {
    resetLiveState();
    setPlaybackCompleted(false);
    setLectureSpeech(null);
    setSpeechProgress(null);
    setShowEndFlash(false);
    setActiveBubbleId(null);
    setDiscussionTrigger(null);
  }, [resetLiveState]);

  const doSessionCleanup = useCallback(() => {
    const activeType = chatSessionType;
    manualStopRef.current = true;
    engineRef.current?.handleEndDiscussion();
    manualStopRef.current = false;

    if (activeType === 'qa' || activeType === 'discussion') {
      setEndFlashSessionType(activeType);
      setShowEndFlash(true);
      setTimeout(() => setShowEndFlash(false), 1800);
    }
    resetLiveState();
  }, [chatSessionType, resetLiveState]);

  const handleStopDiscussion = useCallback(async () => {
    await chatAreaRef.current?.endActiveSession();
    doSessionCleanup();
  }, [doSessionCleanup]);

  useEffect(() => {
    sceneEpochRef.current++;
    chatAreaRef.current?.endActiveSession();
    if (discussionAbortRef.current) {
      discussionAbortRef.current.abort();
      discussionAbortRef.current = null;
    }
    resetSceneState();

    if (!currentScene || !currentScene.actions || currentScene.actions.length === 0) {
      engineRef.current = null;
      setEngineMode('idle');
      return;
    }

    if (engineRef.current) {
      engineRef.current.stop();
    }

    const actionEngine = new ActionEngine(useStageStore, audioPlayerRef.current);
    const engine = new PlaybackEngine([currentScene], actionEngine, audioPlayerRef.current, {
      onModeChange: (mode) => {
        setEngineMode(mode);
      },
      onSceneChange: (_sceneId) => {},
      onSpeechStart: (text) => {
        setLectureSpeech(text);
        if (lectureSessionIdRef.current) {
          const idx = lectureActionCounterRef.current++;
          const speechId = `speech-${Date.now()}`;
          chatAreaRef.current?.addLectureMessage(
            lectureSessionIdRef.current,
            { id: speechId, type: 'speech', text } as Action,
            idx,
          );
          const msgId = chatAreaRef.current?.getLectureMessageId(lectureSessionIdRef.current!);
          if (msgId) setActiveBubbleId(msgId);
        }
      },
      onSpeechEnd: () => {
        setActiveBubbleId(null);
      },
      onEffectFire: (effect: Effect) => {
        if (
          lectureSessionIdRef.current &&
          (effect.kind === 'spotlight' || effect.kind === 'laser')
        ) {
          const idx = lectureActionCounterRef.current++;
          chatAreaRef.current?.addLectureMessage(
            lectureSessionIdRef.current,
            {
              id: `${effect.kind}-${Date.now()}`,
              type: effect.kind,
              elementId: effect.targetId,
            } as Action,
            idx,
          );
        }
      },
      onProactiveShow: (trigger) => {
        if (!trigger.agentId) {
          trigger.agentId = pickStudentAgent();
        }
        setDiscussionTrigger(trigger);
      },
      onProactiveHide: () => {
        setDiscussionTrigger(null);
      },
      onDiscussionConfirmed: (topic, prompt, agentId) => {
        handleDiscussionSSE(topic, prompt, agentId);
      },
      onDiscussionEnd: () => {
        if (discussionAbortRef.current) {
          discussionAbortRef.current.abort();
          discussionAbortRef.current = null;
        }
        setDiscussionTrigger(null);
        resetLiveState();
        if (!manualStopRef.current) {
          setEndFlashSessionType('discussion');
          setShowEndFlash(true);
          setTimeout(() => setShowEndFlash(false), 1800);
        }
        if (engineRef.current?.isExhausted()) {
          setPlaybackCompleted(true);
        }
      },
      onUserInterrupt: (text) => {
        chatAreaRef.current?.sendMessage(text);
      },
      isAgentSelected: (agentId) => {
        const ids = useSettingsStore.getState().selectedAgentIds;
        return ids.includes(agentId);
      },
      getPlaybackSpeed: () => useSettingsStore.getState().playbackSpeed || 1,
      onComplete: () => {
        setPlaybackCompleted(true);
        if (lectureSessionIdRef.current) {
          chatAreaRef.current?.endSession(lectureSessionIdRef.current);
          lectureSessionIdRef.current = null;
        }
        const { autoPlayLecture } = useSettingsStore.getState();
        if (autoPlayLecture) {
          setTimeout(() => {
            const stageState = useStageStore.getState();
            if (!useSettingsStore.getState().autoPlayLecture) return;
            const allScenes = stageState.scenes;
            const curId = stageState.currentSceneId;
            const idx = allScenes.findIndex((s) => s.id === curId);
            if (idx >= 0 && idx < allScenes.length - 1) {
              const currentScene = allScenes[idx];
              if (
                currentScene.type === 'quiz' ||
                currentScene.type === 'interactive' ||
                currentScene.type === 'pbl'
              ) {
                return;
              }
              autoStartRef.current = true;
              stageState.setCurrentSceneId(allScenes[idx + 1].id);
            } else if (idx === allScenes.length - 1 && stageState.generatingOutlines.length > 0) {
              const currentScene = allScenes[idx];
              if (
                currentScene.type === 'quiz' ||
                currentScene.type === 'interactive' ||
                currentScene.type === 'pbl'
              ) {
                return;
              }
              autoStartRef.current = true;
              stageState.setCurrentSceneId(PENDING_SCENE_ID);
            }
          }, 1500);
        }
      },
    });

    engineRef.current = engine;

    if (autoStartRef.current) {
      autoStartRef.current = false;
      (async () => {
        if (currentScene && chatAreaRef.current) {
          const sessionId = await chatAreaRef.current.startLecture(currentScene.id);
          lectureSessionIdRef.current = sessionId;
          lectureActionCounterRef.current = 0;
        }
        engine.start();
      })();
    }
  }, [currentScene, pickStudentAgent, resetSceneState, handleStopDiscussion, doSoftPause, doResumeTopic, doSessionCleanup, resetLiveState]);

  useEffect(() => {
    const audioPlayer = audioPlayerRef.current;
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
      audioPlayer.destroy();
      if (discussionAbortRef.current) {
        discussionAbortRef.current.abort();
      }
    };
  }, []);

  const ttsMuted = useSettingsStore((s) => s.ttsMuted);
  useEffect(() => {
    audioPlayerRef.current.setMuted(ttsMuted);
  }, [ttsMuted]);

  const ttsVolume = useSettingsStore((s) => s.ttsVolume);
  useEffect(() => {
    if (!ttsMuted) {
      audioPlayerRef.current.setVolume(ttsVolume);
    }
  }, [ttsVolume, ttsMuted]);

  const playbackSpeed = useSettingsStore((s) => s.playbackSpeed);
  useEffect(() => {
    audioPlayerRef.current.setPlaybackRate(playbackSpeed);
  }, [playbackSpeed]);

  const handleDiscussionSSE = useCallback(
    async (topic: string, prompt?: string, agentId?: string) => {
      chatAreaRef.current?.startDiscussion({
        topic,
        prompt,
        agentId: agentId || 'default-1',
      });
      chatAreaRef.current?.switchToTab('chat');
      setChatIsStreaming(true);
      setChatSessionType('discussion');
      setThinkingState({ stage: 'director' });
    },
    [],
  );

  const firstSpeechText = useMemo(
    () => currentScene?.actions?.find((a): a is SpeechAction => a.type === 'speech')?.text ?? null,
    [currentScene],
  );

  const speakingStudentFlag = useMemo(() => {
    if (!speakingAgentId) return false;
    const agent = useAgentRegistry.getState().getAgent(speakingAgentId);
    return agent?.role !== 'teacher';
  }, [speakingAgentId]);

  const playbackView = useMemo(
    () =>
      computePlaybackView({
        engineMode,
        lectureSpeech,
        liveSpeech,
        speakingAgentId,
        thinkingState,
        isCueUser,
        isTopicPending,
        chatIsStreaming,
        discussionTrigger,
        playbackCompleted,
        idleText: firstSpeechText,
        speakingStudent: speakingStudentFlag,
        sessionType: chatSessionType,
      }),
    [
      engineMode,
      lectureSpeech,
      liveSpeech,
      speakingAgentId,
      thinkingState,
      isCueUser,
      isTopicPending,
      chatIsStreaming,
      discussionTrigger,
      playbackCompleted,
      firstSpeechText,
      speakingStudentFlag,
      chatSessionType,
    ],
  );

  const isTopicActive = playbackView.isTopicActive;

  const gatedSceneSwitch = useCallback(
    (targetSceneId: string): boolean => {
      if (targetSceneId === currentSceneId) return false;
      if (isTopicActive) {
        setPendingSceneId(targetSceneId);
        return false;
      }
      setCurrentSceneId(targetSceneId);
      return true;
    },
    [currentSceneId, isTopicActive, setCurrentSceneId],
  );

  const confirmSceneSwitch = useCallback(() => {
    if (!pendingSceneId) return;
    chatAreaRef.current?.endActiveSession();
    doSessionCleanup();
    setCurrentSceneId(pendingSceneId);
    setPendingSceneId(null);
  }, [pendingSceneId, setCurrentSceneId, doSessionCleanup]);

  const cancelSceneSwitch = useCallback(() => {
    setPendingSceneId(null);
  }, []);

  const handlePlayPause = async () => {
    const engine = engineRef.current;
    if (!engine) return;

    const mode = engine.getMode();
    if (mode === 'playing' || mode === 'live') {
      engine.pause();
      if (lectureSessionIdRef.current) {
        chatAreaRef.current?.pauseBuffer(lectureSessionIdRef.current);
      }
    } else if (mode === 'paused') {
      engine.resume();
      if (lectureSessionIdRef.current) {
        chatAreaRef.current?.resumeBuffer(lectureSessionIdRef.current);
      }
    } else {
      const wasCompleted = playbackCompleted;
      setPlaybackCompleted(false);
      if (currentScene && chatAreaRef.current) {
        const sessionId = await chatAreaRef.current.startLecture(currentScene.id);
        lectureSessionIdRef.current = sessionId;
      }
      if (wasCompleted) {
        lectureActionCounterRef.current = 0;
        engine.start();
      } else {
        engine.continuePlayback();
      }
    }
  };

  const handlePreviousScene = () => {
    if (isPendingScene) {
      if (scenes.length > 0) {
        gatedSceneSwitch(scenes[scenes.length - 1].id);
      }
      return;
    }
    const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
    if (currentIndex > 0) {
      gatedSceneSwitch(scenes[currentIndex - 1].id);
    }
  };

  const handleNextScene = () => {
    if (isPendingScene) return;
    const currentIndex = scenes.findIndex((s) => s.id === currentSceneId);
    if (currentIndex < scenes.length - 1) {
      gatedSceneSwitch(scenes[currentIndex + 1].id);
    } else if (hasNextPending) {
      setCurrentSceneId(PENDING_SCENE_ID);
    }
  };

  const isPendingScene = currentSceneId === PENDING_SCENE_ID;
  const hasNextPending = generatingOutlines.length > 0;
  const currentSceneIndex = isPendingScene
    ? scenes.length
    : scenes.findIndex((s) => s.id === currentSceneId);
  const totalScenesCount = scenes.length + (hasNextPending ? 1 : 0);

  const totalActions = currentScene?.actions?.length || 0;

  const handleWhiteboardToggle = () => {
    setWhiteboardOpen(!whiteboardOpen);
  };

  const canvasEngineState = (() => {
    switch (engineMode) {
      case 'playing':
      case 'live':
        return 'playing';
      case 'paused':
        return 'paused';
      default:
        return 'idle';
    }
  })();

  const discussionRequest: DiscussionAction | null = discussionTrigger
    ? {
        type: 'discussion',
        id: discussionTrigger.id,
        topic: discussionTrigger.question,
        prompt: discussionTrigger.prompt,
        agentId: discussionTrigger.agentId || 'default-1',
      }
    : null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900 h-[100dvh]">
      {/* Mobile Header */}
      <Header currentSceneTitle={currentScene?.title || ''} />

      {/* Top Section: Whiteboard/Stage (fixed at top with h-[40vh]) */}
      <div className="h-[40vh] min-h-[40vh] relative overflow-hidden bg-white dark:bg-gray-950 isolate border-b border-gray-100 dark:border-gray-800">
        <CanvasArea
          currentScene={currentScene}
          currentSceneIndex={currentSceneIndex}
          scenesCount={totalScenesCount}
          mode={mode}
          engineState={canvasEngineState}
          isLiveSession={
            chatIsStreaming || isTopicPending || engineMode === 'live' || !!chatSessionType
          }
          whiteboardOpen={whiteboardOpen}
          sidebarCollapsed={sidebarCollapsed}
          chatCollapsed={chatAreaCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          onToggleChat={() => setChatAreaCollapsed(!chatAreaCollapsed)}
          onPrevSlide={handlePreviousScene}
          onNextSlide={handleNextScene}
          onPlayPause={handlePlayPause}
          onWhiteboardClose={handleWhiteboardToggle}
          showStopDiscussion={
            engineMode === 'live' ||
            (chatIsStreaming && (chatSessionType === 'qa' || chatSessionType === 'discussion'))
          }
          onStopDiscussion={handleStopDiscussion}
          hideToolbar={mode === 'playback'}
          isPendingScene={isPendingScene}
          isGenerationFailed={
            isPendingScene && failedOutlines.some((f) => f.id === generatingOutlines[0]?.id)
          }
          onRetryGeneration={
            onRetryOutline && generatingOutlines[0]
              ? () => onRetryOutline(generatingOutlines[0].id)
              : undefined
          }
        />
      </div>

      {/* Bottom Section: Chat and Agent Area (h-[60vh] and independent scrolling) */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Agent interaction area (Roundtable) */}
        {mode === 'playback' && (
          <div className="shrink-0">
            <Roundtable
              mode={mode}
              initialParticipants={participants}
              playbackView={playbackView}
              currentSpeech={liveSpeech}
              lectureSpeech={lectureSpeech}
              idleText={firstSpeechText}
              playbackCompleted={playbackCompleted}
              discussionRequest={discussionRequest}
              engineMode={engineMode}
              isStreaming={chatIsStreaming}
              sessionType={
                chatSessionType === 'qa'
                  ? 'qa'
                  : chatSessionType === 'discussion'
                    ? 'discussion'
                    : undefined
              }
              speakingAgentId={speakingAgentId}
              speechProgress={speechProgress}
              showEndFlash={showEndFlash}
              endFlashSessionType={endFlashSessionType}
              thinkingState={thinkingState}
              isCueUser={isCueUser}
              isTopicPending={isTopicPending}
              onMessageSend={(msg) => {
                if (isTopicPending) {
                  setIsTopicPending(false);
                  setLiveSpeech(null);
                  setSpeakingAgentId(null);
                }
                if (
                  engineRef.current &&
                  (engineMode === 'playing' || engineMode === 'live' || engineMode === 'paused')
                ) {
                  engineRef.current.handleUserInterrupt(msg);
                } else {
                  chatAreaRef.current?.sendMessage(msg);
                }
                chatAreaRef.current?.switchToTab('chat');
                setIsCueUser(false);
                setChatIsStreaming(true);
                setChatSessionType(chatSessionType || 'qa');
                setThinkingState({ stage: 'director' });
              }}
              onDiscussionStart={() => {
                engineRef.current?.confirmDiscussion();
              }}
              onDiscussionSkip={() => {
                engineRef.current?.skipDiscussion();
              }}
              onStopDiscussion={handleStopDiscussion}
              onInputActivate={async () => {
                if (chatIsStreaming) {
                  await doSoftPause();
                }
                if (engineRef.current && (engineMode === 'playing' || engineMode === 'live')) {
                  engineRef.current.pause();
                }
              }}
              onSoftPause={doSoftPause}
              onResumeTopic={doResumeTopic}
              onPlayPause={handlePlayPause}
              totalActions={totalActions}
              currentActionIndex={0}
              currentSceneIndex={currentSceneIndex}
              scenesCount={totalScenesCount}
              whiteboardOpen={whiteboardOpen}
              sidebarCollapsed={sidebarCollapsed}
              chatCollapsed={chatAreaCollapsed}
              onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
              onToggleChat={() => setChatAreaCollapsed(!chatAreaCollapsed)}
              onPrevSlide={handlePreviousScene}
              onNextSlide={handleNextScene}
              onWhiteboardClose={handleWhiteboardToggle}
            />
          </div>
        )}

        {/* Chat Area Section */}
        <div className="flex-1 overflow-y-auto">
          <ChatArea
            ref={chatAreaRef}
            className="!w-full !border-l-0 !h-full"
            width={undefined}
            collapsed={false}
            onCollapseChange={undefined}
            activeBubbleId={activeBubbleId}
            onActiveBubble={(id) => setActiveBubbleId(id)}
            currentSceneId={currentSceneId}
            onLiveSpeech={(text, agentId) => {
              const epoch = sceneEpochRef.current;
              queueMicrotask(() => {
                if (sceneEpochRef.current !== epoch) return;
                setLiveSpeech(text);
                if (agentId !== undefined) {
                  setSpeakingAgentId(agentId);
                }
                if (text !== null || agentId) {
                  setChatIsStreaming(true);
                  setChatSessionType(chatAreaRef.current?.getActiveSessionType?.() ?? null);
                  setIsTopicPending(false);
                } else if (text === null && agentId === null) {
                  setChatIsStreaming(false);
                }
              });
            }}
            onSpeechProgress={(ratio) => {
              const epoch = sceneEpochRef.current;
              queueMicrotask(() => {
                if (sceneEpochRef.current !== epoch) return;
                setSpeechProgress(ratio);
              });
            }}
            onThinking={(state) => {
              const epoch = sceneEpochRef.current;
              queueMicrotask(() => {
                if (sceneEpochRef.current !== epoch) return;
                setThinkingState(state);
              });
            }}
            onCueUser={(_fromAgentId, _prompt) => {
              setIsCueUser(true);
            }}
            onStopSession={doSessionCleanup}
          />
        </div>
      </div>

      {/* Sidebar - Drawer mechanism or Hidden */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" 
          onClick={() => setSidebarCollapsed(true)}
        >
          <div 
            className="w-[80vw] h-full bg-white dark:bg-gray-900 shadow-2xl animate-in slide-in-from-left duration-300" 
            onClick={e => e.stopPropagation()}
          >
            <SceneSidebar
              collapsed={false}
              onCollapseChange={setSidebarCollapsed}
              onSceneSelect={gatedSceneSwitch}
              onRetryOutline={onRetryOutline}
            />
          </div>
        </div>
      )}

      {/* Scene switch confirmation dialog */}
      <AlertDialog
        open={!!pendingSceneId}
        onOpenChange={(open) => {
          if (!open) cancelSceneSwitch();
        }}
      >
        <AlertDialogContent className="w-[90vw] max-w-sm rounded-2xl p-0 overflow-hidden border-0 shadow-2xl dark:shadow-black/50">
          <VisuallyHidden.Root>
            <AlertDialogTitle>{t('stage.confirmSwitchTitle')}</AlertDialogTitle>
          </VisuallyHidden.Root>
          <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-red-400" />

          <div className="px-6 pt-5 pb-2 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 ring-1 ring-amber-200/50 dark:ring-amber-700/30">
              <AlertTriangle className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5">
              {t('stage.confirmSwitchTitle')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('stage.confirmSwitchMessage')}
            </p>
          </div>

          <AlertDialogFooter className="px-6 pb-5 pt-3 flex flex-row gap-3">
            <AlertDialogCancel onClick={cancelSceneSwitch} className="flex-1 rounded-xl min-h-[48px] p-4">
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSceneSwitch}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 shadow-md min-h-[48px] p-4"
            >
              {t('common.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
