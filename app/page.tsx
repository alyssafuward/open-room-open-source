"use client";
import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import RoomView from './components/RoomView';
import ReservationModal from './components/ReservationModal';
import FloorPlanCanvas from './components/FloorPlanCanvas';
import LocalPreview from './components/LocalPreview';

const COMMON_ROOM_SLUG = 'common';

function roomSlug(room: any): string | null {
  if (room.grid_x === 0 && room.grid_y === 0) return COMMON_ROOM_SLUG;
  return room.registry_id ?? null;
}

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  : null;

function OpenRoomInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeSlug = searchParams.get('room');

  const [rooms, setRooms] = useState<any[]>([]);
  const [myId, setMyId] = useState<string>('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [reserving, setReserving] = useState<{ x: number; y: number } | null>(null);
  const [successRoom, setSuccessRoom] = useState<{ room: any; roomId: string } | null>(null);

  const refreshRooms = useCallback(async () => {
    const { data } = await supabase!.from('rooms').select('*').neq('status', 'deleted');
    let roomList = data || [];
    
    // Check for the center piece: The Common Room
    const commonRoom = roomList.find(r => r.grid_x === 0 && r.grid_y === 0);
    if (!commonRoom) {
      const { data: newHome } = await supabase!.from('rooms').insert([{
        name: 'Common Room',
        owner_name: 'Building Admin',
        owner_id: 'public',
        grid_x: 0,
        grid_y: 0
      }]).select().single();
      if (newHome) roomList.push(newHome);
    }
    setRooms(roomList);
  }, []);

  useEffect(() => {
    const id = localStorage.getItem('openroom_owner_id') || Math.random().toString(36).substring(7);
    localStorage.setItem('openroom_owner_id', id);
    setMyId(id);

    refreshRooms();

    const channel = supabase!.channel('floor-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'INSERT') {
          setRooms(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase!.removeChannel(channel); };
  }, [refreshRooms]);

  const openRoom = (room: any) => {
    const slug = roomSlug(room);
    if (!slug) return;
    router.push(`/?room=${encodeURIComponent(slug)}`);
  };

  const handleBack = () => {
    router.push('/');
    refreshRooms();
  };

  const activeRoom = activeSlug
    ? (activeSlug === COMMON_ROOM_SLUG
        ? rooms.find(r => r.grid_x === 0 && r.grid_y === 0)
        : rooms.find(r => r.registry_id === activeSlug))
    : null;

  if (activeRoom) {
    const isWelcomeRoom = activeRoom.grid_x === 0 && activeRoom.grid_y === 0;
    if (isWelcomeRoom) {
      return <RoomView onBack={handleBack} registryId="room-001" room={activeRoom} />;
    }
    if (activeRoom.registry_id) {
      return <RoomView onBack={handleBack} registryId={activeRoom.registry_id} room={activeRoom} />;
    }
    // Reserved but not yet built
    return (
      <div className="min-h-screen w-screen bg-stone-100 flex flex-col items-center justify-center p-6">
        <button onClick={handleBack} className="text-slate-400 text-sm font-bold hover:text-slate-900 transition-colors mb-8">← Floor Plan</button>
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-200 text-center">
          <p className="text-2xl mb-3">🚧</p>
          <h2 className="text-slate-900 text-xl font-black tracking-tight mb-1">{activeRoom.name}</h2>
          <p className="text-slate-400 text-sm mb-6">This room is under construction.</p>
          <div className="space-y-2 text-left">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">GitHub</span>
              <span className="text-sm font-mono text-slate-700">@{activeRoom.github_username}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <span className="text-xs font-black uppercase tracking-widest text-indigo-400">Room ID</span>
              <code className="text-sm font-mono font-bold text-indigo-700">{activeRoom.registry_id}</code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- DYNAMIC FLOORPLAN LOGIC ---
  const xValues = rooms.length > 0 ? rooms.map(r => r.grid_x) : [0];
  const yValues = rooms.length > 0 ? rooms.map(r => r.grid_y) : [0];
  const minX = Math.min(...xValues) - 1;
  const maxX = Math.max(...xValues) + 1;
  const minY = Math.min(...yValues) - 1;
  const maxY = Math.max(...yValues) + 1;

  const xRange = Array.from({ length: maxX - minX + 1 }, (_, i) => minX + i);
  const yRange = Array.from({ length: maxY - minY + 1 }, (_, i) => minY + i);
  const occupied = new Set(rooms.map(r => `${r.grid_x},${r.grid_y}`));

  const handleReservationSuccess = (room: any, roomId: string) => {
    setRooms(prev => [...prev, room]);
    setReserving(null);
    setSuccessRoom({ room, roomId });
  };

  return (
    <main className="w-screen bg-stone-100 flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <div className="pt-6 pb-4 text-center shrink-0">
        <h1 className="text-slate-900 text-3xl font-black tracking-tighter uppercase">Open Room</h1>
        <div className="flex items-center justify-center gap-2">
          <p className="text-slate-400 text-sm font-medium">Infinite Floor Plan</p>
          <button
            onClick={() => setIsHelpOpen(true)}
            className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-300 text-slate-400 hover:text-slate-900 hover:border-slate-900 transition-all text-[10px] font-bold"
          >
            ?
          </button>
        </div>
      </div>

      <FloorPlanCanvas>
      <div
        className="grid gap-4 p-8"
        style={{ gridTemplateColumns: `repeat(${xRange.length}, 7rem)` }}
      >
        {yRange.map(y => xRange.map(x => {
          const room = rooms.find(r => r.grid_x === x && r.grid_y === y);
          if (room) {
            const isCommon = x === 0 && y === 0;
            return (
              <button
                key={`${x}-${y}`}
                onClick={() => openRoom(room)}
                className={`w-28 h-28 rounded-2xl shadow-md flex flex-col items-center justify-center transition-all hover:scale-105 border-2 ${
                  isCommon ? 'bg-white border-amber-400 text-slate-900' :
                  room.owner_id === myId ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-sky-100 border-sky-300 text-slate-700'
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{room.owner_name}</span>
                <span className="font-black text-center px-1 leading-tight text-sm">{room.name}</span>
              </button>
            );
          }

          const isAdjacent = Array.from(occupied).some(coord => {
            const [ox, oy] = coord.split(',').map(Number);
            return Math.abs(ox - x) + Math.abs(oy - y) === 1;
          });

          if (!isAdjacent) return <div key={`${x}-${y}`} className="w-28 h-28" />;

          const availableCells = yRange.flatMap(cy => xRange.filter(cx => {
            if (occupied.has(`${cx},${cy}`)) return false;
            return Array.from(occupied).some(coord => {
              const [ox, oy] = coord.split(',').map(Number);
              return Math.max(Math.abs(ox - cx), Math.abs(oy - cy)) === 1;
            });
          }).map(cx => `${cx},${cy}`));
          const cellNum = availableCells.indexOf(`${x},${y}`) + 1;

          return (
            <button key={`${x}-${y}`} onClick={() => setReserving({ x, y })} className="w-28 h-28 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 transition-all gap-1">
              <span className="font-bold text-[10px]">+ ADD ROOM</span>
              <span className="font-black text-sm leading-none opacity-60">{cellNum}</span>
            </button>
          );
        }))}
      </div>
      </FloorPlanCanvas>

      {/* OPEN ROOM GUIDE MODAL */}
      {isHelpOpen && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={() => setIsHelpOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-slate-900 text-2xl font-black italic mb-2 tracking-tight">Open Room Guide</h2>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              This is a social experiment in <strong>collective vibe coding</strong>. We're building an infinite structure together, one room at a time.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-600"><strong>Play:</strong> Enter any room to see who lives there.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-600"><strong>Build:</strong> Add rooms to the grid to expand the building footprint.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-600"><strong>Vibe:</strong> This project belongs to the builders. Fork the repo and use your AI to help us grow.</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
              <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Contribute on GitHub</p>
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
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Open Room
            </button>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {reserving && (
        <ReservationModal
          x={reserving.x}
          y={reserving.y}
          onClose={() => setReserving(null)}
          onSuccess={handleReservationSuccess}
        />
      )}

      {/* Success Modal */}
      {successRoom && (
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 overflow-y-auto p-6"
          onClick={() => setSuccessRoom(null)}
        >
          <div
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl mx-auto my-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Congratulations!</h2>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              You've reserved your room. Here's your registry id — your AI will need it.
            </p>

            <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 mb-6 text-center">
              <p className="text-[10px] uppercase font-black text-indigo-400 tracking-widest mb-2">Your Registry ID</p>
              <p className="text-2xl font-black text-indigo-700 font-mono tracking-tight mb-3">{successRoom.roomId}</p>
              <button
                onClick={() => navigator.clipboard.writeText(successRoom.roomId)}
                className="text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-4 transition-colors"
              >
                Copy to clipboard
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 space-y-3">
              <p className="font-black text-slate-900 text-xs uppercase tracking-widest">Now, open this with your AI:</p>
              <a
                href="https://github.com/alyssafuward/open-room-open-source"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs font-mono text-indigo-500 hover:text-indigo-700 underline underline-offset-4 break-all"
              >
                github.com/alyssafuward/open-room-open-source
              </a>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tell it: <span className="font-semibold text-slate-800">"I just reserved a room. Help me create it."</span> It'll walk you through everything — forking the repo, setting up your files, and opening a pull request.
              </p>
            </div>

            <button
              onClick={() => setSuccessRoom(null)}
              className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors"
            >
              Back to Floor Plan
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function OpenRoom() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return <LocalPreview />;
  }
  return (
    <Suspense fallback={null}>
      <OpenRoomInner />
    </Suspense>
  );
}
