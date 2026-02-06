'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/app/context/ToastContext';

export default function BroadcastPage() {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [generatedId, setGeneratedId] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        message: '',
        actionUrl: '',
        iconUrl: '',
        domainId: 'all',
        platform: 'all'
    });
    const [sendResult, setSendResult] = useState(null);
    const [previewExpanded, setPreviewExpanded] = useState(false);
    const [urlError, setUrlError] = useState(false);
    const [urlSuccess, setUrlSuccess] = useState(false);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        loadDomains();
        // Generate ID
        const db = getFirestore(app);
        const newRef = doc(collection(db, 'campaigns'));
        setGeneratedId(newRef.id);
    }, []);

    const loadDomains = async () => {
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/domains', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setDomains(data.domains || []);
            }
        } catch (error) {
            console.error('Failed to load domains:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: formData.title,
                    message: formData.message,
                    icon: formData.iconUrl || '/icon.png',
                    actionUrl: formData.actionUrl || '/',
                    targeting: {
                        domainId: formData.domainId,
                        platform: formData.platform
                    },
                    id: generatedId
                })
            });

            const data = await res.json();

            if (res.ok) {
                // Success: API now returns results directly
                setSendResult(data.results);
                showToast('Campaign sent successfully!', 'success');
            } else {
                showToast('Failed to send campaign: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Create/Send campaign error:', error);
            showToast('Failed to send campaign', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUrlChange = (e) => {
        const rawValue = e.target.value;
        const cid = generatedId; // State-based, robust.

        // 1. Sanitize
        let val = rawValue;
        const trimmed = val.trim();

        // Anti-Loop: If already a tracking link, just update state and look successful
        if (trimmed.includes('/api/track-click')) {
            setFormData(prev => ({ ...prev, actionUrl: val }));
            setUrlError(false);
            setUrlSuccess(true);
            return;
        }

        // 2. Auto-Fix (Prepend https:// if it looks like a domain)
        // Regex checks for "word.word" but no protocol
        if (!/^https?:\/\//i.test(trimmed) && /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/.test(trimmed)) {
            val = 'https://' + trimmed;
        }

        // 3. Validation
        let isValid = false;
        if (val === '') {
            // Empty is neutral, not error
            setUrlError(false);
            setUrlSuccess(false);
            setFormData(prev => ({ ...prev, actionUrl: val }));
            return;
        }

        try {
            new URL(val);
            isValid = true;
        } catch (_) {
            isValid = false;
        }

        if (!isValid) {
            // Show error, keep original text so user can fix
            setUrlError(true);
            setUrlSuccess(false);
            setFormData(prev => ({ ...prev, actionUrl: rawValue }));
        } else {
            // 4. Success Transformation
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
            const trackingUrl = `${baseUrl}/api/track-click?campaignId=${cid}&targetUrl=${encodeURIComponent(val)}`;

            console.log('[Universal-Listener] Transformed Valid URL:', trackingUrl);

            setFormData(prev => ({ ...prev, actionUrl: trackingUrl }));
            setUrlSuccess(true);
            setUrlError(false);
        }
    };

    if (sendResult) {
        return (
            <div className="fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <div className="card mb-lg" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div className="stat-value neon-glow" style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                        {sendResult.sent}
                    </div>
                    <div className="stat-label" style={{ fontSize: '1rem', marginBottom: '2rem' }}>
                        DELIVERED
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                        <div>
                            <div className="text-dim mb-sm" style={{ fontSize: '0.75rem' }}>FAILED</div>
                            <div className="text-mono" style={{ color: '#ef4444' }}>{sendResult.failed}</div>
                        </div>
                        <div>
                            <div className="text-dim mb-sm" style={{ fontSize: '0.75rem' }}>CLEANED</div>
                            <div className="text-mono" style={{ color: '#f59e0b' }}>{sendResult.cleanedUp || 0}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            setSendResult(null);
                            setFormData({ title: '', message: '', actionUrl: '', iconUrl: '', domainId: 'all', platform: 'all' });
                        }}
                        className="btn btn-terminal"
                        style={{ minWidth: '200px' }}
                    >
                        SEND ANOTHER
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/campaigns')}
                        className="btn btn-ghost"
                        style={{ minWidth: '200px' }}
                    >
                        VIEW CAMPAIGNS
                    </button>
                </div>
            </div>
        );
    }

    const getDisplayDomain = (url) => {
        if (!url) return 'YOUR-SITE.COM';
        try {
            // Handle tracking links
            if (url.includes('/api/track-click')) {
                const params = new URLSearchParams(url.split('?')[1]);
                const target = params.get('targetUrl');
                if (target) {
                    const urlObj = new URL(target);
                    return urlObj.hostname.toUpperCase();
                }
            }
            // Handle direct links
            const urlObj = new URL(url);
            return urlObj.hostname.toUpperCase();
        } catch (e) {
            return 'YOUR-SITE.COM';
        }
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="broadcast-header" style={{ marginBottom: '2rem', padding: '0 1rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>SEND NOTIFICATION</h1>
                <p className="text-secondary">
                    BROADCAST PUSH DATA TO CONNECTED DEVICES
                </p>
            </div>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>

                <form onSubmit={handleSubmit}>
                    <div className="broadcast-main-container" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                        {/* Form Section */}
                        <div className="broadcast-form-section" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div className="card" style={{ padding: '0.75rem', borderRadius: '0', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>
                                <div style={{ marginBottom: '0.35rem' }}>
                                    <label htmlFor="title" className="form-label" style={{ marginBottom: 0, fontSize: '0.75rem' }}>TITLE</label>
                                </div>
                                <input
                                    id="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    maxLength={40}
                                    required
                                    placeholder="CAMPAIGN HEADLINE"
                                    className="form-input"
                                    style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '0', border: '1px solid var(--border-subtle)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                    <span className="text-mono" style={{ fontSize: '0.6rem', color: 'var(--text-ghost)', letterSpacing: '0.05em', opacity: 0.8 }}>
                                        {40 - (formData.title?.length || 0)} <span style={{ color: 'var(--text-dim)' }}>LEFT</span>
                                    </span>
                                </div>

                                <div style={{ marginBottom: '0.35rem' }}>
                                    <label htmlFor="message" className="form-label" style={{ marginBottom: 0, fontSize: '0.75rem' }}>BODY</label>
                                </div>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    maxLength={150}
                                    required
                                    placeholder="MESSAGE CONTENT"
                                    className="form-textarea"
                                    style={{ minHeight: '60px', padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '0', border: '1px solid var(--border-subtle)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                    <span className="text-mono" style={{ fontSize: '0.6rem', color: 'var(--text-ghost)', letterSpacing: '0.05em', opacity: 0.8 }}>
                                        {150 - (formData.message?.length || 0)} <span style={{ color: 'var(--text-dim)' }}>LEFT</span>
                                    </span>
                                </div>

                                <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                                    <label htmlFor="actionUrl" className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>TARGET URL</label>
                                    <input
                                        id="actionUrl"
                                        type="text"
                                        value={formData.actionUrl}
                                        onChange={handleUrlChange}
                                        placeholder="PASTE LINK HERE"
                                        className="form-input"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            fontSize: '0.8rem',
                                            borderRadius: '0',
                                            border: '1px solid ' + (urlError ? '#ef4444' : (urlSuccess ? 'var(--accent-neon)' : 'var(--border-subtle)')),
                                            boxShadow: urlSuccess ? '0 0 10px rgba(0, 255, 255, 0.2)' : 'none'
                                        }}
                                    />
                                </div>

                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label htmlFor="iconUrl" className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>ICON URL</label>
                                    <input
                                        id="iconUrl"
                                        type="url"
                                        value={formData.iconUrl}
                                        onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                                        placeholder="https://example.com/icon.png"
                                        className="form-input"
                                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '0', border: '1px solid var(--border-subtle)' }}
                                    />
                                </div>
                            </div>

                            <div className="card" style={{ padding: '0.75rem', borderRadius: '0', border: '1px solid var(--border-subtle)', boxShadow: 'none' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label htmlFor="domain" className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>TARGET DOMAIN</label>
                                        <select
                                            id="domain"
                                            value={formData.domainId}
                                            onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                                            className="form-input"
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '0', border: '1px solid var(--border-subtle)' }}
                                        >
                                            <option value="all">ANY DOMAIN</option>
                                            {domains.map(domain => (
                                                <option key={domain.id} value={domain.id}>{domain.name.toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label htmlFor="platform" className="form-label" style={{ fontSize: '0.75rem', marginBottom: '0.35rem' }}>PLATFORM</label>
                                        <select
                                            id="platform"
                                            value={formData.platform}
                                            onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                            className="form-input"
                                            style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', borderRadius: '0', border: '1px solid var(--border-subtle)' }}
                                        >
                                            <option value="all">ALL DEVICES</option>
                                            <option value="web">WEB BROWSER</option>
                                            <option value="android">ANDROID OS</option>
                                            <option value="ios">APPLE IOS</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    onClick={() => router.push('/dashboard/campaigns')}
                                    className="btn btn-ghost"
                                    style={{ flex: 1, borderRadius: '0', padding: '0.6rem', fontSize: '0.8rem' }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || sending}
                                    className="btn btn-terminal"
                                    style={{ flex: 1, borderRadius: '0', padding: '0.6rem', fontSize: '0.8rem' }}
                                >
                                    {loading || sending ? (
                                        <>
                                            <span className="spinner" style={{ marginRight: '0.5rem', width: '0.8rem', height: '0.8rem' }}></span>
                                            TRANSMITTING
                                        </>
                                    ) : (
                                        'EXECUTE'
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Simultaneous Dual Preview (Mobile + Desktop) */}
                        <div className="broadcast-preview-section" style={{ flex: '0 0 520px', height: '500px', position: 'relative' }}>
                            <div className="preview-scaler">
                                {/* LAPTOP / DESKTOP PREVIEW */}
                                <div style={{
                                    width: '480px',
                                    height: '300px',
                                    backgroundColor: '#1a1a1a',
                                    border: '8px solid #333',
                                    borderRadius: '12px 12px 0 0',
                                    position: 'relative',
                                    marginLeft: '40px',
                                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                                    overflow: 'hidden'
                                }}>
                                    {/* Blue Screen Content */}
                                    <div style={{ padding: '0.5rem', height: '100%' }}>
                                        <div style={{ height: '30px', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56', marginRight: '6px' }}></div>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e', marginRight: '6px' }}></div>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }}></div>
                                        </div>
                                        <div style={{ padding: '1rem' }}>
                                            <div style={{ width: '100px', height: '8px', background: '#333', marginBottom: '1rem' }}></div>
                                            <div style={{ width: '200px', height: '6px', background: '#222', marginBottom: '0.5rem' }}></div>
                                            <div style={{ width: '150px', height: '6px', background: '#222' }}></div>
                                        </div>

                                        {/* CHROME WINDOW NOTIFICATION */}
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '10px',
                                            right: '10px',
                                            width: '240px',
                                            background: '#fff',
                                            borderRadius: '4px',
                                            padding: '8px',
                                            display: 'flex',
                                            gap: '8px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                            animation: 'slideInRight 0.5s ease-out',
                                            transform: 'scale(0.9)',
                                            transformOrigin: 'bottom right'
                                        }}>
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: '#00ffff',
                                                borderRadius: '4px',
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {formData.iconUrl ? <img src={formData.iconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔔'}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '10px', color: '#333', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {formData.title || 'CAMPAIGN HEADLINE'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#666', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {formData.message || 'YOUR MESSAGE CONTENT WILL APPEAR HERE'}
                                                </div>
                                                <div style={{ fontSize: '8px', color: '#999', marginTop: '3px' }}>{getDisplayDomain(formData.actionUrl)}</div>
                                            </div>
                                            <div style={{ position: 'absolute', top: '5px', right: '8px', color: '#999', fontSize: '10px' }}>✕</div>
                                        </div>
                                    </div>
                                </div>
                                {/* Laptop Base */}
                                <div style={{
                                    width: '540px',
                                    height: '10px',
                                    background: '#444',
                                    borderRadius: '0 0 10px 10px',
                                    marginLeft: '10px',
                                    position: 'relative'
                                }}>
                                    <div style={{ width: '100px', height: '2px', background: '#333', margin: '0 auto' }}></div>
                                </div>

                                {/* PHONE PREVIEW (In front) */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: '0',
                                    left: '0',
                                    width: '220px',
                                    height: '440px',
                                    backgroundColor: '#000',
                                    border: '6px solid #1a1a1a',
                                    borderRadius: '24px',
                                    boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
                                    overflow: 'hidden',
                                    zIndex: 10
                                }}>
                                    {/* Inner Screen */}
                                    <div style={{
                                        height: '100%',
                                        background: 'linear-gradient(135deg, #101010 0%, #000 100%)',
                                        padding: '1.5rem 0.5rem',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', marginBottom: '2rem' }}>
                                            <div style={{ fontSize: '10px', color: '#555' }}>9:41</div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                <div style={{ width: '12px', height: '6px', border: '1px solid #333', borderRadius: '1px' }}></div>
                                            </div>
                                        </div>

                                        {/* MOBILE NOTIFICATION */}
                                        <div style={{
                                            background: 'rgba(255,255,255,0.95)',
                                            borderRadius: '12px',
                                            padding: '10px',
                                            display: 'flex',
                                            gap: '10px',
                                            boxShadow: '0 10px 20px rgba(0,0,0,0.4)',
                                            animation: 'slideDown 0.4s ease-out'
                                        }}>
                                            <div style={{
                                                width: '32px',
                                                height: '32px',
                                                backgroundColor: '#00ffff',
                                                borderRadius: '6px',
                                                flexShrink: 0,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '14px',
                                                overflow: 'hidden'
                                            }}>
                                                {formData.iconUrl ? <img src={formData.iconUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '🔔'}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {formData.title || 'CAMPAIGN HEADLINE'}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                    {formData.message || 'MESSAGE CONTENT'}
                                                </div>
                                                <div style={{ fontSize: '8px', color: '#999', marginTop: '3px' }}>UNSUBSCRIBE</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <style jsx>{`
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(50px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                
                @media (max-width: 1024px) {
                    .broadcast-main-container {
                        flex-direction: column !important;
                        align-items: center !important;
                    }
                    .broadcast-form-section {
                        width: 100% !important;
                    }
                    .broadcast-preview-section {
                        flex: none !important;
                        width: 100% !important;
                        height: auto !important;
                        min-height: 400px;
                        display: flex;
                        justify-content: center;
                        padding-top: 2rem;
                        overflow: visible !important;
                    }
                    .preview-scaler {
                        transform: scale(0.65);
                        transform-origin: top center;
                    }
                    .broadcast-header {
                        padding-left: 3rem !important; /* Space for mobile hamburger */
                    }
                }

                @media (max-width: 480px) {
                    .preview-scaler {
                        transform: scale(0.55);
                    }
                    .broadcast-header h1 {
                        font-size: 1.5rem !important;
                    }
                    .broadcast-header p {
                        font-size: 0.75rem !important;
                    }
                }
            `}</style>
            </div>
        </div>
    );
}
