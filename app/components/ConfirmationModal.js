'use client';

/**
 * Reusable Confirmation Modal with Cyberpunk Aesthetic
 */
export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title = "CONFIRMATION REQUIRED",
    message = "Are you sure you want to proceed?",
    confirmText = "YES, EXECUTE",
    cancelText = "CANCEL",
    isDestructive = false
}) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                backdropFilter: 'blur(4px)',
                zIndex: 2000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'fadeIn 0.2s ease-out'
            }}
            onClick={onClose}
        >
            <div
                style={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid var(--accent-neon)',
                    boxShadow: '0 0 30px rgba(0, 255, 255, 0.1)',
                    width: '400px',
                    maxWidth: '90vw',
                    padding: '2rem',
                    position: 'relative',
                    animation: 'scaleUp 0.2s ease-out'
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <h3 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    fontWeight: '400',
                    letterSpacing: '0.1em',
                    color: 'var(--accent-neon)',
                    textTransform: 'uppercase',
                    textAlign: 'center'
                }}>
                    {title}
                </h3>

                {/* Body */}
                <p style={{
                    color: 'var(--text-dim)',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    marginBottom: '2rem',
                    lineHeight: '1.5'
                }}>
                    {message}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            flex: 1,
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-dim)',
                            fontSize: '0.75rem',
                            padding: '0.75rem'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="btn"
                        style={{
                            flex: 1,
                            backgroundColor: isDestructive ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-neon)',
                            border: isDestructive ? '1px solid #ef4444' : 'none',
                            color: isDestructive ? '#ef4444' : '#000',
                            fontWeight: '600',
                            fontSize: '0.75rem',
                            padding: '0.75rem',
                            boxShadow: isDestructive ? 'none' : '0 0 10px var(--accent-neon-glow)'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>

                <style jsx>{`
                    @keyframes fadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes scaleUp {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>
            </div>
        </div>
    );
}
