"use client";
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import DiagramModal from './DiagramModal';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

interface Hotspot {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  action: 'open_modal' | 'open_image' | 'open_url' | 'navigate_floor' | 'navigate_room' | 'navigate_page';
  modal?: string;
  image_url?: string;
  url?: string;
  room_id?: string;
  path?: string;
  hint?: boolean;
}

interface RoomLink {
  label: string;
  url: string;
}

interface RoomConfig {
  room_display_name: string;
  owner: string;
  background_image: string;
  hotspots: Hotspot[];
  links?: RoomLink[];
  hide_back_button?: boolean;
  back_room_id?: string;
  back_label?: string;
  title?: string;
}

interface RegistryEntry {
  id: string;
  name: string;
  github_username: string;
  registry_id: string;
  status: string;
}

export default function RoomView({ onBack, registryId, room }: {
  onBack: () => void;
  registryId: string;
  room?: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [builderMode, setBuilderMode] = useState(searchParams.get('grid') === '1');
  const [pageStack, setPageStack] = useState<RoomConfig[]>([]);
  const [config, setConfig] = useState<RoomConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState<{ url: string; label: string } | null>(null);
  const [registryEntries, setRegistryEntries] = useState<RegistryEntry[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [showRoomInfo, setShowRoomInfo] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editRequested, setEditRequested] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState(false);

  useEffect(() => {
    fetch(`/registry/${registryId}/config.json`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(setConfig)
      .catch(() => setConfigError(true));
  }, [registryId]);

  const requestEdit = async () => {
    if (!supabase) return;
    setEditLoading(true);
    const { error } = await supabase.functions.invoke('create-edit-issue', {
      body: {
        registryId: room?.registry_id ?? registryId,
        githubUsername: room?.github_username ?? config?.owner,
        gridX: room?.grid_x,
        gridY: room?.grid_y,
        title: editTitle,
        description: editDescription,
      },
    });
    setEditLoading(false);
    if (error) { setEditError(true); }
    else { setShowEditModal(false); setEditRequested(true); }
  };

  const openRegistry = async () => {
    setActiveModal('registry');
    if (!supabase) return;
    setRegistryLoading(true);
    const { data } = await supabase
      .from('rooms')
      .select('id, name, github_username, registry_id, status')
      .neq('status', 'expired')
      .not('registry_id', 'is', null)
      .order('reserved_at', { ascending: true });
    setRegistryEntries(data || []);
    setRegistryLoading(false);
  };

  const navigatePage = async (path: string) => {
    if (!config) return;
    const base = `/registry/${registryId}/`;
    const url = base + path;
    const res = await fetch(url);
    if (!res.ok) return;
    const subConfig = await res.json();
    setPageStack(prev => [...prev, config]);
    setConfig(subConfig);
  };

  const handlePageBack = () => {
    const prev = pageStack[pageStack.length - 1];
    setPageStack(stack => stack.slice(0, -1));
    setConfig(prev);
  };

  const handleHotspot = (hotspot: Hotspot) => {
    if (hotspot.action === 'navigate_floor') {
      onBack();
    } else if (hotspot.action === 'navigate_room' && hotspot.room_id) {
      router.push(`/?room=${encodeURIComponent(hotspot.room_id)}`);
    } else if (hotspot.action === 'navigate_page' && hotspot.path) {
      navigatePage(hotspot.path);
    } else if (hotspot.action === 'open_url' && hotspot.url) {
      window.open(hotspot.url, '_blank', 'noopener,noreferrer');
    } else if (hotspot.action === 'open_image' && hotspot.image_url) {
      if (hotspot.url) {
        window.open(hotspot.url, '_blank', 'noopener,noreferrer');
      } else {
        setActiveImage({ url: hotspot.image_url, label: hotspot.label });
      }
    } else if (hotspot.action === 'open_modal') {
      if (hotspot.modal === 'registry') {
        openRegistry();
      } else if (hotspot.modal === 'diagram') {
        setActiveModal('diagram');
      } else {
        setActiveModal(hotspot.modal || null);
      }
    }
  };

  if (configError || (!config && !configError && room?.status === 'reserved')) {
    return (
      <div className="min-h-screen w-screen bg-stone-100 flex flex-col items-center justify-center p-6">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold hover:text-slate-900 transition-colors mb-8">← Floor Plan</button>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-200 text-center">
          <p className="text-2xl mb-3">🚧</p>
          <h2 className="text-slate-900 text-xl font-black tracking-tight mb-1">{room?.name || registryId}</h2>
          <p className="text-slate-400 text-sm mb-6">This room is under construction.</p>
          {room && (
            <div className="space-y-2 text-left">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-xs font-black uppercase tracking-widest text-slate-400">GitHub</span>
                <span className="text-sm font-mono text-slate-700">@{room.github_username}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Room ID</span>
                <code className="text-sm font-mono font-bold text-indigo-700">{room.registry_id}</code>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen w-screen bg-stone-100 flex flex-col items-center justify-center gap-4">
        <button onClick={onBack} className="text-slate-400 text-sm font-bold hover:text-slate-900 transition-colors">← Floor Plan</button>
        <div className="text-slate-400 text-sm">Loading room...</div>
      </div>
    );
  }

  return (
    <main className="h-screen w-screen overflow-hidden bg-stone-100">
      <div className="relative w-full h-full">
        <img
          src={config.background_image}
          alt={config.room_display_name}
          className="w-full h-full object-cover block"
          draggable={false}
        />

        {/* Render images directly on the wall */}
        {config.hotspots.filter(h => h.action === 'open_image' && h.image_url).map(hotspot => (
          <div
            key={`img-${hotspot.id}`}
            className="absolute pointer-events-none"
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
            }}
          >
            <img
              src={hotspot.image_url}
              alt={hotspot.label}
              className="w-full h-full object-cover rounded shadow-md"
              draggable={false}
            />
          </div>
        ))}

        {/* Hotspot click zones */}
        {config.hotspots.map(hotspot => (
          <button
            key={hotspot.id}
            onClick={() => handleHotspot(hotspot)}
            className={`absolute rounded-lg group transition-colors hover:bg-white/25 ${hotspot.hint ? 'bg-white/10 ring-1 ring-white/30' : ''}`}
            style={{
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              width: `${hotspot.width}%`,
              height: `${hotspot.height}%`,
              cursor: 'pointer',
            }}
            aria-label={hotspot.label}
          >
            <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/70 text-white text-[11px] font-bold rounded-full whitespace-nowrap transition-opacity pointer-events-none ${hotspot.hint ? 'opacity-60 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
              {hotspot.label}
            </span>
          </button>
        ))}

        {/* Builder mode toggle — bottom left, main room only */}
        {pageStack.length === 0 && (
          <button
            onClick={() => setBuilderMode(v => !v)}
            className={`absolute bottom-4 left-4 w-8 h-8 rounded-full shadow-md border flex items-center justify-center text-base transition-all ${builderMode ? 'bg-amber-400 border-amber-500' : 'bg-white/90 backdrop-blur-sm border-slate-200'}`}
            aria-label="Toggle builder mode"
            title="Builder mode"
          >
            🔨
          </button>
        )}

        {/* Debug grid overlay — visible in builder mode */}
        {builderMode && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 21 }, (_, i) => i * 5).map(pct => (
              <div key={`v${pct}`} className="absolute top-0 bottom-0 border-l border-white/40" style={{ left: `${pct}%` }}>
                <span className="absolute top-1 left-0.5 text-white text-[9px] font-bold bg-black/50 px-0.5 rounded leading-tight">{pct}</span>
              </div>
            ))}
            {Array.from({ length: 21 }, (_, i) => i * 5).map(pct => (
              <div key={`h${pct}`} className="absolute left-0 right-0 border-t border-white/40" style={{ top: `${pct}%` }}>
                <span className="absolute top-0.5 left-1 text-white text-[9px] font-bold bg-black/50 px-0.5 rounded leading-tight">{pct}</span>
              </div>
            ))}
            {config.hotspots.map(h => (
              <div
                key={`dbg-${h.id}`}
                className="absolute border-2 border-yellow-400 bg-yellow-400/20"
                style={{ left: `${h.x}%`, top: `${h.y}%`, width: `${h.width}%`, height: `${h.height}%` }}
              >
                <span className="absolute top-0.5 left-0.5 text-yellow-300 text-[9px] font-bold bg-black/60 px-0.5 rounded leading-tight">
                  {h.x},{h.y} {h.width}×{h.height}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Room info icon — bottom right */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setShowRoomInfo(v => !v)}
            className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors text-sm font-black"
            aria-label="Room info"
          >
            i
          </button>
          {showRoomInfo && (
            <div className="absolute bottom-10 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-56" onClick={e => e.stopPropagation()}>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Room Info</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Name</span>
                  <span className="text-xs font-bold text-slate-700">{config.room_display_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">GitHub</span>
                  <span className="text-xs font-mono text-slate-700">@{room?.github_username ?? config.owner}</span>
                </div>
                {room?.registry_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Room ID</span>
                    <code className="text-xs font-mono font-bold text-indigo-600">{room.registry_id}</code>
                  </div>
                )}
              </div>
              {supabase && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {editRequested ? (
                    <p className="text-xs text-center text-green-600 font-bold">Edit task created!</p>
                  ) : (
                    <button
                      onClick={() => { setEditError(false); setShowEditModal(true); }}
                      className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors"
                    >
                      Open a Task
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>


        {/* Room title */}
        {config.title && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <h1 className="text-white text-lg font-black tracking-tight drop-shadow-lg whitespace-nowrap px-4 py-1.5 bg-black/30 backdrop-blur-sm rounded-full">
              {config.title}
            </h1>
          </div>
        )}

        {/* Default back button — hidden if room has a custom door hotspot */}
        {!config.hide_back_button && (
          <button
            onClick={() => {
              if (pageStack.length > 0) {
                handlePageBack();
              } else if (config.back_room_id) {
                router.push(`/?room=${encodeURIComponent(config.back_room_id)}`);
              } else {
                onBack();
              }
            }}
            className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-black px-4 py-2 rounded-full shadow-md hover:bg-slate-900 hover:text-white transition-all border border-slate-200"
          >
            ← {pageStack.length > 0
              ? (pageStack[pageStack.length - 1].room_display_name ?? 'Back')
              : (config.back_label ?? (config.back_room_id ? 'Back' : 'Floor Plan'))
            }
          </button>
        )}

        {/* Persistent link buttons */}
        {config.links && config.links.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {config.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 backdrop-blur-sm text-slate-900 text-xs font-black px-4 py-2 rounded-full shadow-md hover:bg-indigo-600 hover:text-white transition-all border border-slate-200"
              >
                {link.label} →
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Full-size image modal */}
      {activeImage && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={activeImage.url} alt={activeImage.label} className="w-full h-auto rounded-2xl shadow-2xl" />
            <p className="text-white/70 text-xs text-center mt-3">{activeImage.label}</p>
          </div>
        </div>
      )}

      {/* Welcome Guide Modal */}
      {activeModal === 'welcome_guide' && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl overflow-y-auto max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Welcome to Open Room</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              An infinite building constructed one room at a time by real people, with help from AI.
            </p>

            <div className="space-y-5 mb-8">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">How to explore</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>→ Enter any room on the floor plan</li>
                  <li>→ Click the door to return to the floor plan</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">How to contribute a room</p>
                <ol className="space-y-1 text-sm text-slate-700 list-none">
                  <li>1. Click <strong>+ Add Room</strong> on the floor plan to reserve your spot — a GitHub issue is opened automatically with your room ID</li>
                  <li>2. Fork the repo on GitHub</li>
                  <li>3. Use the Claude skill to build your room — it'll walk you through everything from your room ID</li>
                  <li>4. Open a Pull Request — a Vercel preview is generated so you can check it looks right</li>
                  <li>5. Once approved and merged, your room goes live</li>
                </ol>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Edit an existing room</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>→ Click the <strong>i</strong> button in any room, then <strong>Open a Task</strong></li>
                  <li>→ Describe your change — a GitHub issue is created automatically</li>
                  <li>→ Fork the repo, make your edits, and open a PR</li>
                </ul>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1.5">Building codes</p>
                <ul className="space-y-1 text-sm text-slate-700">
                  <li>• Images: JPEG or WebP, max 200KB</li>
                  <li>• Total room folder: max 5MB</li>
                  <li>• One room per builder</li>
                </ul>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Contribute on GitHub</p>
              <a
                href="https://github.com/alyssafuward/open-room-open-source"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-500 hover:text-indigo-700 break-all underline underline-offset-4"
              >
                github.com/alyssafuward/open-room-open-source
              </a>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Room
            </button>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-xl font-black tracking-tight mb-1">Open a Task</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">Describe what you want to change. A GitHub issue will be opened for this room.</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1.5">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="e.g. New background image"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  placeholder="e.g. Replace the current background with a night-time version, and add a hotspot for my portfolio"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
            {editError && <p className="text-xs text-red-500 font-bold mb-3">Something went wrong. Try again.</p>}
            <button
              onClick={requestEdit}
              disabled={editLoading || !editTitle.trim() || !editDescription.trim()}
              className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-600 transition-colors disabled:opacity-50"
            >
              {editLoading ? 'Creating…' : 'Open a Task'}
            </button>
          </div>
        </div>
      )}

      {/* Diagram Modal */}
      {activeModal === 'diagram' && (
        <DiagramModal onClose={() => setActiveModal(null)} />
      )}

      {/* Registry Modal */}
      {activeModal === 'registry' && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 overflow-y-auto p-6"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl mx-auto my-6"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Room Registry</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Reserved rooms and their IDs. If you've reserved a room, find your room ID here.
            </p>

            {registryLoading ? (
              <div className="text-center py-8 text-slate-400 text-sm">Loading registry…</div>
            ) : registryEntries.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">No rooms reserved yet.</div>
            ) : (
              <div className="space-y-2 mb-6">
                {registryEntries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-400">@{entry.github_username}</p>
                    </div>
                    <code className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{entry.registry_id}</code>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Room
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
