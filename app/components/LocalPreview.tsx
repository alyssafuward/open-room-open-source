"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LocalRoom {
  id: string;
  name: string;
  owner: string;
}

export default function LocalPreview() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LocalRoom[]>([]);

  useEffect(() => {
    fetch('/api/local-rooms')
      .then(r => r.json())
      .then((data: LocalRoom[]) => {
        if (data.length === 1) {
          router.replace(`/preview/${data[0].id}`);
        } else {
          setRooms(data);
        }
      });
  }, [router]);

  if (!rooms.length) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-200">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Local Preview</p>
        <h1 className="text-slate-900 text-2xl font-black tracking-tight mb-6">Pick a room</h1>
        <div className="space-y-2">
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => router.push(`/preview/${room.id}`)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors text-left group"
            >
              <div>
                <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">{room.name}</p>
                <p className="text-xs text-slate-400">@{room.owner}</p>
              </div>
              <code className="text-xs font-mono text-indigo-500">{room.id}</code>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
