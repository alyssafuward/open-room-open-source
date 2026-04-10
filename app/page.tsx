"use client";
import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import RoomView from './components/RoomView';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function OpenRoom() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [myId, setMyId] = useState<string>('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const refreshRooms = useCallback(async () => {
    const { data } = await supabase.from('rooms').select('*');
    let roomList = data || [];
    
    // Check for the center piece: The Common Room
    const commonRoom = roomList.find(r => r.grid_x === 0 && r.grid_y === 0);
    if (!commonRoom) {
      const { data: newHome } = await supabase.from('rooms').insert([{
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

    const channel = supabase.channel('floor-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          setRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r));
        } else if (payload.eventType === 'INSERT') {
          setRooms(prev => [...prev, payload.new]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refreshRooms]);

  const handleBack = () => {
    setActiveRoom(null);
    refreshRooms(); 
  };

  if (activeRoom) {
    return <RoomView room={activeRoom} myId={myId} onBack={handleBack} />;
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

  const createRoom = async (x: number, y: number) => {
    const { data } = await supabase.from('rooms').insert([{
      name: `Room ${myId.slice(-4)}`, 
      owner_name: 'Resident', 
      owner_id: myId, 
      grid_x: x, 
      grid_y: y
    }]).select().single();
    
    if (data) {
      setRooms(prev => [...prev, data]);
      setActiveRoom(data); 
    }
  };

  return (
    <main className="min-h-screen w-screen bg-slate-900 flex flex-col items-center justify-center p-20 overflow-auto">
      <div className="mb-8 text-center">
        <h1 className="text-white text-3xl font-black tracking-tighter uppercase">Open Room</h1>
        <div className="flex items-center justify-center gap-2">
          <p className="text-slate-500 text-sm font-medium">Infinite Floor Plan</p>
          <button 
            onClick={() => setIsHelpOpen(true)}
            className="w-5 h-5 flex items-center justify-center rounded-full border border-slate-700 text-slate-500 hover:text-white hover:border-white transition-all text-[10px] font-bold"
          >
            ?
          </button>
        </div>
      </div>

      <div 
        className="grid gap-4" 
        style={{ gridTemplateColumns: `repeat(${xRange.length}, minmax(0, 1fr))` }}
      >
        {yRange.map(y => xRange.map(x => {
          const room = rooms.find(r => r.grid_x === x && r.grid_y === y);
          if (room) {
            const isCommon = x === 0 && y === 0;
            return (
              <button 
                key={`${x}-${y}`}
                onClick={() => setActiveRoom(room)}
                className={`w-28 h-28 rounded-2xl shadow-xl flex flex-col items-center justify-center transition-all hover:scale-105 border-4 ${
                  isCommon ? 'bg-white border-amber-400 text-slate-900' :
                  room.owner_id === myId ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <span className="text-[9px] uppercase tracking-widest opacity-60 font-bold">{room.owner_name}</span>
                <span className="font-black text-center px-1 leading-tight text-sm">{room.name}</span>
              </button>
            );
          }

          const isAdjacent = Array.from(occupied).some(coord => {
            const [ox, oy] = coord.split(',').map(Number);
            return Math.abs(ox - x) <= 1 && Math.abs(oy - y) <= 1;
          });

          return isAdjacent ? (
            <button key={`${x}-${y}`} onClick={() => createRoom(x, y)} className="w-28 h-28 rounded-2xl border-4 border-dashed border-slate-800 hover:border-indigo-500 hover:bg-slate-800/50 flex items-center justify-center text-slate-700 hover:text-indigo-400 transition-all font-bold text-[10px]">
              + ADD ROOM
            </button>
          ) : <div key={`${x}-${y}`} className="w-28 h-28" />;
        }))}
      </div>

      {/* OPEN ROOM GUIDE MODAL */}
      {isHelpOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6"
          onClick={() => setIsHelpOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-white text-2xl font-black italic mb-2 tracking-tight">Open Room Guide</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              This is a social experiment in <strong>collective vibe coding</strong>. We're building an infinite structure together, one room at a time.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-300"><strong>Play:</strong> Enter any room to decorate or see who lives there.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-300"><strong>Build:</strong> Add rooms to the grid to expand the building footprint.</p>
              </div>
              <div className="flex gap-3">
                <span className="text-indigo-500 font-bold">●</span>
                <p className="text-xs text-slate-300"><strong>Vibe:</strong> This project belongs to the builders. Fork the repo and use your AI to help us grow.</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl mb-6 border border-slate-800">
              <p className="text-[10px] uppercase font-black text-slate-500 mb-2 tracking-widest">Contribute on GitHub</p>
              <a 
                href="https://github.com/alyssafuward/open-room" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs font-mono text-indigo-400 hover:text-white break-all underline underline-offset-4"
              >
                github.com/alyssafuward/open-room
              </a>
            </div>

            <button 
              onClick={() => setIsHelpOpen(false)}
              className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-400 transition-colors"
            >
              Back to Open Room
            </button>
          </div>
        </div>
      )}
    </main>
  );
}