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
                        borderRadius: '0',
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
                    <h1 style={{ marginBottom: '0.5rem' }}>Access Terminal</h1>
                    <p className="text-secondary">
                        Authorized Personnel Only
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        padding: '0.75rem',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '0',
                        marginBottom: '1.5rem',
                        fontSize: '0.875rem',
                        color: '#ef4444',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                {/* Login Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="email" className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="form-input auth-input"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label htmlFor="password" className="form-label" style={{ marginBottom: '0.75rem', display: 'block' }}>Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="form-input auth-input"
                            placeholder="Enter password"
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-auth"
                            style={{
                                width: 'auto',
                                minWidth: '180px',
                                padding: '0.75rem 2rem',
                                fontSize: '0.9rem',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                letterSpacing: '0.1em'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }}></span>
                                    WAIT
                                </>
                            ) : (
                                'LOGIN'
                            )}
                        </button>
                    </div>
                </form>

                {/* Links */}
                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        Need access?{' '}
                        <a href="/auth/signup" className="text-link">
                            Request Account
                        </a>
                    </p>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <p className="text-dim text-mono" style={{ fontSize: '0.75rem' }}>
                        Powered By TakiLabs
                    </p>
                </div>
            </div>

            <style jsx>{`
                .auth-input {
                    background-color: #050505 !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    color: #ffffff !important;
                }
                .auth-input:focus {
                    border-color: var(--accent-neon) !important;
                    box-shadow: 0 0 10px rgba(0, 255, 255, 0.1) !important;
                }
                .btn-auth {
                    background-color: transparent;
                    border: 1px solid var(--accent-neon);
                    color: var(--accent-neon);
                    font-family: var(--font-mono);
                    cursor: pointer;
                    transition: all 0.3s ease;
                    border-radius: 0;
                    text-transform: uppercase;
                }
                .btn-auth:hover {
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
                    background-color: rgba(0, 255, 255, 0.05);
                }
                .btn-auth:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .text-link {
                    color: var(--accent-neon);
                    text-decoration: none;
                    transition: text-shadow 0.3s ease;
                }
                .text-link:hover {
                    text-shadow: 0 0 8px var(--accent-neon-glow);
                }
            `}</style>
        </div>
    );
}
