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
                        {title}
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: '1.6' }}>
                        {message}
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <button
                        onClick={onClose}
                        style={{
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
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{
                            padding: '1rem',
                            background: isDestructive ? '#dc2626' : 'transparent',
                            border: isDestructive ? 'none' : '1px solid #00FFFF',
                            color: isDestructive ? '#fff' : '#00FFFF',
                            cursor: 'pointer',
                            textTransform: 'uppercase',
                            fontSize: '0.85rem',
                            fontWeight: 'bold',
                            letterSpacing: '0.05em',
                            boxShadow: isDestructive ? '0 0 15px rgba(220, 38, 38, 0.4)' : '0 0 10px rgba(0, 255, 255, 0.2)',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.boxShadow = isDestructive ? '0 0 25px rgba(220, 38, 38, 0.6)' : '0 0 20px rgba(0, 255, 255, 0.4)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            if (!isDestructive) {
                                e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)';
                            } else {
                                e.currentTarget.style.background = '#b91c1c';
                            }
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.boxShadow = isDestructive ? '0 0 15px rgba(220, 38, 38, 0.4)' : '0 0 10px rgba(0, 255, 255, 0.2)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            if (!isDestructive) {
                                e.currentTarget.style.background = 'transparent';
                            } else {
                                e.currentTarget.style.background = '#dc2626';
                            }
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.85);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-content {
                    background-color: #000;
                    border: 1px solid #00FFFF;
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
