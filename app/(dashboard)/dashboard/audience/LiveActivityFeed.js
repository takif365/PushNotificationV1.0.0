'use client';

import React from 'react';

export default function LiveActivityFeed({ tokens = [] }) {
    const message = "[ ACCESS GRANTED ] — SYSTEM ONLINE — TAKILABS PRIVATE INFRASTRUCTURE — GLOBAL AUDIENCE TRACKING ACTIVE — MONITORING LIVE NODES...";

    return (
        <div style={{
            width: '100%',
            overflow: 'hidden',
            backgroundColor: '#0a0a0a',
            borderBottom: '1px solid var(--border-subtle)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '0.65rem 0',
            position: 'relative',
            zIndex: 10
        }}>
            <div className="ticker-wrapper">
                <div className="ticker-track">
                    <span className="ticker-item">{message}</span>
                    <span className="ticker-item">{message}</span>
                    <span className="ticker-item">{message}</span>
                </div>
            </div>

            <style jsx>{`
                .ticker-wrapper {
                    width: 100%;
                    overflow: hidden;
                }
                .ticker-track {
                    display: flex;
                    white-space: nowrap;
                    animation: scroll-rtl 40s linear infinite;
                }
                .ticker-item {
                    font-family: var(--font-mono);
                    font-size: 0.7rem;
                    color: var(--accent-neon);
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    text-shadow: 0 0 10px var(--accent-neon-glow), 0 0 20px var(--accent-neon-glow);
                    padding-right: 3rem;
                    display: inline-block;
                }
                @keyframes scroll-rtl {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }
                
                @media (max-width: 768px) {
                    .ticker-item {
                        font-size: 0.65rem;
                        letter-spacing: 0.1em;
                    }
                }
            `}</style>
        </div>
    );
}
