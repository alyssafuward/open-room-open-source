import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const SYSTEM_ROOMS = new Set(['_template', 'room-001']);

export async function GET() {
  const registryDir = path.join(process.cwd(), 'public/registry');
  const folders = fs.readdirSync(registryDir).filter(f => {
    if (SYSTEM_ROOMS.has(f)) return false;
    return fs.existsSync(path.join(registryDir, f, 'config.json'));
  });

  const rooms = folders.map(id => {
    const config = JSON.parse(fs.readFileSync(path.join(registryDir, id, 'config.json'), 'utf8'));
    return { id, name: config.room_display_name || id, owner: config.owner || '' };
  });

  return NextResponse.json(rooms);
}
