"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const ADJECTIVES = [
  'amber', 'breezy', 'bright', 'calm', 'crisp', 'dappled', 'gentle', 'golden',
  'green', 'hazy', 'hushed', 'lush', 'misty', 'mossy', 'open', 'quiet',
  'rosy', 'silver', 'soft', 'still', 'sunny', 'warm', 'willow', 'woven',
];

const NOUNS = [
  'alcove', 'atrium', 'bay', 'canyon', 'corner', 'den', 'glade', 'grove',
  'harbor', 'hearth', 'hollow', 'inlet', 'landing', 'loft', 'meadow', 'nook',
  'porch', 'ridge', 'shore', 'study', 'terrace', 'vale', 'vista', 'window',
];

function generateRoomId() {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}

export default function ReservationModal({ x, y, lockId, onClose, onSuccess }: {
  x: number;
  y: number;
  lockId: string;
  onClose: () => void;
  onSuccess: (room: any, roomId: string) => void;
}) {
  const [form, setForm] = useState({ name: '', github: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = async () => {
    await supabase!.from('rooms').delete().eq('id', lockId);
    onClose();
  };

  const set = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.github || !form.email) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);

    // Generate a unique friendly room ID
    let roomId = generateRoomId();
    let attempts = 0;
    while (attempts < 10) {
      const { data: taken } = await supabase!
        .from('rooms')
        .select('id')
        .eq('registry_id', roomId)
        .limit(1);
      if (!taken || taken.length === 0) break;
      roomId = generateRoomId();
      attempts++;
    }

    const { data, error: updateError } = await supabase!
      .from('rooms')
      .update({
        name: roomId,
        owner_name: form.name,
        owner_id: form.github,
        github_username: form.github,
        email: form.email,
        dev_tool: null,
        registry_id: roomId,
        status: 'reserved',
        reserved_at: new Date().toISOString(),
      })
      .eq('id', lockId)
      .select()
      .single();

    setLoading(false);

    if (updateError) {
      setError('Something went wrong. Please try again.');
      return;
    }

    onSuccess(data, roomId);
  };

  return (
    <div
      className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 overflow-y-auto p-6"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl mx-auto my-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-slate-900 text-2xl font-black tracking-tight mb-1">Reserve a Room</h2>
        <p className="text-slate-500 text-sm mb-6 leading-relaxed">
          Claim your spot in the building. You'll get a room ID — save it, you'll need it to set up your room in the repo.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="e.g. Ada Lovelace"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">Shown on your floor tile.</p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              GitHub Username
            </label>
            <input
              type="text"
              value={form.github}
              onChange={e => set('github', e.target.value)}
              placeholder="e.g. octocat"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">You'll need a GitHub account to fork the repo and contribute your room.</p>
          </div>

          <div>
            <label className="text-xs font-black uppercase tracking-widest text-slate-400 block mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <p className="text-[11px] text-slate-400 mt-1">For contact only — never shared.</p>
          </div>

          {error && (
            <p className="text-red-500 text-xs font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'Reserving…' : 'Reserve Room'}
          </button>
        </form>
      </div>
    </div>
  );
}
