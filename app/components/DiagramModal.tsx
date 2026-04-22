"use client";
import { useState } from 'react';

// ─── BUILDER JOURNEY ────────────────────────────────────────────────────────

type NodeId =
  | 'floor-plan' | 'reserve' | 'form' | 'room-id' | 'fork' | 'template'
  | 'build' | 'pr' | 'review' | 'merge' | 'live'
  | 'supabase-reserve' | 'vercel-preview' | 'vercel-prod' | 'supabase-live';

interface Node {
  id: NodeId;
  label: string;
  detail: string;
  type: 'builder' | 'system' | 'admin';
}

const NODES: Node[] = [
  { id: 'floor-plan',       type: 'builder', label: 'Visit Floor Plan',         detail: 'Anyone can browse the building. Rooms show on the grid based on the Supabase rooms table.' },
  { id: 'reserve',          type: 'builder', label: 'Click + Add Room',          detail: 'An empty adjacent cell is clicked. Opens the reservation form.' },
  { id: 'form',             type: 'builder', label: 'Fill Reservation Form',     detail: 'Builder enters their room name, GitHub username, and email. A friendly room ID (e.g. warm-harbor) is generated.' },
  { id: 'room-id',          type: 'builder', label: 'Get Room ID',               detail: 'Room ID is shown in the success modal. Builder must save it — this becomes their registry folder name.' },
  { id: 'fork',             type: 'builder', label: 'Fork the Repo',             detail: 'Builder forks github.com/alyssafuward/open-room-open-source to their own GitHub account.' },
  { id: 'template',         type: 'builder', label: 'Copy _template/',           detail: 'Copies public/registry/_template/ to public/registry/warm-harbor/. This is the starting point.' },
  { id: 'build',            type: 'builder', label: 'Build the Room',            detail: 'Builder adds a background image and edits config.json to define hotspots. They can preview locally.' },
  { id: 'pr',               type: 'builder', label: 'Open a Pull Request',       detail: 'Builder opens a PR from their fork to the main repo. Includes a screenshot of their room.' },
  { id: 'review',           type: 'admin',   label: 'Review PR',                 detail: "You review the PR using Vercel's automatic preview deployment. Visit the preview URL, enter the room, check it looks right." },
  { id: 'merge',            type: 'admin',   label: 'Merge PR',                  detail: 'You approve and merge. Vercel redeploys production. The room files are now live.' },
  { id: 'live',             type: 'builder', label: 'Room is Live',              detail: 'The room tile was already on the floor plan from the reservation. Now clicking it loads the real room instead of "under construction".' },
  { id: 'supabase-reserve', type: 'system',  label: 'Supabase: row created',     detail: 'A row is inserted into the rooms table with status: reserved and the registry_id set.' },
  { id: 'vercel-preview',   type: 'system',  label: 'Vercel: preview deploy',    detail: 'Vercel automatically builds and deploys the PR branch to a temporary URL.' },
  { id: 'vercel-prod',      type: 'system',  label: 'Vercel: prod deploy',       detail: 'On merge to main, Vercel redeploys production. The new registry folder is now served as static files.' },
  { id: 'supabase-live',    type: 'system',  label: 'Supabase: room goes live',  detail: 'Currently manual — you update status to active in the dashboard. Future: GitHub Action handles this on merge.' },
];

const BUILDER_FLOW: NodeId[] = ['floor-plan', 'reserve', 'form', 'room-id', 'fork', 'template', 'build', 'pr', 'review', 'merge', 'live'];
const SYSTEM_FLOW: NodeId[]  = ['supabase-reserve', 'vercel-preview', 'vercel-prod', 'supabase-live'];

const SYSTEM_TRIGGERS: Partial<Record<NodeId, NodeId>> = {
  form:  'supabase-reserve',
  pr:    'vercel-preview',
  merge: 'vercel-prod',
};

const TYPE_STYLES: Record<Node['type'], string> = {
  builder: 'bg-white border-slate-200 text-slate-900',
  admin:   'bg-indigo-50 border-indigo-200 text-indigo-900',
  system:  'bg-amber-50 border-amber-200 text-amber-900',
};
const TYPE_DOT: Record<Node['type'], string> = {
  builder: 'bg-slate-400',
  admin:   'bg-indigo-500',
  system:  'bg-amber-500',
};

