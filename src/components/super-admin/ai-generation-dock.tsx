'use client';

import React, { useState } from 'react';
import { useAiGeneration } from '@/context/ai-generation-context';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Pause,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export function AiGenerationDock() {
  const {
    queuedItems,
    isGenerating,
    isPaused,
    isFinished,
    currentDishName,
    completedCount,
    failedCount,
    totalCount,
    pauseGeneration,
    resumeGeneration,
    cancelGeneration,
    retryFailed,
    clearQueue,
  } = useAiGeneration();

  const [isExpanded, setIsExpanded] = useState(false);

  if (totalCount === 0) return null;

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl border border-primary/20 bg-background/95 backdrop-blur-md transition-all duration-300 overflow-hidden">
      {/* Header Bar */}
      <div className="p-3.5 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent flex items-center justify-between gap-2 border-b border-primary/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-primary/20 text-primary rounded-lg shrink-0">
            {isGenerating ? (
              <Sparkles className="h-4 w-4 animate-pulse text-primary" />
            ) : isFinished ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-500" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-foreground truncate">
              {isFinished ? 'AI Photos Ready' : 'AI Menu Image Generator'}
            </h4>
            <p className="text-[10px] text-muted-foreground">
              {completedCount} of {totalCount} completed ({progressPercent}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isFinished && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={isPaused ? resumeGeneration : pauseGeneration}
              title={isPaused ? 'Resume' : 'Pause'}
            >
              {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
            onClick={clearQueue}
            title="Dismiss / Cancel"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Progress Bar & Status */}
      <div className="p-3.5 space-y-2">
        <Progress value={progressPercent} className="h-1.5" />

        {isGenerating && currentDishName && (
          <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
            <span>Generating: <strong className="text-foreground">{currentDishName}</strong></span>
          </p>
        )}

        {isPaused && (
          <p className="text-[11px] text-amber-500 font-medium">
            ⏸️ Generation paused. Click resume to continue.
          </p>
        )}

        {isFinished && failedCount === 0 && (
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            🎉 All {totalCount} dish photos generated and published live!
          </p>
        )}

        {failedCount > 0 && isFinished && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-destructive font-medium">
              {failedCount} dishes failed.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={retryFailed}
              className="h-6 text-[10px] gap-1 px-2"
            >
              <RotateCcw className="h-3 w-3" /> Retry Failed
            </Button>
          </div>
        )}

        {/* Expanded Dish List */}
        {isExpanded && (
          <ScrollArea className="h-44 border-t pt-2 mt-2">
            <div className="space-y-1.5 pr-2">
              {queuedItems.map((item) => (
                <div
                  key={item.docId}
                  className="flex items-center justify-between p-1.5 rounded-lg border bg-muted/30 text-[11px] gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {item.previewUrl ? (
                      <img
                        src={item.previewUrl}
                        alt={item.name}
                        className="h-6 w-6 rounded object-cover border shrink-0"
                      />
                    ) : (
                      <div className="h-6 w-6 rounded bg-muted flex items-center justify-center shrink-0 text-[9px] text-muted-foreground">
                        {item.status === 'generating' ? (
                          <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        ) : (
                          '•'
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="truncate block font-medium text-foreground">{item.name}</span>
                      {item.error && (
                        <span className="truncate block text-[9px] text-destructive">{item.error}</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {item.status === 'completed' && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-500 border-0">
                        ✓ Done
                      </Badge>
                    )}
                    {item.status === 'generating' && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-500/10 text-amber-500 border-0">
                        Active
                      </Badge>
                    )}
                    {item.status === 'queued' && (
                      <span className="text-[9px] text-muted-foreground">Queued</span>
                    )}
                    {item.status === 'failed' && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
