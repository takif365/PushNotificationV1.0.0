'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc } from 'firebase/firestore';
import { app } from '@/lib/firebase';
import { useToast } from '@/app/context/ToastContext';
import DateTimePicker from '@/app/components/DateTimePicker';

export default function CreateCampaignPage() {
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

    // Scheduling State
    const [scheduleMode, setScheduleMode] = useState(false); // false = Launch Now, true = Schedule
    const [scheduledAt, setScheduledAt] = useState('');

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

            let isoScheduledAt = null;
            if (scheduleMode) {
                if (!scheduledAt) {
                    showToast('Please select a date and time', 'error');
                    setLoading(false);
                    return;
                }
                // Ensure it's a valid date and format it to ISO
                const dateObj = new Date(scheduledAt);
                if (isNaN(dateObj.getTime())) {
                    showToast('Invalid date selected', 'error');
                    setLoading(false);
                    return;
                }
                isoScheduledAt = dateObj.toISOString();
            }

            const campaignData = {
                title: formData.title,
                message: formData.message,
                icon: formData.iconUrl || '/icon.png',
                actionUrl: formData.actionUrl || '/',
                targeting: {
                    domainId: formData.domainId,
                    platform: formData.platform
                },
                id: generatedId,
                status: scheduleMode ? 'scheduled' : 'draft',
                scheduledAt: isoScheduledAt
            };

            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(campaignData)
            });

            const data = await res.json();

            if (res.ok) {
                if (scheduleMode) {
                    showToast('CAMPAIGN SCHEDULED SUCCESSFULLY', 'success');
                    router.push('/dashboard/campaigns');
                } else {
                    await sendCampaign(data.campaign.id);
                }
            } else {
                showToast('Failed to create campaign: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Create campaign error:', error);
            showToast('Failed to create campaign', 'error');
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

    const sendCampaign = async (campaignId) => {
        setSending(true);
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/campaigns/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ campaignId })
            });

            const data = await res.json();

            if (res.ok) {
                setSendResult(data.results);
            } else {
                await fetch(`/api/campaigns/${campaignId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                showToast('Failed to send campaign: ' + data.error, 'error');
            }
        } catch (error) {
            console.error('Send campaign error:', error);
            showToast('Failed to send campaign', 'error');
        } finally {
            setSending(false);
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
                        → NEW CAMPAIGN
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/campaigns')}
                        className="btn btn-ghost"
                        style={{ minWidth: '200px' }}
                    >
                        VIEW ALL CAMPAIGNS
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-lg">
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: '200',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                }}>
                    Create Campaign
                </h1>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    Compose and launch new notification
                </p>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
                    {/* Form Section */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                        <div className="card">
                            <div className="form-group">
                                <label htmlFor="title" className="form-label">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    maxLength={65}
                                    placeholder="Notification title"
                                    className="form-input"
                                    style={{ backgroundColor: '#000000', border: '1px solid #333' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                    <span style={{
                                        fontFamily: '"Fira Code", monospace',
                                        fontSize: '0.75rem',
                                        color: (65 - formData.title.length) === 0 ? '#b91c1c' : '#737373',
                                        transition: 'color 0.2s'
                                    }}>
                                        {65 - formData.title.length}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="message" className="form-label">Body</label>
                                <textarea
                                    id="message"
                                    value={formData.message}
                                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                    required
                                    maxLength={200}
                                    placeholder="Message content"
                                    className="form-textarea"
                                    style={{ backgroundColor: '#000000', border: '1px solid #333' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
                                    <span style={{
                                        fontFamily: '"Fira Code", monospace',
                                        fontSize: '0.75rem',
                                        color: (200 - formData.message.length) === 0 ? '#b91c1c' : '#737373',
                                        transition: 'color 0.2s'
                                    }}>
                                        {200 - formData.message.length}
                                    </span>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="actionUrl" className="form-label">Target URL</label>
                                <input
                                    id="actionUrl"
                                    type="text"
                                    value={formData.actionUrl}
                                    onChange={handleUrlChange}
                                    placeholder="Paste link here (Auto-validates & tracks)"
                                    className="form-input"
                                    style={{
                                        borderColor: urlError ? '#ef4444' : (urlSuccess ? 'var(--accent-neon)' : ''),
                                        boxShadow: urlSuccess ? '0 0 10px rgba(0, 255, 255, 0.3)' : 'none'
                                    }}
                                />
                                {urlError && (
                                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                        Please enter a valid URL
                                    </p>
                                )}
                            </div>

                            <div className="form-group">
                                <label htmlFor="iconUrl" className="form-label">Icon URL</label>
                                <input
                                    id="iconUrl"
                                    type="url"
                                    value={formData.iconUrl}
                                    onChange={(e) => setFormData({ ...formData, iconUrl: e.target.value })}
                                    placeholder="https://example.com/icon.png"
                                    className="form-input"
                                />
                            </div>
                        </div>

                        <div className="card">
                            <label className="form-label" style={{ marginBottom: '1rem', display: 'block' }}>Timing Control</label>

                            {/* Segmented Toggle - Unified Container */}
                            <div style={{
                                display: 'flex',
                                background: '#111',
                                padding: '4px',
                                borderRadius: '6px',
                                border: '1px solid var(--border-subtle)',
                                marginBottom: scheduleMode ? '1.5rem' : '0'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setScheduleMode(false)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: !scheduleMode ? 'rgba(0, 255, 255, 0.15)' : 'transparent',
                                        color: !scheduleMode ? '#00ffff' : 'var(--text-dim)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        textShadow: !scheduleMode ? '0 0 10px rgba(0,255,255,0.5)' : 'none'
                                    }}
                                >
                                    🚀 LAUNCH NOW
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScheduleMode(true)}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        background: scheduleMode ? 'rgba(251, 191, 36, 0.15)' : 'transparent',
                                        color: scheduleMode ? '#fbbf24' : 'var(--text-dim)',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        textShadow: scheduleMode ? '0 0 10px rgba(251, 191, 36, 0.5)' : 'none'
                                    }}
                                >
                                    ⏳ SCHEDULE
                                </button>
                            </div>

                            {scheduleMode && (
                                <div className="fade-in" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">
                                        Execution Time (Local)
                                    </label>
                                    <div style={{ padding: '0.5rem 0' }}>
                                        <DateTimePicker
                                            value={scheduledAt}
                                            onChange={setScheduledAt}
                                        />
                                    </div>
                                    <p className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#444' }}>
                                        Campaign will be queued for automatic delivery at the specified time.
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                <div className="form-group">
                                    <label htmlFor="domain" className="form-label">Target Domain</label>
                                    <select
                                        id="domain"
                                        value={formData.domainId}
                                        onChange={(e) => setFormData({ ...formData, domainId: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="all">All Domains</option>
                                        {domains.map(domain => (
                                            <option key={domain.id} value={domain.id}>{domain.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="platform" className="form-label">Platform</label>
                                    <select
                                        id="platform"
                                        value={formData.platform}
                                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                        className="form-input"
                                    >
                                        <option value="all">All Platforms</option>
                                        <option value="web">Web Only</option>
                                        <option value="android">Android Only</option>
                                        <option value="ios">iOS Only</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard/campaigns')}
                                className="btn btn-ghost"
                                style={{ flex: 1 }}
                            >
                                ← CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={loading || sending}
                                className="btn btn-terminal"
                                style={{
                                    flex: 1,
                                    borderColor: scheduleMode ? '#fbbf24' : 'var(--accent-neon)',
                                    color: scheduleMode ? '#fbbf24' : 'var(--accent-neon)',
                                    boxShadow: scheduleMode ? '0 0 20px rgba(251, 191, 36, 0.2)' : '0 0 20px rgba(0, 255, 255, 0.2)'
                                }}
                            >
                                {loading || sending ? (
                                    <>
                                        <span className="spinner" style={{ marginRight: '0.5rem', borderColor: scheduleMode ? '#fbbf24 transparent transparent transparent' : 'var(--accent-neon) transparent transparent transparent' }}></span>
                                        {scheduleMode ? 'SCHEDULING...' : 'TRANSMITTING...'}
                                    </>
                                ) : (
                                    scheduleMode ? '⏳ SCHEDULE CAMPAIGN' : '🚀 EXECUTE NOW'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Phone Preview */}
                    <div style={{ flex: '0 0 350px' }}>
                        <div style={{ position: 'sticky', top: '2rem' }}>
                            {/* Phone Mockup */}
                            <div style={{
                                width: '100%',
                                backgroundColor: 'var(--bg-card)',
                                border: '2px solid var(--border-subtle)',
                                borderRadius: '2rem',
                                padding: '0.75rem',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                            }}>
                                {/* Phone Screen */}
                                <div style={{
                                    backgroundColor: 'var(--bg-void)',
                                    borderRadius: '1.5rem',
                                    padding: '1.5rem 1rem 1rem 1rem',
                                    minHeight: '600px'
                                }}>
                                    {/* Status Bar */}
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '1.5rem',
                                        fontSize: '0.75rem',
                                        color: 'var(--text-ghost)'
                                    }}>
                                        <span className="text-mono">9:41</span>
                                        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                            <span>📶</span>
                                            <span>📡</span>
                                            <span>🔋</span>
                                        </div>
                                    </div>

                                    {/* Notification */}
                                    <div style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                        borderRadius: '1rem',
                                        padding: '1rem',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
                                        animation: 'slideDown 0.3s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'start' }}>
                                            {/* Icon */}
                                            {formData.iconUrl ? (
                                                <img
                                                    src={formData.iconUrl}
                                                    alt="Notification icon"
                                                    style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        borderRadius: '0.5rem',
                                                        flexShrink: 0,
                                                        objectFit: 'cover'
                                                    }}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div style={{
                                                width: '40px',
                                                height: '40px',
                                                backgroundColor: '#00ffff',
                                                borderRadius: '0.5rem',
                                                display: formData.iconUrl ? 'none' : 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0,
                                                fontSize: '1.25rem'
                                            }}>
                                                🔔
                                            </div>

                                            {/* Content */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    fontSize: '0.875rem',
                                                    fontWeight: '600',
                                                    color: '#111827',
                                                    marginBottom: '0.25rem',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                    maxWidth: '240px' // Prevent title from pushing
                                                }}>
                                                    {formData.title || 'Notification Title'}
                                                </p>
                                                <p style={{
                                                    fontSize: '0.813rem',
                                                    color: '#6b7280',
                                                    lineHeight: '1.4',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: previewExpanded ? 'unset' : 3, // User requested 3 lines
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',  // Ensure ellipsis adds ...
                                                    wordBreak: 'break-word', // Crucial for long words/URLs
                                                    transition: 'all 0.3s ease',
                                                    maxHeight: previewExpanded ? 'none' : '4.2em' // strict height limit for collapsed state (1.4 * 3)
                                                }}>
                                                    {formData.message || 'Your message will appear here...'}
                                                </p>
                                                {/* Action Buttons (Android Style) - Optional realism */}
                                                {previewExpanded && (
                                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem' }}>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#0ea5e9', cursor: 'pointer' }}>OPEN</span>
                                                        <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', cursor: 'pointer' }}>DISMISS</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Helper Text with Toggle */}
                                    <div style={{
                                        marginTop: '1rem',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '1rem'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewExpanded(!previewExpanded)}
                                            style={{
                                                background: 'transparent',
                                                border: '1px solid var(--border-subtle)',
                                                color: 'var(--text-dim)',
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '20px',
                                                fontSize: '0.7rem',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem'
                                            }}
                                            className="hover:bg-white/5"
                                        >
                                            {previewExpanded ? 'Collapse ▲' : 'Expand ▼'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>

            <style jsx>{`
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                @media (max-width: 1024px) {
                    form > div {
                        flex-direction: column !important;
                    }
                    form > div > div:last-child {
                        flex: 1 !important;
                        max-width: 100% !important;
                    }
                }
            `}</style>
        </div>
    );
}
