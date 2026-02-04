'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const auth = getAuth(app);
            await signInWithEmailAndPassword(auth, email, password);
            router.push('/dashboard');
        } catch (err) {
            console.error('Login error:', err);
            setError('Invalid email or password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--bg-void)',
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 255, 0.03) 0%, transparent 50%)',
            padding: '1rem'
        }}>
            <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        backgroundColor: 'var(--bg-card)',
                        border: '2px solid var(--accent-neon)',
                        borderRadius: '12px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        boxShadow: '0 0 20px var(--accent-neon-glow)'
                    }}>
                        <svg style={{ width: '28px', height: '28px', color: 'var(--accent-neon)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h1 className="text-mono" style={{
                        fontSize: '1.25rem',
                        fontWeight: '400',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem'
                    }}>
                        Access Terminal
                    </h1>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        Authorized Personnel Only
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        color: '#ef4444',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="form-input"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-input"
                            placeholder="Enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-terminal"
                        style={{ width: '100%', marginTop: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                AUTHENTICATING...
                            </>
                        ) : (
                            '→ LOGIN'
                        )}
                    </button>
                </form>

                {/* Links */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        Need access?{' '}
                        <a href="/auth/signup" className="text-mono" style={{ color: 'var(--accent-neon)', fontWeight: '400', textDecoration: 'none' }}>
                            Request Account
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <p className="text-dim text-mono" style={{ fontSize: '0.75rem' }}>
                        Powered By TakiLabs
                    </p>
                </div>
            </div>
        </div>
    );
}
