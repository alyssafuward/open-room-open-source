"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LocalRoom {
  id: string;
  name: string;
  owner: string;
}

const PINNED_ROOMS = [
  { id: 'room-001', label: 'Common Room', sub: 'diagram, welcome guide, registry' },
];

export default function LocalPreview() {
  const router = useRouter();
  const [rooms, setRooms] = useState<LocalRoom[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/local-rooms').then(r => r.json()),
      fetch('/api/dev/current-branch').then(r => r.json()),
    ]).then(([roomData, branchData]: [LocalRoom[], { roomId: string | null }]) => {
      setCurrentRoomId(branchData.roomId);
      if (roomData.length === 1) {
        router.replace(`/preview/${roomData[0].id}`);
      } else {
        setRooms(roomData);
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

  const currentRoom = rooms.find(r => r.id === currentRoomId);
  const otherRooms = rooms.filter(r => r.id !== currentRoomId);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-8">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-sm border border-slate-200">
        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Local Preview</p>
        <h1 className="text-slate-900 text-2xl font-black tracking-tight mb-6">Pick a room</h1>

        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pinned</p>
          <div className="space-y-2">
            {PINNED_ROOMS.map(r => (
              <button
                key={r.id}
                onClick={() => router.push(`/preview/${r.id}`)}
                className="w-full flex items-center justify-between p-4 rounded-2xl border bg-amber-50 border-amber-200 hover:bg-amber-100 transition-colors text-left group"
              >
                <div>
                  <p className="text-sm font-bold text-amber-900 group-hover:text-amber-700">{r.label}</p>
                  <p className="text-xs text-amber-500">{r.sub}</p>
                </div>
                <code className="text-xs font-mono text-amber-500">{r.id}</code>
              </button>
            ))}
          </div>
        </div>

        {currentRoom && (
          <>
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Current branch</p>
            <RoomButton room={currentRoom} onPick={id => router.push(`/preview/${id}`)} highlight />
            {otherRooms.length > 0 && <div className="my-5 border-t border-slate-100" />}
          </>
        )}

        {otherRooms.length > 0 && (
          <div className="space-y-2">
            {otherRooms.map(room => (
              <RoomButton key={room.id} room={room} onPick={id => router.push(`/preview/${id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RoomButton({ room, onPick, highlight }: { room: LocalRoom; onPick: (id: string) => void; highlight?: boolean }) {
  return (
    <button
      onClick={() => onPick(room.id)}
      className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-colors text-left group ${
        highlight
          ? 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100'
          : 'bg-slate-50 hover:bg-indigo-50 border-slate-100 hover:border-indigo-200'
      }`}
    >
      <div>
        <p className={`text-sm font-bold group-hover:text-indigo-700 ${highlight ? 'text-indigo-700' : 'text-slate-900'}`}>{room.name}</p>
        <p className="text-xs text-slate-400">@{room.owner}</p>
      </div>
      <code className="text-xs font-mono text-indigo-500">{room.id}</code>
    </button>
  );
}
