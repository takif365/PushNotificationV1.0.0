'use client';

import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'success', duration = 3000, onClose }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const timerIn = setTimeout(() => setIsVisible(true), 10);

        // Trigger exit and close
        const timerOut = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for transition
        }, duration);

        return () => {
            clearTimeout(timerIn);
            clearTimeout(timerOut);
        };
    }, [duration, onClose]);

    // Visual Styles based on type
    const styles = {
        success: {
            borderColor: 'var(--accent-neon, #00ffff)',
            color: '#fff',
            icon: '✓'
        },
        error: {
            borderColor: '#ef4444',
            color: '#fff',
            icon: '✕'
        }
    };

    const currentStyle = styles[type] || styles.success;

    return (
        <div style={{
            minWidth: '350px',
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${currentStyle.borderColor}`,
            borderRadius: '0px', // Sharper edges for industrial look
            padding: '1.25rem',
            boxShadow: `0 0 15px ${currentStyle.borderColor}66`, // Increased opacity for neon effect
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateX(0)' : 'translateX(50px)',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            pointerEvents: 'auto',
            zIndex: 9999
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: `${currentStyle.borderColor}15`, // Subtle bg
                color: currentStyle.borderColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '16px',
                boxShadow: `0 0 10px ${currentStyle.borderColor}40`
            }}>
                {currentStyle.icon}
            </div>
            <div>
                <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: currentStyle.borderColor, // Title matches border color
                    textShadow: `0 0 5px ${currentStyle.borderColor}40`
                }}>
                    {type === 'success' ? 'SUCCESS' : 'SYSTEM ERROR'}
                </p>
                <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.8rem',
                    color: '#ddd',
                    lineHeight: '1.4'
                }}>
                    {message}
                </p>
            </div>
        </div>
    );
}
