'use client';

import { useState, useEffect } from 'react';

export default function CORSChecker() {
    const [status, setStatus] = useState('checking');
    const [domain, setDomain] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        checkCORS();
    }, []);

    const checkCORS = async () => {
        try {
            const currentDomain = window.location.hostname;
            setDomain(currentDomain);

            // Test CORS by attempting to fetch from API
            const response = await fetch('/api/health', {
                method: 'GET',
                mode: 'cors'
            });

            if (response.ok) {
                setStatus('success');
                setMessage('CORS configured correctly');
            } else {
                setStatus('warning');
                setMessage('API accessible but response not ok');
            }
        } catch (error) {
            setStatus('error');
            setMessage(`CORS error: ${error.message}`);
        }
    };

    const getStatusColor = () => {
        switch (status) {
            case 'success': return '#00ffff';
            case 'warning': return '#f59e0b';
            case 'error': return '#ef4444';
            default: return '#666666';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'success': return '✓';
            case 'warning': return '⚠';
            case 'error': return '✗';
            default: return '...';
        }
    };

    return (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div
                    className="text-mono neon-glow"
                    style={{
                        fontSize: '1.5rem',
                        color: getStatusColor(),
                        textShadow: `0 0 10px ${getStatusColor()}33`
                    }}
                >
                    {getStatusIcon()}
                </div>
                <div style={{ flex: 1 }}>
                    <div className="form-label" style={{ marginBottom: '0.25rem' }}>
                        System Status
                    </div>
                    <div className="text-mono" style={{ fontSize: '0.875rem', color: getStatusColor() }}>
                        {message}
                    </div>
                    {domain && (
                        <div className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                            Domain: {domain}
                        </div>
                    )}
                </div>
                <button
                    onClick={checkCORS}
                    className="btn btn-ghost"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                >
                    Recheck
                </button>
            </div>
        </div>
    );
}
