'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

export default function AudiencePage() {
    const [tokens, setTokens] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDomain, setFilterDomain] = useState('all');
    const [domains, setDomains] = useState([]);

    // ... (rest of imports/hooks)


    useEffect(() => {
        loadTokens();
        loadDomains();
    }, []);

    const loadTokens = async () => {
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/tokens', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Audience] Tokens received:', data.tokens);
                console.log('[Audience] First token sample:', data.tokens[0]);
                setTokens(data.tokens || []);
            }
        } catch (error) {
            console.error('Failed to load tokens:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadDomains = async () => {
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/domains', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                console.log('[Audience] Domains received:', data.domains);
                setDomains(data.domains || []);
            }
        } catch (error) {
            console.error('Failed to load domains:', error);
        }
    };

    const filteredTokens = tokens.filter(token => {
        const matchesSearch = token.domainId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.token?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDomain = filterDomain === 'all' || token.domainId === filterDomain;
        return matchesSearch && matchesDomain;
    });

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px', margin: '0 auto 1rem' }}></div>
                    <p className="text-secondary">Loading audience...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.5rem' }}>Audience</h1>
                <p className="text-secondary">Manage your push notification subscribers</p>
            </div>

            {/* Filters removed as requested */}

            {/* Export Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    onClick={() => {
                        import('xlsx').then(XLSX => {
                            const headers = ["Country", "Device", "IP Address", "User Agent", "Domain", "Subscribed"];
                            const rows = filteredTokens.map(t => [
                                t.country || "Unknown",
                                t.platform || "web",
                                t.ip || "N/A",
                                t.ua || "Unknown",
                                domains.find(d => d.id === t.domainId)?.name || 'Unknown',
                                new Date(t.createdAt).toLocaleString('en-US', {
                                    year: 'numeric', month: '2-digit', day: '2-digit',
                                    hour: '2-digit', minute: '2-digit', hour12: false
                                }).replace(',', '')
                            ]);

                            const wb = XLSX.utils.book_new();
                            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
                            XLSX.utils.book_append_sheet(wb, ws, "Subscribers");
                            XLSX.writeFile(wb, "subscribers_data.xlsx");
                        });
                    }}
                    className="btn-export"
                    style={{
                        background: 'transparent',
                        border: '1px solid #00FFFF',
                        color: '#00FFFF',
                        padding: '0.6rem 1.2rem',
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        borderRadius: '2px', /* Sharper corners for standard button feel */
                        boxShadow: '0 0 5px rgba(0, 255, 255, 0.2)', /* Initial subtle glow */
                        textTransform: 'uppercase'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.6)';
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.boxShadow = '0 0 5px rgba(0, 255, 255, 0.2)';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    EXPORT EXCEL
                </button>
            </div>

            <div className="table-container">
                {filteredTokens.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '3rem', border: 'none', background: 'transparent' }}>
                        <div style={{
                            width: '64px',
                            height: '64px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '1rem'
                        }}>
                            <svg style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No subscribers yet</h3>
                        <p className="text-secondary">Subscribers will appear here once they opt in to notifications</p>
                    </div>
                ) : (
                    <table className="audience-table cyberglow-border">
                        <thead>
                            <tr>
                                <th>Country</th>
                                <th>Device</th>
                                <th>IP Address</th>
                                <th>User Agent</th>
                                <th>Domain</th>
                                <th style={{ textAlign: 'left' }}>Subscribed</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTokens.map((token, index) => {
                                // Get country flag from country code
                                const getFlag = (code) => {
                                    if (!code || code === 'XX') return '🌐';
                                    return String.fromCodePoint(...[...code.toUpperCase()].map(c => 127397 + c.charCodeAt(0)));
                                };

                                // Get platform icon
                                const getPlatformIcon = (platform) => {
                                    const platformLower = (platform || '').toLowerCase();
                                    if (platformLower === 'android') {
                                        return (
                                            <svg style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.2C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z" />
                                            </svg>
                                        );
                                    } else if (platformLower === 'ios') {
                                        return (
                                            <svg style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M17.05,20.28c-0.98,0.95-2.05,0.8-3.08,0.35c-1.09-0.46-2.09-0.48-3.24,0c-1.44,0.62-2.2,0.44-3.06-0.35 C2.79,15.25,3.51,7.59,9.05,7.31c1.35,0.07,2.29,0.74,3.08,0.8c1.18-0.24,2.31-0.93,3.57-0.84c1.51,0.12,2.65,0.72,3.4,1.8 c-3.12,1.87-2.38,5.98,0.48,7.13c-0.57,1.5-1.31,3-2.46,4.03C17.18,20.28,17.17,20.28,17.05,20.28z M12.03,7.25 c-0.15-2.23,1.66-4.07,3.74-4.25c0.29,2.58-2.34,4.5-3.74,4.25z" />
                                            </svg>
                                        );
                                    } else {
                                        return (
                                            <svg style={{ width: '20px', height: '20px', verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M11,19.93C7.05,19.44,4,16.08,4,12 c0-0.38,0.04-0.75,0.09-1.1L8,14.82V16c0,1.1,0.9,2,2,2V19.93z M17.9,17.39c-0.26-0.81-1-1.39-1.9-1.39h-1v-3c0-0.55-0.45-1-1-1H8 v-2h2c0.55,0,1-0.45,1-1V7h2c1.1,0,2-0.9,2-2v-0.41C17.92,5.77,20,8.65,20,12C20,14.08,19.2,15.97,17.9,17.39z" />
                                            </svg>
                                        );
                                    }
                                };

                                const domainName = domains.find(d => d.id === token.domainId)?.name || 'Unknown';

                                return (
                                    <tr key={index}>
                                        <td>
                                            <span style={{ fontSize: '1.5rem', marginRight: '0.5rem', verticalAlign: 'middle' }}>{getFlag(token.country_code)}</span>
                                            <span style={{ verticalAlign: 'middle' }}>{token.country || 'Unknown'}</span>
                                        </td>
                                        <td>
                                            <span style={{ color: 'var(--accent-neon)', marginRight: '0.5rem' }}>{getPlatformIcon(token.platform)}</span>
                                            <span style={{ textTransform: 'capitalize', verticalAlign: 'middle' }}>{token.platform || 'web'}</span>
                                        </td>
                                        <td>
                                            <code style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                {token.ip || 'N/A'}
                                            </code>
                                        </td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <code style={{ fontFamily: 'monospace', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '240px' }} title={token.ua}>
                                                    {token.ua || 'Unknown'}
                                                </code>
                                                <CopyButton text={token.ua} />
                                            </div>
                                        </td>
                                        <td>{domainName}</td>
                                        <td style={{ textAlign: 'left' }}>
                                            {new Date(token.createdAt).toLocaleString('en-US', {
                                                year: 'numeric', month: '2-digit', day: '2-digit',
                                                hour: '2-digit', minute: '2-digit', hour12: false
                                            })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}

                <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Showing {filteredTokens.length} of {tokens.length} subscribers
                </div>
            </div>

            <style jsx>{`
                /* Moved Border to Table directly */
                .cyberglow-border {
                    border: 1px solid rgba(0, 255, 255, 0.3) !important;
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
                    /* No extra padding, tight fit */
                }

                .table-container {
                    width: 100%;
                    overflow-x: auto;
                }
                
                table.audience-table {
                    width: 100%;
                    border-collapse: collapse; /* THE MAGIC FIX: Eliminates gaps */
                    font-size: 0.85rem;
                    background-color: rgba(0, 0, 0, 0.8); /* Background on table itself */
                }

                th, td {
                    border: 1px solid rgba(0, 255, 255, 0.3); /* Subtle Neon Grid */
                    padding: 12px;
                    text-align: left;
                    white-space: nowrap; /* Prevent wrapping */
                    background-color: transparent;
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
                    font-family: 'Courier New', monospace;
                    text-transform: uppercase;
                    font-weight: bold;
                    letter-spacing: 0.05em;
                    border-bottom: 2px solid #555;
                }

                 /* Only hover effect on cells, keeping the border tight */
                tr:hover td {
                    background-color: rgba(0, 255, 255, 0.03);
                }
            `}</style>
        </div>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text || '');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            title="Copy User Agent"
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                marginLeft: '8px',
                padding: '4px',
                color: copied ? '#00FF00' : '#00FFFF', /* Green if copied, else Cyan */
                flexShrink: 0,
                transition: 'color 0.2s',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            {copied ? (
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
            ) : (
                <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
            )}
        </button>
    );
}
