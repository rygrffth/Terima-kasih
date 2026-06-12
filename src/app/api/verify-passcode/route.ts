import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { role, passcode } = await request.json();

    const expectedPasscode = 
      role === 'tester'
        ? process.env.PASSCODE_TESTER || 'TESTER123'
        : role === 'direktur'
          ? process.env.PASSCODE_DIREKTUR || process.env.NEXT_PUBLIC_PASSCODE_DIREKTUR || 'DIREKTUR123'
          : role === 'manager_mutu'
            ? process.env.PASSCODE_SPV || 'SPV123'
            : role === 'supervisor'
              ? process.env.PASSCODE_SUPERVISOR || 'SPV123'
              : role === 'admin'
                ? process.env.PASSCODE_ADMIN || 'ADMIN123'
                : 'BLOCKED_ROLE';

    if (passcode === expectedPasscode) {
      return NextResponse.json({ valid: true });
    } else {
      return NextResponse.json({ valid: false });
    }
  } catch (error) {
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
