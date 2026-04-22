import { execSync } from 'child_process';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
    const match = branch.match(/^room\/\d+-(.+)$/);
    return NextResponse.json({ roomId: match ? match[1] : null });
  } catch {
    return NextResponse.json({ roomId: null });
  }
}
