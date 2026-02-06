'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import ConfirmationModal from '@/app/components/ConfirmationModal';
import { useToast } from '@/app/context/ToastContext';

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCampaigns, setSelectedCampaigns] = useState(new Set());
    const [selectAll, setSelectAll] = useState(false);
    const [resendingId, setResendingId] = useState(null);
    const [viewingCampaign, setViewingCampaign] = useState(null);

    const [previewIndex, setPreviewIndex] = useState(0);

    const { showToast } = useToast();

    const [modalConfig, setModalConfig] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: '',
        isDestructive: false,
        onConfirm: () => { }
    });
    const router = useRouter();

    const platforms = ['ANDROID', 'WINDOWS', 'MACOS'];

    useEffect(() => {
        loadCampaigns();
    }, []);

    const loadCampaigns = async () => {
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/campaigns', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setCampaigns(data.campaigns || []);
            }
        } catch (error) {
            console.error('Failed to load campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const deleteCampaign = (id) => {
        setModalConfig({
            isOpen: true,
            title: 'DELETE CAMPAIGN',
            message: 'Are you sure you want to delete this campaign? This action cannot be undone.',
            confirmText: 'YES, DELETE',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const auth = getAuth(app);
                    const token = await auth.currentUser?.getIdToken();

                    const res = await fetch(`/api/campaigns/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (res.ok) {
                        setCampaigns(prev => prev.filter(c => c.id !== id));
                        selectedCampaigns.delete(id);
                        setSelectedCampaigns(new Set(selectedCampaigns));
                        showToast('Campaign deleted', 'success');
                    } else {
                        showToast('Failed to delete campaign', 'error');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    showToast('Failed to delete campaign', 'error');
                }
            }
        });
    };

    const deleteSelected = () => {
        if (selectedCampaigns.size === 0) return;

        setModalConfig({
            isOpen: true,
            title: 'DELETE SELECTION',
            message: `Are you sure you want to delete ${selectedCampaigns.size} selected campaigns?`,
            confirmText: `YES, DELETE (${selectedCampaigns.size})`,
            isDestructive: true,
            onConfirm: async () => {
                const auth = getAuth(app);
                const token = await auth.currentUser?.getIdToken();

                for (const id of selectedCampaigns) {
                    await fetch(`/api/campaigns/${id}`, {
                        method: 'DELETE',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }

                setCampaigns(prev => prev.filter(c => !selectedCampaigns.has(c.id)));
                setSelectedCampaigns(new Set());
                setSelectAll(false);
                showToast('Selected campaigns deleted', 'success');
            }
        });
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedCampaigns(new Set());
        } else {
            setSelectedCampaigns(new Set(campaigns.map(c => c.id)));
        }
        setSelectAll(!selectAll);
    };

    const toggleSelect = (id) => {
        const newSelected = new Set(selectedCampaigns);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCampaigns(newSelected);
        setSelectAll(newSelected.size === campaigns.length);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const handleResend = (campaignId) => {
        setModalConfig({
            isOpen: true,
            title: 'RE-SEND CAMPAIGN',
            message: 'Are you sure you want to resend this campaign to all active subscribers?',
            confirmText: 'YES, EXECUTE',
            isDestructive: false,
            onConfirm: async () => {
                setResendingId(campaignId);
                try {
                    const auth = getAuth(app);
                    const token = await auth.currentUser?.getIdToken();

                    const res = await fetch('/api/campaigns/resend', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ campaignId })
                    });

                    if (res.ok) {
                        showToast('CAMPAIGN EXECUTED SUCCESSFULLY', 'success');
                        loadCampaigns(); // Refresh status/stats
                    } else {
                        showToast('Failed to resend campaign', 'error');
                    }
                } catch (e) {
                    console.error(e);
                    showToast('Failed to resend campaign', 'error');
                } finally {
                    setResendingId(null);
                }
            }
        });
    };

    const handleView = (id) => {
        const campaign = campaigns.find(c => c.id === id);
        if (campaign) {
            setViewingCampaign(campaign);
            setPreviewIndex(0); // Reset to Android default
        }
    };

    const nextPlatform = (e) => {
        e.stopPropagation();
        setPreviewIndex((prev) => (prev + 1) % platforms.length);
    };

    const prevPlatform = (e) => {
        e.stopPropagation();
        setPreviewIndex((prev) => (prev - 1 + platforms.length) % platforms.length);
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header & Actions Compact Row */}
            <div className="mb-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Campaigns</h1>
                    <p className="text-secondary">
                        Manage your push notification campaigns
                    </p>
                </div>
            </div>

            {/* Delete Selected Button */}
            {selectedCampaigns.size > 0 && (
                <div className="card mb-md" style={{
                    padding: '1rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="text-mono" style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                            {selectedCampaigns.size} selected
                        </div>
                        <button
                            onClick={deleteSelected}
                            className="btn btn-ghost"
                            style={{
                                color: '#ef4444',
                                borderColor: 'rgba(239, 68, 68, 0.3)',
                                fontSize: '0.75rem',
                                padding: '0.5rem 1rem'
                            }}
                        >
                            DELETE SELECTED
                        </button>
                    </div>
                </div>
            )}

            {/* Campaigns Table */}
            {campaigns.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '50%',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1rem'
                    }}>
                        <svg style={{ width: '32px', height: '32px', color: 'var(--text-dim)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <h2 className="mb-sm" style={{ fontSize: '1rem', fontWeight: '400', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        No Campaigns
                    </h2>
                    <p className="text-dim mb-md">Create your first campaign</p>
                    <Link href="/dashboard/campaigns/new" className="btn btn-terminal">
                        Create Campaign
                    </Link>
                </div>
            ) : (
                <div className="table-container">
                    <style jsx>{`
                        .cyberglow-border {
                            border: 1px solid rgba(0, 255, 255, 0.3) !important;
                            box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
                        }

                        .table-container {
                            width: 100%;
                            overflow-x: auto;
                        }
                        
                        table.audience-table {
                            width: 100%;
                            border-collapse: collapse;
                            font-size: 0.85rem;
                            background-color: rgba(0, 0, 0, 0.8);
                        }

                        th, td {
                            border: 1px solid rgba(0, 255, 255, 0.3);
                            padding: 12px;
                            text-align: left;
                            white-space: nowrap;
                            background-color: transparent;
                            vertical-align: middle;
                        }

                        th {
                            background-color: transparent;
                            color: #ffffff;
                            font-family: 'Courier New', monospace;
                            text-transform: uppercase;
                            font-weight: bold;
                            letter-spacing: 0.05em;
                            border-bottom: 1px solid rgba(0, 255, 255, 0.5);
                        }

                        tr:hover td {
                            background-color: rgba(0, 255, 255, 0.03);
                        }

                        /* Checkbox styling */
                        input[type="checkbox"] {
                            width: 16px;
                            height: 16px;
                            cursor: pointer;
                            accent-color: #00FFF0;
                        }
                    `}</style>
                    <table className="audience-table cyberglow-border">
                        <thead>
                            <tr>
                                <th style={{ width: '40px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectAll}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th>CAMPAIGN</th>
                                <th style={{ textAlign: 'center' }}>STATUS</th>
                                <th style={{ textAlign: 'center' }}>SENT</th>
                                <th style={{ textAlign: 'center' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((campaign, index) => (
                                <tr key={index}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input
                                            type="checkbox"
                                            checked={selectedCampaigns.has(campaign.id)}
                                            onChange={() => toggleSelect(campaign.id)}
                                        />
                                    </td>
                                    <td style={{ minWidth: '250px' }}>
                                        <div style={{ paddingRight: '1rem' }}>
                                            <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>
                                                {campaign.title}
                                            </div>
                                            <div className="text-dim" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>
                                                {campaign.body}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            color: campaign.status === 'sent' ? '#00FFF0' : 'var(--text-dim)',
                                            fontFamily: 'monospace',
                                            textTransform: 'uppercase',
                                            fontWeight: 'bold',
                                            textShadow: campaign.status === 'sent' ? '0 0 5px rgba(0, 255, 240, 0.5)' : 'none'
                                        }}>
                                            {campaign.status || 'DRAFT'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span className="text-mono" style={{ color: '#fff' }}>
                                            {formatDate(campaign.createdAt)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => handleResend(campaign.id)}
                                                disabled={resendingId === campaign.id}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-subtle)',
                                                    color: '#fff',
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    cursor: resendingId === campaign.id ? 'not-allowed' : 'pointer',
                                                    opacity: resendingId === campaign.id ? 0.5 : 1,
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {resendingId === campaign.id ? '...' : 'RESEND'}
                                            </button>
                                            <button
                                                onClick={() => handleView(campaign.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid var(--border-subtle)',
                                                    color: '#fff',
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    cursor: 'pointer',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                VIEWS
                                            </button>
                                            <button
                                                onClick={() => deleteCampaign(campaign.id)}
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                                    color: '#ef4444',
                                                    padding: '4px 8px',
                                                    fontSize: '0.7rem',
                                                    cursor: 'pointer',
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                DELETE
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {/* Campaign View Modal */}
            {viewingCampaign && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: '"Fira Code", monospace'
                }} onClick={() => setViewingCampaign(null)}>
                    <div style={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid var(--accent-neon)',
                        boxShadow: '0 0 40px rgba(0, 255, 255, 0.1)',
                        width: '900px',
                        maxWidth: '90vw',
                        maxHeight: '80vh', // Limit height
                        overflowY: 'auto',   // Scroll if needed
                        display: 'flex',
                        flexDirection: 'column', // Prepare for mobile stacking if needed, though designed for desktop width
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>

                        {/* Header */}
                        <div style={{
                            padding: '1rem 1.5rem',
                            borderBottom: '1px solid var(--border-subtle)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(255, 255, 255, 0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--accent-neon)', boxShadow: '0 0 10px var(--accent-neon)' }} />
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '400', letterSpacing: '0.1em', color: 'var(--text-primary)' }}>CAMPAIGN INTEL</h3>
                            </div>
                            <button
                                onClick={() => setViewingCampaign(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--text-dim)',
                                    cursor: 'pointer',
                                    fontSize: '1.25rem',
                                    padding: '0.25rem'
                                }}
                            >✕</button>
                        </div>

                        {/* Content Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '400px' }}>

                            {/* Left Column: Stats & Data */}
                            <div style={{ padding: '2rem', borderRight: '1px solid var(--border-subtle)' }}>
                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CAMPAIGN ID</label>
                                    <div
                                        onClick={() => { navigator.clipboard.writeText(viewingCampaign.id); alert('ID Copied'); }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            padding: '0.75rem',
                                            border: '1px solid var(--border-subtle)',
                                            color: 'var(--text-dim)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}
                                    >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{viewingCampaign.id}</span>
                                        <span style={{ fontSize: '0.75rem', opacity: 0.5 }}>RES</span>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                                    {/* REACH */}
                                    <div style={{ background: 'rgba(0, 255, 255, 0.05)', padding: '1rem', border: '1px solid rgba(0, 255, 255, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-neon)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>REACH</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '300', color: '#fff', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
                                            {viewingCampaign.stats?.totalSent || 0}
                                        </div>
                                    </div>

                                    {/* CLICKS */}
                                    <div style={{ background: 'rgba(0, 255, 255, 0.05)', padding: '1rem', border: '1px solid rgba(0, 255, 255, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-neon)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>CLICKS</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '300', color: '#fff', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
                                            {viewingCampaign.stats?.totalClicks || 0}
                                        </div>
                                    </div>

                                    {/* CTR */}
                                    <div style={{ background: 'rgba(0, 255, 255, 0.05)', padding: '1rem', border: '1px solid rgba(0, 255, 255, 0.2)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--accent-neon)', marginBottom: '0.5rem', letterSpacing: '0.1em' }}>CTR</div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '300', color: '#fff', textShadow: '0 0 10px rgba(0, 255, 255, 0.5)' }}>
                                            {(() => {
                                                const clicks = viewingCampaign.stats?.totalClicks || 0;
                                                const sent = viewingCampaign.stats?.totalSent || 0;
                                                if (sent === 0) return '0.0%';
                                                return ((clicks / sent) * 100).toFixed(1) + '%';
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TARGET URL</label>
                                    <a
                                        href={viewingCampaign.actionUrl || viewingCampaign.url || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontSize: '0.875rem', wordBreak: 'break-all', display: 'block', padding: '0.5rem', border: '1px dashed var(--border-subtle)' }}
                                    >
                                        {(viewingCampaign.actionUrl || viewingCampaign.url || '/').replace('http://localhost:3000', typeof window !== 'undefined' ? window.location.origin : '...')}
                                    </a>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>SENT AT</label>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                        {formatDate(viewingCampaign.sentAt || viewingCampaign.createdAt)}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Preview */}
                            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, rgba(0,255,255,0.03) 0%, rgba(0,0,0,0) 70%)' }}>

                                {/* Platform Switcher Header */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '340px', marginBottom: '1.5rem' }}>
                                    <button
                                        onClick={prevPlatform}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.7rem', cursor: 'pointer', padding: '0.5rem', fontFamily: 'monospace' }}
                                    >PREV</button>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', letterSpacing: '0.1em' }}>
                                        LIVE PREVIEW ({platforms[previewIndex]})
                                    </div>
                                    <button
                                        onClick={nextPlatform}
                                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)', fontSize: '0.7rem', cursor: 'pointer', padding: '0.5rem', fontFamily: 'monospace' }}
                                    >NEXT</button>
                                </div>

                                {/* Mockups */}
                                <div style={{ minHeight: '120px', display: 'flex', alignItems: 'center' }}>

                                    {/* ANDROID */}
                                    {platforms[previewIndex] === 'ANDROID' && (
                                        <div className="fade-in" style={{
                                            width: '340px',
                                            background: '#202124',
                                            borderRadius: '8px',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                            overflow: 'hidden',
                                            fontFamily: 'Roboto, sans-serif'
                                        }}>
                                            <div style={{ padding: '12px 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ width: '16px', height: '16px', background: '#aaa', borderRadius: '50%', overflow: 'hidden' }}>
                                                    <img
                                                        src={viewingCampaign.icon || '/icon.png'}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#555'; }}
                                                    />
                                                </div>
                                                <span style={{ fontSize: '12px', color: '#aaa' }}>Chrome • now</span>
                                                <div style={{ marginLeft: 'auto', color: '#aaa', fontSize: '12px' }}>▼</div>
                                            </div>
                                            <div style={{ padding: '8px 12px 14px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#fff', marginBottom: '4px' }}>{viewingCampaign.title}</div>
                                                <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.4' }}>{viewingCampaign.body}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* WINDOWS */}
                                    {platforms[previewIndex] === 'WINDOWS' && (
                                        <div className="fade-in" style={{
                                            width: '340px',
                                            background: '#1f1f1f',
                                            borderRadius: '4px',
                                            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                                            overflow: 'hidden',
                                            fontFamily: '"Segoe UI", sans-serif',
                                            border: '1px solid #333'
                                        }}>
                                            <div style={{ padding: '12px', display: 'flex', gap: '12px' }}>
                                                <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '4px', flexShrink: 0 }}>
                                                    <img
                                                        src={viewingCampaign.icon || '/icon.png'}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#555'; }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#fff', marginBottom: '2px' }}>{viewingCampaign.title}</div>
                                                    <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.35', marginBottom: '8px' }}>{viewingCampaign.body}</div>
                                                    <div style={{ fontSize: '11px', color: '#888' }}>Google Chrome • Google.com</div>
                                                </div>
                                                <div style={{ color: '#888', fontSize: '16px', cursor: 'default' }}>×</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* MACOS */}
                                    {platforms[previewIndex] === 'MACOS' && (
                                        <div className="fade-in" style={{
                                            width: '340px',
                                            background: 'rgba(40, 40, 40, 0.9)',
                                            backdropFilter: 'blur(20px)',
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                                            overflow: 'hidden',
                                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            <div style={{ padding: '10px 12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                                <div style={{ width: '36px', height: '36px', background: '#555', borderRadius: '8px', flexShrink: 0, overflow: 'hidden' }}>
                                                    <img
                                                        src={viewingCampaign.icon || '/icon.png'}
                                                        alt=""
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#555'; }}
                                                    />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#fff' }}>{viewingCampaign.title}</span>
                                                        <span style={{ fontSize: '11px', color: '#aaa' }}>now</span>
                                                    </div>
                                                    <div style={{ fontSize: '13px', color: '#ddd', lineHeight: '1.3' }}>{viewingCampaign.body}</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Paginator Dots (Visual Indicator of Position) */}
                                <div style={{ marginTop: '2rem', display: 'flex', gap: '6px' }}>
                                    {platforms.map((p, i) => (
                                        <div key={p} style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: i === previewIndex ? 'var(--accent-neon)' : 'var(--border-subtle)',
                                            transition: 'background 0.3s ease'
                                        }} />
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig(prev => ({ ...prev, isOpen: false }))}
                onConfirm={modalConfig.onConfirm}
                title={modalConfig.title}
                message={modalConfig.message}
                confirmText={modalConfig.confirmText}
                isDestructive={modalConfig.isDestructive}
            />
        </div>
    );
}
