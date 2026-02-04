'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function SignupPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const auth = getAuth(app);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            console.log('User created successfully:', userCredential.user.uid);

            await sendEmailVerification(userCredential.user);
            console.log('Verification email sent');

            const response = await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    displayName: email.split('@')[0]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('API error:', errorData);
                throw new Error(errorData.error || 'Failed to create user document');
            }

            console.log('User document created successfully');
            setSuccess(true);
            setTimeout(() => router.push('/dashboard'), 1500);
        } catch (err) {
            console.error('Signup error details:', {
                code: err.code,
                message: err.message,
                fullError: err
            });

            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address');
            } else if (err.code === 'auth/operation-not-allowed') {
                setError('Email/Password sign-in is not enabled. Please contact support.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak');
            } else {
                setError(err.message || 'Failed to create account');
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
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
                <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'rgba(0, 255, 255, 0.1)',
                        border: '2px solid var(--accent-neon)',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem',
                        boxShadow: '0 0 20px var(--accent-neon-glow)'
                    }}>
                        <svg style={{ width: '32px', height: '32px', color: 'var(--accent-neon)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-mono" style={{
                        fontSize: '1.25rem',
                        fontWeight: '400',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem'
                    }}>
                        Access Granted
                    </h2>
                    <p className="text-dim">Redirecting to terminal...</p>
                    <div className="spinner" style={{ margin: '1.5rem auto 0' }}></div>
                </div>
            </div>
        );
    }

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
                        Request Access
                    </h1>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        Join the System
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

                {/* Signup Form */}
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
                            placeholder="At least 6 characters"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="form-input"
                            placeholder="Re-enter password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn btn-terminal"
                        style={{ width: '100%', marginTop: '0.5rem' }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner" style={{ marginRight: '0.5rem' }}></span>
                                PROCESSING...
                            </>
                        ) : (
                            '→ CREATE ACCOUNT'
                        )}
                    </button>
                </form>

                {/* Links */}
                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        Already have access?{' '}
                        <a href="/auth/login" className="text-mono" style={{ color: 'var(--accent-neon)', fontWeight: '400', textDecoration: 'none' }}>
                            Login
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