// ─── GIT FLOW ────────────────────────────────────────────────────────────────

type GitZone = 'upstream' | 'fork' | 'local';
type GitStepId = 'fork' | 'clone' | 'build' | 'commit' | 'push' | 'pr' | 'merge' | 'sync';

interface GitStep {
  id: GitStepId;
  label: string;
  detail: string;
  from: GitZone | null;
  to: GitZone | null;
}

const GIT_STEPS: GitStep[] = [
  {
    id: 'fork',
    label: 'Fork the repo',
    detail: "GitHub copies alyssafuward/open-room-open-source to your own account. You now have your own version at your-name/open-room-open-source. This is a one-time setup — you can freely change your copy without affecting the original.",
    from: 'upstream', to: 'fork',
  },
  {
    id: 'clone',
    label: 'Clone to your computer',
    detail: "Downloads your fork from GitHub onto your local machine. Now the files are on your computer and you can edit them. Your local copy stays linked to your GitHub fork so you can sync changes back up.",
    from: 'fork', to: 'local',
  },
  {
    id: 'build',
    label: 'Build your room',
    detail: "Add your background image and edit config.json to define hotspots and links. Everything happens on your computer — no uploads yet.",
    from: null, to: 'local',
  },
  {
    id: 'commit',
    label: 'Commit',
    detail: "Saves a snapshot of your changes locally. Think of it as hitting Save, but better — git keeps the full history of every commit. Commits only exist on your computer until you push.",
    from: null, to: 'local',
  },
  {
    id: 'push',
    label: 'Push',
    detail: "Uploads your commits from your computer to your fork on GitHub. Think of it as backing up your work and making it visible online. You can push as many times as you want.",
    from: 'local', to: 'fork',
  },
  {
    id: 'pr',
    label: 'Open a Pull Request',
    detail: "A Pull Request is how you ask the maintainer to review and bring your changes into the main project. It shows exactly what files you changed. Vercel automatically builds a preview so your room can be reviewed before it goes live.",
    from: 'fork', to: 'upstream',
  },
  {
    id: 'merge',
    label: 'Maintainer merges',
    detail: "The maintainer reviews your room in the Vercel preview and merges if it looks good. Your files are now part of the main repo. Vercel redeploys production and your room tile goes from 'under construction' to live.",
    from: 'fork', to: 'upstream',
  },
  {
    id: 'sync',
    label: 'Sync (if needed)',
    detail: "If other rooms were merged while you were building, the main repo has moved ahead of your fork. You need to pull those changes in before opening a PR. GitHub's interface has a 'Sync fork' button that does this in one click.",
    from: 'upstream', to: 'fork',
  },
];

