'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ToastProvider } from '@/app/context/ToastContext';

export default function DashboardLayout({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    useEffect(() => {
        const auth = getAuth(app);
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setUser(user);
            } else {
                router.push('/auth/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router]);

    const handleLogout = async () => {
        if (confirm('Logout from system?')) {
            const auth = getAuth(app);
            await signOut(auth);
            router.push('/');
        }
    };

    if (loading) return null;
    if (!user) return null;

    const links = [
        { name: 'Overview', href: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { name: 'CREATE NEW', href: '/dashboard/create', icon: 'M12 4v16m8-8H4' },
        { name: 'Campaigns', href: '/dashboard/campaigns', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
        { name: 'Analytics', href: '/dashboard/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { name: 'Audience', href: '/dashboard/audience', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
        { name: 'Domains', href: '/dashboard/domains', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    ];

    return (
        <ToastProvider>
            <div className="dashboard-layout">
                {/* Mobile Header (Hamburger) - Simplified */}
                <div className="mobile-nav-btn" style={{
                    position: 'fixed',
                    top: '1rem',
                    left: '1rem',
                    zIndex: 5000,
                    display: 'none' // Controlled by CSS @media
                }}>
                    <button
                        onClick={toggleSidebar}
                        className="btn btn-ghost"
                        style={{
                            padding: '0.5rem',
                            minWidth: 'auto',
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'var(--bg-card)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-ghost)',
                            cursor: 'pointer'
                        }}
                    >
                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Sidebar Overlay (Mobile Only) */}
                <div
                    className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`}
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 4000,
                        opacity: isSidebarOpen ? 1 : 0,
                        pointerEvents: isSidebarOpen ? 'auto' : 'none',
                        transition: 'opacity 0.3s ease',
                        display: 'none' // Controlled by CSS @media via global style below if needed, but logic handles opacity
                    }}
                />

                {/* Sidebar */}
                <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    {/* Mobile Close Button */}
                    <div className="mobile-close-btn" style={{ display: 'none', position: 'absolute', top: '1rem', right: '1rem', zIndex: 10 }}>
                        <button
                            onClick={toggleSidebar}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-dim)',
                                padding: '0.5rem',
                                cursor: 'pointer'
                            }}
                        >
                            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            backgroundColor: 'var(--bg-card)',
                            border: '2px solid var(--accent-neon)',
                            borderRadius: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 20px var(--accent-neon-glow)'
                        }}>
                            <svg style={{ width: '28px', height: '28px', color: 'var(--accent-neon)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>

                    <nav style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {links.map(link => {
                            const isActive = pathname === link.href;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsSidebarOpen(false)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        borderRadius: '6px',
                                        color: isActive ? 'var(--accent-neon)' : '#9ca3af', // Gray-400 for inactive
                                        backgroundColor: isActive ? 'rgba(0, 255, 255, 0.1)' : 'transparent',
                                        border: isActive ? '1px solid var(--accent-neon)' : '1px solid transparent',
                                        textDecoration: 'none',
                                        fontWeight: isActive ? 600 : 400,
                                        fontSize: '0.875rem',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.color = '#fff';
                                            e.currentTarget.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.3)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isActive) {
                                            e.currentTarget.style.color = '#9ca3af';
                                            e.currentTarget.style.textShadow = 'none';
                                        }
                                    }}
                                >
                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={link.icon} />
                                    </svg>
                                    {link.name}
                                </Link>
                            )
                        })}
                    </nav>

                    <div style={{ padding: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
                            <div className="text-dim text-mono" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {user.email}
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="btn btn-ghost"
                            style={{
                                width: '100%',
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                fontSize: '0.75rem',
                                justifyContent: 'center',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                transition: 'all 0.2s ease',
                                letterSpacing: '0.05em',
                                fontWeight: 'bold'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                        >
                            LOGOUT
                        </button>
                        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                            <p className="text-dim text-mono" style={{ fontSize: '0.65rem', opacity: 0.7 }}>
                                Powered By TakiLabs
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <main className="dashboard-main">
                    {children}

                    {/* Footer (Desktop Only) */}
                    <div className="desktop-footer" style={{
                        marginTop: '3rem',
                        paddingTop: '2rem',
                        borderTop: '1px solid var(--border-subtle)',
                        textAlign: 'center'
                    }}>
                        <p className="text-dim text-mono" style={{ fontSize: '0.75rem' }}>
                            Powered By TakiLabs
                        </p>
                    </div>
                </main>
            </div>
        </ToastProvider>
    );
}
