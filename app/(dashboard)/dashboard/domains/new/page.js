'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function NewDomainPage() {
    const [domain, setDomain] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [created, setCreated] = useState(false);
    const [domainData, setDomainData] = useState(null);
    const router = useRouter();

    const validateDomain = (input) => {
        // Remove http://, https://, www., trailing slash, and convert to lowercase
        const cleaned = input.trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '');

        // Domain regex: allows subdomains, domains, and TLDs
        const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

        return domainRegex.test(cleaned) ? cleaned : null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate domain format
        const validatedDomain = validateDomain(domain);
        if (!validatedDomain) {
            setError('⚠ Invalid domain format. Example: example.com or app.mysite.io');
            return;
        }

        setLoading(true);

        // Check for duplicate domains (client-side first)
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            // Fetch existing domains
            const domainsRes = await fetch('/api/domains', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (domainsRes.ok) {
                const existingDomains = await domainsRes.json();
                const normalizedDomain = validatedDomain.toLowerCase();

                // Check if domain already exists (case-insensitive)
                const domainExists = existingDomains.some(d =>
                    (d.domain || d.name).toLowerCase() === normalizedDomain
                );

                if (domainExists) {
                    setError('This domain is already registered in your account');
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.error('Failed to check existing domains:', err);
        }

        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();
            const userId = auth.currentUser?.uid;

            const res = await fetch('/api/domains', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    domain: validatedDomain,
                    name: validatedDomain
                })
            });

            const data = await res.json();

            if (res.ok) {
                setCreated(true);
                // API returns { success: true, domain: { ... } }
                // We need to store the domain object directly to access .id later
                setDomainData({ ...data.domain, userId });
            } else {
                setError(data.error || 'Failed to create domain');
            }
        } catch (err) {
            console.error('Create domain error:', err);
            setError('Failed to create domain');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const downloadFile = async (filename) => {
        try {
            const response = await fetch(`/${filename}`);
            const content = await response.text();

            const blob = new Blob([content], { type: 'text/javascript' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Download failed:', err);
        }
    };

    if (created && domainData) {
        const integrationCode = `<script src="/loader.js" 
        data-domain-id="${domainData.id || domainData.domainId}" 
        data-user-id="${domainData.userId}">
</script>`;

        return (
            <div style={{ maxWidth: '800px', margin: '0 auto' }} className="fade-in">
                {/* Header */}
                <div className="mb-lg">
                    <h1 style={{
                        fontSize: '1.5rem',
                        fontWeight: '200',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        marginBottom: '0.5rem'
                    }}>
                        Domain Created ✓
                    </h1>
                    <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                        {domain} is ready for integration
                    </p>
                </div>

                {/* Setup Guide */}
                <div className="card mb-lg">
                    <h2 className="text-mono" style={{ fontSize: '0.875rem', marginBottom: '2rem', color: 'var(--accent-neon)', letterSpacing: '0.1em' }}>
                        SETUP INSTRUCTIONS
                    </h2>

                    {/* Step 1: Upload Files */}
                    <div style={{ marginBottom: '2.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: 'var(--accent-neon)',
                                color: 'black',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.875rem'
                            }}>
                                1
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '500', letterSpacing: '0.05em' }}>
                                UPLOAD FILES TO YOUR WEBSITE
                            </h3>
                        </div>
                        <p className="text-dim" style={{ fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1.5rem', paddingLeft: '3rem' }}>
                            Download and upload these files to your website's root directory (same folder as index.html):
                        </p>
                        <div style={{ paddingLeft: '3rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => downloadFile('loader.js')}
                                className="btn btn-ghost"
                                style={{ gap: '0.5rem' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                Download loader.js
                            </button>
                            <button
                                onClick={() => downloadFile('sw.js')}
                                className="btn btn-ghost"
                                style={{ gap: '0.5rem' }}
                            >
                                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                                </svg>
                                Download sw.js
                            </button>
                        </div>
                    </div>

                    {/* Step 2: Add Integration Code */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: 'var(--accent-neon)',
                                color: 'black',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.875rem'
                            }}>
                                2
                            </div>
                            <h3 style={{ fontSize: '1rem', fontWeight: '500', letterSpacing: '0.05em' }}>
                                ADD CODE TO YOUR INDEX.HTML
                            </h3>
                        </div>
                        <p className="text-dim" style={{ fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '1rem', paddingLeft: '3rem' }}>
                            Copy this code and paste it inside the <code style={{ backgroundColor: 'var(--bg-dark)', padding: '0.125rem 0.375rem', borderRadius: '0', color: 'var(--accent-neon)' }}>&lt;head&gt;</code> tag of your index.html file:
                        </p>
                        <div style={{ paddingLeft: '3rem' }}>
                            <div className="code-block-wrapper" style={{
                                position: 'relative',
                                backgroundColor: 'var(--bg-void)',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: '0',
                                padding: '1rem',
                                fontFamily: 'monospace',
                                fontSize: '0.813rem',
                                lineHeight: '1.6',
                                overflow: 'auto'
                            }}>
                                <pre style={{ margin: 0, color: 'var(--text-secondary)' }}>{integrationCode}</pre>
                                <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
                                    <CopyIcon text={integrationCode} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            setCreated(false);
                            setDomain('');
                            setDomainData(null);
                        }}
                        className="btn btn-terminal"
                        style={{ minWidth: '200px' }}
                    >
                        ADD ANOTHER DOMAIN
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/domains')}
                        className="btn btn-ghost"
                        style={{ minWidth: '200px' }}
                    >
                        VIEW ALL DOMAINS
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto' }} className="fade-in">
            {/* Header */}
            <div className="mb-lg">
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: '200',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                }}>
                    Add Domain
                </h1>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    Connect a new website to the notification system
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div className="card mb-lg">
                    {/* Domain URL Only */}
                    <div>
                        <label htmlFor="domain" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                            DOMAIN URL *
                        </label>
                        <input
                            id="domain"
                            type="text"
                            value={domain}
                            onChange={(e) => setDomain(e.target.value)}
                            required
                            placeholder="example.com"
                            className="form-input"
                            style={{
                                backgroundColor: 'var(--bg-dark)',
                                border: '1px solid var(--border-subtle)',
                                fontFamily: 'monospace',
                                fontSize: '0.875rem'
                            }}
                        />
                        <p className="text-dim text-mono" style={{ fontSize: '0.75rem', marginTop: '0.75rem', lineHeight: '1.5' }}>
                            → Enter your website domain (without http:// or https://)<br />
                            → Example: mywebsite.com or app.mysite.io
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div style={{
                            marginTop: '1.5rem',
                            padding: '0.75rem 1rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace'
                        }}>
                            ⚠ {error}
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                    <button
                        type="button"
                        onClick={() => router.push('/dashboard/domains')}
                        className="btn btn-ghost"
                        style={{ flex: 1 }}
                    >
                        CANCEL
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !domain}
                        className="btn btn-terminal"
                        style={{ flex: 1 }}
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                CREATING...
                            </>
                        ) : (
                            'CREATE DOMAIN'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

function CopyIcon({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy Code"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '10px', /* Breathing room as requested */
                color: copied ? '#00FF00' : '#888', /* Gray by default, Green on success */
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}
            onMouseOver={(e) => !copied && (e.currentTarget.style.color = '#fff')}
            onMouseOut={(e) => !copied && (e.currentTarget.style.color = '#888')}
        >
            {copied ? (
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
            ) : (
                <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            )}
        </button>
    );
}
