'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import ConfirmationModal from '@/app/components/ConfirmationModal';

export default function DomainsPage() {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusChecks, setStatusChecks] = useState({});
    const [subscriberCounts, setSubscriberCounts] = useState({});
    const [deleteModal, setDeleteModal] = useState({ open: false, domainId: null, domainName: null });

    useEffect(() => {
        loadDomains();
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
                const domainsList = data.domains || [];
                setDomains(domainsList);

                // Fetch subscriber counts for each domain
                fetchSubscriberCounts(token, domainsList);
            }
        } catch (error) {
            console.error('Failed to load domains:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSubscriberCounts = async (token, domainsList) => {
        try {
            const tokensRes = await fetch('/api/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (tokensRes.ok) {
                const tokensData = await tokensRes.json();
                const tokens = tokensData.tokens || [];

                // Count subscribers per domain
                const counts = {};
                domainsList.forEach(domain => {
                    counts[domain.id] = tokens.filter(t => t.domainId === domain.id).length;
                });

                setSubscriberCounts(counts);
            }
        } catch (error) {
            console.error('Failed to fetch subscriber counts:', error);
        }
    };

    const checkDomainStatus = async (domain) => {
        // Set checking state
        setStatusChecks(prev => ({
            ...prev,
            [domain.id]: { status: 'checking' }
        }));

        try {
            const domainUrl = domain.domain || domain.name;

            // Try both http and https
            const protocols = ['https', 'http'];
            let loaderFound = false;
            let swFound = false;

            for (const protocol of protocols) {
                if (!loaderFound) {
                    try {
                        const loaderRes = await fetch(`${protocol}://${domainUrl}/loader.js`, {
                            method: 'HEAD',
                            mode: 'no-cors'
                        });
                        loaderFound = true;
                    } catch (e) {
                        // Continue to next protocol
                    }
                }

                if (!swFound) {
                    try {
                        const swRes = await fetch(`${protocol}://${domainUrl}/sw.js`, {
                            method: 'HEAD',
                            mode: 'no-cors'
                        });
                        swFound = true;
                    } catch (e) {
                        // Continue to next protocol
                    }
                }

                if (loaderFound && swFound) break;
            }

            setStatusChecks(prev => ({
                ...prev,
                [domain.id]: {
                    loader: loaderFound,
                    sw: swFound,
                    status: (loaderFound && swFound) ? 'connected' : 'waiting'
                }
            }));
        } catch (error) {
            setStatusChecks(prev => ({
                ...prev,
                [domain.id]: { status: 'unknown' }
            }));
        }
    };

    const handleDeleteClick = (domainId, domainName) => {
        setDeleteModal({ open: true, domainId, domainName });
    };

    const confirmDelete = async () => {
        const { domainId } = deleteModal;
        if (!domainId) return;

        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch(`/api/domains/${domainId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                // Remove from local state
                setDomains(domains.filter(d => d.id !== domainId));
                setDeleteModal({ open: false, domainId: null, domainName: null });
            } else {
                alert('Failed to delete domain');
            }
        } catch (error) {
            console.error('Failed to delete domain:', error);
            alert('Failed to delete domain');
        }
    };

    const cancelDelete = () => {
        setDeleteModal({ open: false, domainId: null, domainName: null });
    };

    // Show loading state
    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px', margin: '0 auto 1rem' }}></div>
                    <p className="text-dim">Loading domains...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-lg" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.5rem' }}>Domains</h1>
                    <p className="text-secondary">
                        Manage your connected domains
                    </p>
                </div>
                <Link href="/dashboard/domains/new" className="btn btn-terminal" style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
                    ADD DOMAIN
                </Link>
            </div>

            <div className="table-container">
                {domains.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: 'var(--bg-dark)',
                            border: '2px solid var(--border-subtle)',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                        }}>
                            <svg style={{ width: '32px', height: '32px', color: 'var(--text-dim)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                        </div>
                        <h2 className="text-dim" style={{ fontSize: '0.875rem', fontWeight: '400', marginBottom: '0.5rem' }}>
                            Connect your first domain to get started
                        </h2>
                    </div>
                ) : (
                    <table className="audience-table cyberglow-border">
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Domain ID</th>
                                <th>Created At</th>
                                <th style={{ textAlign: 'center' }}>Subscribers</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {domains.map((domain, index) => (
                                <tr key={domain.id}>
                                    <td>
                                        <span style={{ fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                            {(domain.domain || domain.name).toLowerCase()}
                                        </span>
                                    </td>
                                    <td>
                                        <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                            {domain.id}
                                        </code>
                                    </td>
                                    <td>
                                        {domain.createdAt ? new Date(domain.createdAt).toLocaleString('en-US', {
                                            year: 'numeric', month: '2-digit', day: '2-digit',
                                            hour: '2-digit', minute: '2-digit', hour12: false
                                        }).replace(',', '') : 'N/A'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ color: 'var(--accent-neon)', fontWeight: 'bold' }}>
                                            {subscriberCounts[domain.id] !== undefined ? subscriberCounts[domain.id] : '...'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <button
                                                onClick={() => handleDeleteClick(domain.id, domain.domain || domain.name)}
                                                className="btn-danger"
                                                title="Delete domain"
                                                style={{
                                                    background: 'transparent',
                                                    border: '1px solid #FF0000',
                                                    cursor: 'pointer',
                                                    padding: '6px 16px',
                                                    color: '#FF0000',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 'bold',
                                                    fontFamily: 'monospace',
                                                    letterSpacing: '0.05em',
                                                    boxShadow: '0 0 8px rgba(255, 0, 0, 0.3)',
                                                    transition: 'all 0.2s',
                                                    textTransform: 'uppercase'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
                                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.6)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = 'transparent';
                                                    e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.3)';
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
                )}
            </div>

            {/* Custom Delete Modal */}
            {deleteModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content fade-in-scale">
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{
                                color: '#00FFFF',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                fontSize: '1.25rem',
                                marginBottom: '1rem',
                                fontWeight: 'bold'
                            }}>
                                DELETE DOMAIN
                            </h2>
                            <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                                Are you sure you want to remove this domain permanently?<br />
                                <span style={{ color: '#fff' }}>{deleteModal.domainName}</span>
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <button onClick={cancelDelete} style={{
                                padding: '1rem',
                                background: 'transparent',
                                border: '1px solid #333',
                                color: '#666',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                letterSpacing: '0.05em',
                                transition: 'all 0.2s'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#00FFFF';
                                    e.currentTarget.style.color = '#00FFFF';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = '#333';
                                    e.currentTarget.style.color = '#666';
                                }}
                            >
                                CANCEL
                            </button>
                            <button onClick={confirmDelete} style={{
                                padding: '1rem',
                                background: '#FF0000',
                                border: 'none',
                                color: '#000',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                letterSpacing: '0.05em',
                                boxShadow: '0 0 15px rgba(255, 0, 0, 0.4)',
                                transition: 'all 0.2s'
                            }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 0, 0, 0.6)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.4)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                }}
                            >
                                YES, DELETE
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* Moved Border to Table directly */
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
                    border-collapse: collapse; /* The Magic Fix */
                    font-size: 0.85rem;
                    background-color: rgba(0, 0, 0, 0.8);
                }

                th, td {
                    border: 1px solid rgba(0, 255, 255, 0.3); /* Subtle Neon Grid */
                    padding: 12px;
                    text-align: left;
                    white-space: nowrap;
                    background-color: transparent;
                    vertical-align: middle;
                }

                th {
                    background-color: transparent; /* Pure Transparency */
                    color: #ffffff; /* Bright White */
                    font-family: 'Courier New', monospace;
                    text-transform: uppercase;
                    font-weight: bold;
                    letter-spacing: 0.05em;
                    border-bottom: 1px solid rgba(0, 255, 255, 0.5); /* Slightly stronger header border */
                }

                tr:hover td {
                    background-color: rgba(0, 255, 255, 0.03);
                }

                .icon-btn:hover {
                    opacity: 0.8;
                }

                /* DELETE MODAL STYLES */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.85); /* Darker overlay */
                    backdrop-filter: blur(8px); /* Stronger Blur */
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-content {
                    background-color: #000;
                    border: 1px solid #00FFFF; /* Solid Cyan Border (Unified) */
                    box-shadow: 0 0 40px rgba(0, 255, 255, 0.1);
                    padding: 3rem;
                    width: 100%;
                    max-width: 500px;
                    position: relative;
                }

                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                .fade-in-scale {
                    animation: fadeInScale 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}