const ZONE_LABELS: Record<GitZone, { title: string; sub: string; color: string; bg: string; border: string }> = {
  upstream: { title: 'GitHub — main project', sub: 'alyssafuward/open-room-open-source', color: 'text-indigo-900', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  fork:     { title: 'GitHub — your fork',    sub: 'your-name/open-room-open-source',   color: 'text-violet-900', bg: 'bg-violet-50', border: 'border-violet-200' },
  local:    { title: 'Your computer',          sub: 'local files',                       color: 'text-amber-900',  bg: 'bg-amber-50',  border: 'border-amber-200' },
};

// ─── ARCHITECTURE FLOWS ──────────────────────────────────────────────────────

type Layer = 'user' | 'app' | 'database' | 'hosting' | 'static';

interface FlowStep {
  id: string;
  label: string;
  layer: Layer;
  detail: string;
}

interface Trigger {
  id: string;
  label: string;
  emoji: string;
  steps: FlowStep[];
}

const LAYER_STYLE: Record<Layer, { badge: string; dot: string; card: string; activeCard: string }> = {
  user:     { badge: 'bg-slate-100 text-slate-500',     dot: 'bg-slate-400',   card: 'bg-white border-slate-200 text-slate-900',           activeCard: 'bg-slate-900 border-slate-900 text-white' },
  app:      { badge: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500',  card: 'bg-violet-50 border-violet-200 text-violet-900',     activeCard: 'bg-violet-700 border-violet-700 text-white' },
  database: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-200 text-emerald-900',  activeCard: 'bg-emerald-700 border-emerald-700 text-white' },
  hosting:  { badge: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500',  card: 'bg-indigo-50 border-indigo-200 text-indigo-900',     activeCard: 'bg-indigo-700 border-indigo-700 text-white' },
  static:   { badge: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   card: 'bg-amber-50 border-amber-200 text-amber-900',        activeCard: 'bg-amber-700 border-amber-700 text-white' },
};

const LAYER_LABEL: Record<Layer, string> = {
  user: 'User', app: 'App', database: 'Database', hosting: 'Hosting', static: 'Static',
};

const TRIGGERS: Trigger[] = [
  {
    id: 'visit',
    label: 'User visits the site',
    emoji: '👀',
    steps: [
      { id: 'v1', layer: 'hosting',  label: 'Vercel serves the Next.js app',        detail: 'The browser hits the Vercel CDN, which serves the compiled Next.js bundle. No server spin-up — it\'s edge-cached globally.' },
      { id: 'v2', layer: 'app',      label: 'page.tsx mounts',                       detail: 'The floor plan component mounts. It immediately fires a fetch to Supabase to get all rows from the rooms table.' },
      { id: 'v3', layer: 'database', label: 'Supabase returns all rooms',            detail: 'The rooms table is queried. Every row has a grid_x, grid_y, name, owner, and registry_id. This data drives the entire grid layout.' },
      { id: 'v4', layer: 'app',      label: 'Grid renders dynamically',              detail: 'page.tsx calculates the min/max x and y from the rooms, pads by 1, and renders a CSS grid. Occupied cells become room tiles; adjacent empty cells become "+ Add Room" buttons.' },
      { id: 'v5', layer: 'database', label: 'Realtime channel opens',                detail: 'A websocket called "floor-sync" stays open for the duration of the visit. Any INSERT or UPDATE to the rooms table is pushed to all connected visitors instantly — no polling.' },
    ],
  },
  {
    id: 'reserve',
    label: 'User reserves a room',
    emoji: '📋',
    steps: [
      { id: 'r1', layer: 'user',     label: 'User clicks "+ Add Room"',             detail: 'Only cells adjacent to an existing room show the "+ Add Room" button. This keeps the building connected — no floating isolated rooms.' },
      { id: 'r2', layer: 'app',      label: 'ReservationModal.tsx opens',            detail: 'The modal collects room name, GitHub username, and email. It also generates a friendly room ID (e.g. "warm-harbor") client-side.' },
      { id: 'r3', layer: 'database', label: 'Row inserted into rooms table',         detail: 'On submit, a new row lands in Supabase with the chosen grid_x/grid_y, owner info, status: "reserved", and the generated registry_id.' },
      { id: 'r4', layer: 'database', label: 'Realtime broadcasts INSERT',            detail: 'The floor-sync channel fires an INSERT event to all connected clients.' },
      { id: 'r5', layer: 'app',      label: 'All visitors see the new tile',         detail: 'Every open floor plan updates instantly — the new room tile appears and the grid expands if it was at the edge. No refresh needed.' },
    ],
  },
  {
    id: 'enter',
    label: 'User enters a room',
    emoji: '🚪',
    steps: [
      { id: 'e1', layer: 'user',     label: 'User clicks a room tile',              detail: 'The tile\'s registry_id (e.g. "soft-grove") is passed to RoomView as a prop. If no registry_id exists, an "under construction" screen shows instead.' },
      { id: 'e2', layer: 'app',      label: 'RoomView.tsx mounts',                  detail: 'RoomView immediately fetches /registry/<registry_id>/config.json. This is a plain HTTP fetch — no Supabase involved.' },
      { id: 'e3', layer: 'static',   label: 'config.json served from Vercel CDN',   detail: 'The config file lives in public/registry/ and is served as a static asset from Vercel\'s CDN. It defines the background image path and the array of hotspots.' },
      { id: 'e4', layer: 'app',      label: 'Background image renders full-bleed',  detail: 'The background_image path from config.json is loaded as a full-width <img>. Hotspot <button> elements are positioned on top using percentage-based left/top/width/height so they scale to any screen size.' },
      { id: 'e5', layer: 'app',      label: 'Hotspots become interactive',          detail: 'Each hotspot has an action: open_modal, open_url, open_image, or navigate_floor. Clicking one triggers the corresponding behavior — opening a modal, navigating out, or loading an image overlay.' },
    ],
  },
  {
    id: 'pr',
    label: 'Builder opens a PR',
    emoji: '🔀',
    steps: [
      { id: 'p1', layer: 'user',     label: 'Builder pushes branch to their fork',  detail: 'The builder has copied _template/, added a background image, edited config.json, and pushed to a feature branch on their GitHub fork.' },
      { id: 'p2', layer: 'hosting',  label: 'Vercel detects the PR',                detail: 'Vercel is connected to the repo and watches for new pull requests. It automatically triggers a build of the PR branch.' },
      { id: 'p3', layer: 'static',   label: 'Registry folder baked into build',     detail: 'During the Vercel build, Next.js copies everything in public/ — including the new registry/<room-id>/ folder — into the deployment. Static files are served directly from the CDN, no runtime needed.' },
      { id: 'p4', layer: 'hosting',  label: 'Preview URL is ready',                 detail: 'Vercel posts a preview URL to the PR (e.g. open-room-git-warm-harbor.vercel.app). You visit it, navigate to the floor plan, click the room tile, and see the actual room.' },
    ],
  },
  {
    id: 'merge',
    label: 'PR is merged',
    emoji: '🚀',
    steps: [
      { id: 'm1', layer: 'hosting',  label: 'Vercel rebuilds production',           detail: 'Merging to main triggers a new production deployment. This typically takes under a minute.' },
      { id: 'm2', layer: 'static',   label: 'Registry folder goes live on CDN',     detail: 'The new registry/<room-id>/ folder is now a static asset in production, served globally from Vercel\'s CDN edge nodes.' },
      { id: 'm3', layer: 'app',      label: 'Room tile was already on the floor plan', detail: 'The Supabase row with this registry_id has been there since reservation. The tile showed "under construction" before — now that config.json exists, RoomView loads the real room.' },
      { id: 'm4', layer: 'database', label: '(Manual) Update status to active',     detail: 'Currently you update the row\'s status field to "active" manually in the Supabase dashboard. A future GitHub Action would handle this automatically on merge.' },
    ],
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function DiagramModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'journey' | 'architecture' | 'git'>('journey');

  // Journey state
  const [active, setActive] = useState<NodeId | null>(null);
  const activeNode = NODES.find(n => n.id === active);

  // Git flow state
  const [activeGitStep, setActiveGitStep] = useState<GitStepId | null>(null);
  const activeGitStepNode = GIT_STEPS.find(s => s.id === activeGitStep);

  // Architecture state
  const [activeTrigger, setActiveTrigger] = useState<string>(TRIGGERS[0].id);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const trigger = TRIGGERS.find(t => t.id === activeTrigger)!;
  const activeStepNode = trigger.steps.find(s => s.id === activeStep);

  const selectTrigger = (id: string) => {
    setActiveTrigger(id);
    setActiveStep(null);
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-4xl w-full mx-auto my-6 overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 pb-0">
          <div className="flex items-start justify-between mb-2">
            <h2 className="text-slate-900 text-2xl font-black tracking-tight">How Open Room Works</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-900 text-sm font-bold transition-colors ml-4 mt-1">✕ Close</button>
          </div>
          <p className="text-slate-500 text-sm mb-5">Click any step to learn more.</p>

          {/* Tab switcher */}
          <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => { setTab('journey'); setActive(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'journey' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Builder Journey
            </button>
            <button
              onClick={() => { setTab('architecture'); setActiveStep(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'architecture' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              What Happens When…
            </button>
            <button
              onClick={() => { setTab('git' as typeof tab); setActiveGitStep(null); }}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                tab === 'git' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Git Flow
            </button>
          </div>
        </div>

        {/* ── BUILDER JOURNEY ── */}
        {tab === 'journey' && (
          <>
            <div className="flex gap-4 px-8 mb-4">
              {(['builder', 'admin', 'system'] as const).map(type => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${TYPE_DOT[type]}`} />
                  <span className="text-xs font-bold text-slate-500 capitalize">
                    {type === 'builder' ? 'Builder' : type === 'admin' ? 'Admin' : 'System'}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-0">
              <div className="flex-1 p-8 pt-0">
                <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">The Journey</p>
                <div className="space-y-1.5">
                  {BUILDER_FLOW.map((id, i) => {
                    const node = NODES.find(n => n.id === id)!;
                    const isActive = active === id;
                    const triggersSystem = Object.entries(SYSTEM_TRIGGERS).some(([k]) => k === id);
                    return (
                      <div key={id} className="flex items-start gap-3">
                        <div className="flex flex-col items-center pt-1">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 flex-shrink-0 ${
                            isActive ? 'bg-slate-900 border-slate-900 text-white' : `${TYPE_STYLES[node.type]} border-current`
                          }`}>
                            {i + 1}
                          </div>
                          {i < BUILDER_FLOW.length - 1 && <div className="w-px h-3 bg-slate-200 mt-1" />}
                        </div>
                        <button
                          onClick={() => setActive(isActive ? null : id)}
                          className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                            isActive ? 'bg-slate-900 border-slate-900 text-white' : `${TYPE_STYLES[node.type]} hover:shadow-sm`
                          }`}
                        >
                          <span>{node.label}</span>
                          {triggersSystem && (
                            <span className={`ml-2 text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-amber-300' : 'text-amber-500'}`}>
                              → system
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="w-full md:w-72 bg-slate-50 p-8 border-t md:border-t-0 md:border-l border-slate-100">
                {activeNode ? (
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-2">
                      {activeNode.type === 'builder' ? 'Builder Step' : activeNode.type === 'admin' ? 'Admin Action' : 'System'}
                    </p>
                    <h3 className="text-slate-900 font-black text-base mb-3 leading-snug">{activeNode.label}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{activeNode.detail}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">System Events</p>
                    <div className="space-y-3">
                      {SYSTEM_FLOW.map(id => {
                        const node = NODES.find(n => n.id === id)!;
                        return (
                          <button
                            key={id}
                            onClick={() => setActive(id)}
                            className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${TYPE_STYLES[node.type]} hover:shadow-sm`}
                          >
                            {node.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-slate-400 text-xs mt-6 leading-relaxed">Click any step on the left to see details here.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── WHAT HAPPENS WHEN… ── */}
        {tab === 'architecture' && (
          <div className="flex flex-col md:flex-row gap-0">
            <div className="flex-1 p-8 pt-0">

              {/* Trigger selector */}
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">Choose an event</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {TRIGGERS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => selectTrigger(t.id)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      activeTrigger === t.id
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {t.emoji} {t.label}
                  </button>
                ))}
              </div>

              {/* Flow chain */}
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">What happens</p>
              <div className="space-y-1">
                {trigger.steps.map((step, i) => {
                  const isActive = activeStep === step.id;
                  const styles = LAYER_STYLE[step.layer];
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-2">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${styles.dot}`} />
                        {i < trigger.steps.length - 1 && <div className="w-px flex-1 min-h-[16px] bg-slate-200 mt-1" />}
                      </div>
                      <button
                        onClick={() => setActiveStep(isActive ? null : step.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all mb-1 ${
                          isActive ? styles.activeCard : `${styles.card} hover:shadow-sm`
                        }`}
                      >
                        <span className={`inline-block text-[9px] font-black uppercase tracking-widest mr-2 px-1.5 py-0.5 rounded ${
                          isActive ? 'bg-white/20 text-white' : styles.badge
                        }`}>
                          {LAYER_LABEL[step.layer]}
                        </span>
                        {step.label}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Layer legend */}
              <div className="flex flex-wrap gap-3 mt-6">
                {(Object.keys(LAYER_LABEL) as Layer[]).map(layer => (
                  <div key={layer} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${LAYER_STYLE[layer].dot}`} />
                    <span className="text-[10px] font-bold text-slate-400">{LAYER_LABEL[layer]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detail panel */}
            <div className="w-full md:w-72 bg-slate-50 p-8 border-t md:border-t-0 md:border-l border-slate-100">
              {activeStepNode ? (
                <div>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded mb-3 ${LAYER_STYLE[activeStepNode.layer].badge}`}>
                    {LAYER_LABEL[activeStepNode.layer]}
                  </span>
                  <h3 className="text-slate-900 font-black text-base mb-3 leading-snug">{activeStepNode.label}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{activeStepNode.detail}</p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-3">How it connects</p>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Each event traces a path through the three layers: the <strong className="text-slate-500">App</strong> (Next.js components), the <strong className="text-slate-500">Database</strong> (Supabase), and <strong className="text-slate-500">Hosting</strong> (Vercel + static files).
                  </p>
                  <p className="text-slate-400 text-xs leading-relaxed mt-4">
                    Click any step in the chain to see what's happening under the hood.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── GIT FLOW ── */}
        {tab === 'git' && (
          <div className="flex flex-col md:flex-row gap-0">
            {/* Left: steps list */}
            <div className="flex-1 p-8 pt-0">
              <p className="text-[10px] uppercase font-black tracking-widest text-slate-400 mb-4">The Flow</p>
              <div className="space-y-1.5">
                {GIT_STEPS.map((step, i) => {
                  const isActive = activeGitStep === step.id;
                  return (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 flex-shrink-0 ${
                          isActive ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                          {i + 1}
                        </div>
                        {i < GIT_STEPS.length - 1 && <div className="w-px h-3 bg-slate-200 mt-1" />}
                      </div>
                      <button
                        onClick={() => setActiveGitStep(isActive ? null : step.id)}
                        className={`flex-1 text-left px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:shadow-sm'
                        }`}
                      >
                        {step.label}
                        {step.id === 'sync' && (
                          <span className={`ml-2 text-[9px] font-black uppercase tracking-widest ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                            optional
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: spatial diagram + detail */}
            <div className="w-full md:w-72 bg-slate-50 p-8 border-t md:border-t-0 md:border-l border-slate-100 flex flex-col gap-4">
              {/* Spatial diagram */}
              <div className="space-y-0">
                {(['upstream', 'fork', 'local'] as GitZone[]).map((zone, zi) => {
                  const z = ZONE_LABELS[zone];
                  const isFrom = activeGitStepNode?.from === zone;
                  const isTo = activeGitStepNode?.to === zone;
                  const isActive = isFrom || isTo;
                  const showConnector = zi < 2;
                  const nextZone = zi === 0 ? 'fork' : 'local';
                  const upOps = GIT_STEPS.filter(s => s.from === nextZone && s.to === zone);
                  const downOps = GIT_STEPS.filter(s => s.from === zone && s.to === nextZone);

                  return (
                    <div key={zone}>
                      <div className={`rounded-xl border px-3 py-2.5 transition-all ${
                        isActive ? `${z.bg} ${z.border} ring-2 ring-offset-1 ring-current ${z.color}` : `bg-white border-slate-200 text-slate-500`
                      }`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${isActive ? z.color : 'text-slate-400'}`}>
                          {z.title}
                        </p>
                        <p className={`text-[10px] font-mono mt-0.5 ${isActive ? z.color : 'text-slate-300'}`}>
                          {z.sub}
                        </p>
                      </div>
                      {showConnector && (
                        <div className="flex justify-between items-center px-4 py-1 text-[10px] font-black">
                          <div className="flex flex-col gap-0.5">
                            {downOps.map(op => (
                              <span key={op.id} className={`${activeGitStep === op.id ? 'text-slate-900' : 'text-slate-300'}`}>
                                ↓ {op.label}
                              </span>
                            ))}
                          </div>
                          <div className="flex flex-col gap-0.5 items-end">
                            {upOps.map(op => (
                              <span key={op.id} className={`${activeGitStep === op.id ? 'text-slate-900' : 'text-slate-300'}`}>
                                {op.label} ↑
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Detail text */}
              {activeGitStepNode ? (
                <div className="border-t border-slate-200 pt-4">
                  <p className="text-slate-900 font-black text-sm mb-2">{activeGitStepNode.label}</p>
                  <p className="text-slate-600 text-xs leading-relaxed">{activeGitStepNode.detail}</p>
                </div>
              ) : (
                <p className="text-slate-400 text-xs leading-relaxed border-t border-slate-200 pt-4">
                  Click any step to see what it does and where your files go.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
