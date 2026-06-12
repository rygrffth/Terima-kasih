import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabase } from './lib/supabase';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const isAdminPath = pathname.startsWith('/admin/');
  const isSupervisorPath = pathname.startsWith('/supervisor/');

  if (!isAdminPath && !isSupervisorPath) {
    return NextResponse.next();
  }

  const sessionId = request.cookies.get('lhu_session_id')?.value;

  if (!sessionId) {
    // If not logged in, redirect to login page
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase
      .from('lhu_sessions')
      .select('username, login_method, is_active')
      .eq('id', sessionId)
      .eq('is_active', true)
      .single();

    if (sessionError || !sessionData) {
      // If session is not valid or active, redirect to login page
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    let userRole = '';
    let userAllowed: string[] = [];

    if (sessionData.login_method === 'tester') {
      userRole = 'tester';
      userAllowed = ['ALL'];
    } else {
      const { data: userData, error: userError } = await supabase
        .from('lhu_users')
        .select('role, komoditi, allowed_komoditi')
        .eq('username', sessionData.username)
        .single();

      if (userError || !userData) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
      }

      userRole = userData.role;
      userAllowed = userData.allowed_komoditi || [];
      if (userAllowed.length === 0 && userData.komoditi) {
        userAllowed = [userData.komoditi];
      }
    }

    // Bypass validation for tester role
    if (userRole === 'tester') {
      return NextResponse.next();
    }

    // Parse division route parameter (e.g. /admin/Elektronik/pending -> Elektronik)
    const segments = pathname.split('/');
    const userRoleInPath = segments[1]; // admin or supervisor
    const routeDivisi = segments[2] ? decodeURIComponent(segments[2]) : null;

    if (userRoleInPath === 'admin' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    if (userRoleInPath === 'supervisor' && userRole !== 'supervisor') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Skip if routeDivisi is a static page instead of dynamic parameter
    const staticAdminPages = ['upload', 'list', 'numbering', 'pending', 'history'];
    const staticSupervisorPages = ['pending', 'history'];

    if (routeDivisi) {
      const isStaticPage = userRoleInPath === 'admin'
        ? staticAdminPages.includes(routeDivisi)
        : staticSupervisorPages.includes(routeDivisi);

      if (!isStaticPage) {
        if (!userAllowed.includes('ALL') && !userAllowed.includes(routeDivisi)) {
          const homeUrl = new URL('/', request.url);
          return NextResponse.redirect(homeUrl);
        }
      }
    }

  } catch (error) {
    console.error('Proxy session parsing failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/supervisor/:path*',
  ],
};
