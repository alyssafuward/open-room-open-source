"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
// This tells the app: "Go look in the .env.local file for the actual URL"
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default function CommunityRoom() {
  const [objects, setObjects] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState('📦');

  // 1. Initial Load & Realtime Subscription
  useEffect(() => {

    // --- YOUR TEST LOG ---
    // This will print whatever you wrote in .env.local to the browser console
    console.log("Secret Message:", process.env.NEXT_PUBLIC_DEBUG_MESSAGE);

    // Fetch existing objects from the DB
    const fetchObjects = async () => {
      const { data } = await supabase.from('room_objects').select('*');
      setObjects(data || []);
    };

    fetchObjects();

    // Listen for real-time changes (Inserts, Updates, Deletes)
    const channel = supabase.channel('room-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'room_objects' }, 
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setObjects((prev) => [...prev, payload.new]);
          } else if (payload.eventType === 'UPDATE') {
            setObjects((prev) => prev.map(obj => obj.id === payload.new.id ? payload.new : obj));
          } else if (payload.eventType === 'DELETE') {
            setObjects((prev) => prev.filter(obj => obj.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 2. Add a new object where you click
  const addObject = async (e: React.MouseEvent) => {
    // Prevent adding if clicking on an existing object
    if ((e.target as HTMLElement).id !== 'room-floor') return;

    const newItem = { 
      type: selectedType, 
      x: e.clientX - 20, 
      y: e.clientY - 20 
    };

    const { error } = await supabase.from('room_objects').insert([newItem]);
    if (error) console.error('Error adding object:', error);
  };

  return (
    <main 
      id="room-floor"
      className="h-screen w-screen bg-slate-50 overflow-hidden relative cursor-crosshair" 
      style={{ 
        backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', 
        backgroundSize: '30px 30px' 
      }}
      onClick={addObject}
    >
      {/* UI Overlay */}
        <div className="absolute top-6 left-6 text-slate-900 pointer-events-none z-10">
        <h1 className="text-3xl font-black tracking-tighter">OPENROOM</h1>
        <p className="opacity-60">Community Plaza • {objects.length} items placed</p>
        
        <div className="mt-4 flex gap-2 pointer-events-auto">
          {['📦', '🌲', '🛋️', '🐈', '✨', '🏮'].map((item) => (
            <button
              key={item}
              onClick={() => setSelectedType(item)}
              className={`w-12 h-12 flex items-center justify-center rounded-lg border-2 transition-all ${
                selectedType === item ? 'bg-white border-blue-500 shadow-lg scale-110' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="text-2xl">{item}</span>
            </button>
          ))}
        </div>
      </div>

      {/* The Objects */}
      {objects.map((obj) => (
        <div 
          key={obj.id}
          className="absolute text-4xl select-none transition-all duration-300 pointer-events-none"
          style={{ left: obj.x, top: obj.y }}
        >
          {obj.type}
        </div>
      ))}

      {/* Empty State Instruction */}
      {objects.length === 0 && (
          <div className="h-full w-full flex items-center justify-center text-slate-300 pointer-events-none">
          Click anywhere to start decorating the plaza...
        </div>
      )}
    </main>
  );
}