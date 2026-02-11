import { useState, useEffect, useRef, useCallback } from 'react';
import { llmLogStore, type LLMLogEntry } from '@/lib/langchain-openrouter';
import { X, ChevronDown, ChevronRight, Trash2, Bug, Minimize2, Maximize2 } from 'lucide-react';

/**
 * Floating dev-only popup that shows all Ollama LLM request/response traffic.
 * Draggable, collapsible, auto-scrolls to latest entry.
 */
export const DevLLMPopup = () => {
  const [entries, setEntries] = useState<LLMLogEntry[]>(llmLogStore.getAll());
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  // Drag state
  const [pos, setPos] = useState({ x: 16, y: 16 });
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    return llmLogStore.subscribe((updated) => {
      setEntries(updated);
      // Auto-open when first entry arrives
      if (updated.length > 0 && !visible) setVisible(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current && !minimized) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, minimized]);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Drag handlers ─────────────────────────────────────────────────
  const onDragStart = useCallback((e: React.MouseEvent) => {
    // Only drag from the title bar
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [pos]);

  if (!visible) {
    // Floating toggle button
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 z-[9999] bg-yellow-500 hover:bg-yellow-400 text-black rounded-full p-2 shadow-lg transition-colors"
        title="Show LLM Debug Popup"
      >
        <Bug className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div
      className="fixed z-[9999] flex flex-col bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl text-xs font-mono text-zinc-200"
      style={{
        left: pos.x,
        top: pos.y,
        width: minimized ? 260 : 520,
        maxHeight: minimized ? 36 : '70vh',
      }}
    >
      {/* Title bar (draggable) */}
      <div
        onMouseDown={onDragStart}
        className="flex items-center justify-between px-3 py-1.5 bg-zinc-800 rounded-t-lg cursor-grab active:cursor-grabbing select-none border-b border-zinc-700 shrink-0"
      >
        <span className="flex items-center gap-1.5 text-yellow-400 font-semibold text-[11px]">
          <Bug className="w-3.5 h-3.5" />
          LLM Debug
          <span className="text-zinc-500 font-normal">({entries.length})</span>
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => llmLogStore.clear()} title="Clear" className="p-0.5 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setMinimized(m => !m)} title={minimized ? 'Expand' : 'Minimize'} className="p-0.5 hover:text-blue-400 transition-colors">
            {minimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setVisible(false)} title="Close" className="p-0.5 hover:text-red-400 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Log entries */}
      {!minimized && (
        <div ref={scrollRef} className="overflow-y-auto flex-1 divide-y divide-zinc-800">
          {entries.length === 0 && (
            <div className="p-4 text-center text-zinc-500">No LLM calls yet. Paste a job description to trigger the agent.</div>
          )}
          {entries.map(entry => {
            const expanded = expandedIds.has(entry.id);
            return (
              <div key={entry.id} className="px-3 py-2">
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(entry.id)}
                  className="flex items-center gap-1.5 w-full text-left"
                >
                  {expanded ? <ChevronDown className="w-3 h-3 shrink-0 text-zinc-500" /> : <ChevronRight className="w-3 h-3 shrink-0 text-zinc-500" />}
                  <EntryBadge type={entry.type} />
                  <span className="text-zinc-400 text-[10px] ml-auto">
                    {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </button>

                {/* Expanded body */}
                {expanded && (
                  <div className="mt-1.5 ml-4.5 space-y-1">
                    {entry.type === 'request' && entry.messages?.map((m, i) => (
                      <div key={i}>
                        <span className="text-purple-400 font-semibold">[{m.role}]</span>
                        <pre className="whitespace-pre-wrap text-zinc-300 mt-0.5 max-h-60 overflow-y-auto bg-zinc-950 rounded p-1.5 text-[11px] leading-relaxed">
                          {m.text}
                        </pre>
                      </div>
                    ))}
                    {entry.type === 'response' && (
                      <pre className="whitespace-pre-wrap text-emerald-400 max-h-80 overflow-y-auto bg-zinc-950 rounded p-1.5 text-[11px] leading-relaxed">
                        {entry.output}
                      </pre>
                    )}
                    {entry.type === 'error' && (
                      <pre className="whitespace-pre-wrap text-red-400 bg-zinc-950 rounded p-1.5 text-[11px]">
                        {entry.error}
                      </pre>
                    )}
                    <div className="text-[9px] text-zinc-600">runId: {entry.runId}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const EntryBadge = ({ type }: { type: LLMLogEntry['type'] }) => {
  const styles = {
    request: 'bg-purple-900/60 text-purple-300 border-purple-700',
    response: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
    error: 'bg-red-900/60 text-red-300 border-red-700',
  };
  const labels = { request: '→ REQ', response: '← RES', error: '✕ ERR' };
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${styles[type]}`}>
      {labels[type]}
    </span>
  );
};
