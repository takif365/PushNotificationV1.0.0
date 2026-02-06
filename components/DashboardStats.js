'use client';

export default function DashboardStats({ stats, loading }) {
    if (loading) {
        return (
            <div className="stats-grid mb-lg">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="card-stat pulse" style={{
                        height: '120px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '0'
                    }}></div>
                ))}
            </div>
        );
    }

    const statItems = [
        {
            label: 'TOTAL CLICKS',
            value: stats.totalClicks || 0,
            unit: '',
            color: '#00FFF0' // Cyan
        },
        {
            label: 'TOTAL REACH',
            value: stats.totalReach || 0,
            unit: '',
            color: '#00FFF0' // Cyan
        },
        {
            label: 'TOTAL SUBSCRIBERS',
            value: stats.totalSubscribers || 0,
            unit: '',
            color: '#00FFF0' // Cyan
        },
        {
            label: 'NEW SUBS (24H)',
            value: `+${stats.newSubscribers24h || 0}`,
            unit: '',
            highlight: true,
            color: '#00FFF0' // Cyan
        }
    ];

    return (
        <div className="stats-container-full">
            <div className="stats-grid mb-lg" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '1rem', /* Tight Gap (gap-4) */
                marginBottom: '1rem' /* Reduced Margin */
            }}>
                <style jsx>{`
                    .intel-card {
                        /* Minimal Dark Neon Style */
                        background: rgba(0, 255, 240, 0.1); /* Light Neon Tint */
                        border: 0.5px solid #00FFF0; /* Thinned Neon Border */
                        box-shadow: 0 0 10px rgba(0, 255, 240, 0.15);
                        padding: 1rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        transition: all 0.3s ease;
                        text-align: center;
                        border-radius: var(--radius-md);
                        min-height: 120px;
                        width: 100%;
                    }
                    
                    /* Responsive Grid */
                    @media (max-width: 1024px) {
                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr) !important;
                        }
                    }
                    @media (max-width: 640px) {
                         .stats-grid {
                            grid-template-columns: 1fr !important;
                        }
                    }
                
                .intel-card:hover {
                    box-shadow: 0 0 20px rgba(0, 255, 240, 0.3);
                    background: rgba(0, 255, 240, 0.08);
                    transform: translateY(-2px);
                }

                .intel-label {
                    font-family: 'Courier New', monospace;
                    font-size: 0.75rem;
                    color: #FFFFFF;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.25rem;
                    text-transform: uppercase;
                    z-index: 1;
                    opacity: 0.9;
                }

                .intel-value {
                    font-family: 'Courier New', monospace;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #00FFF0; /* Neon Cyan Update */
                    z-index: 1;
                    text-shadow: 0 0 10px rgba(0, 255, 240, 0.5);
                }

                @media (max-width: 768px) {
                    .intel-value {
                        font-size: 1.75rem;
                    }
                }
            `}</style>

                {statItems.map((item, index) => (
                    <div
                        key={index}
                        className="intel-card fade-in"
                        style={{
                            animationDelay: `${index * 0.1}s`
                        }}
                    >
                        <div className="intel-label">
                            {item.label}
                        </div>
                        <div className="intel-value">
                            {item.value}{item.unit}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
