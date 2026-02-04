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
            unit: ''
        },
        {
            label: 'TOTAL REACH',
            value: stats.totalReach || 0,
            unit: ''
        },
        {
            label: 'TOTAL SUBSCRIBERS',
            value: stats.totalSubscribers || 0,
            unit: ''
        },
        {
            label: 'NEW SUBS (24H)',
            value: `+${stats.newSubscribers24h || 0}`,
            unit: '',
            highlight: true
        }
    ];

    return (
        <div className="stats-grid mb-lg" style={{ gap: '1rem' }}>
            <style jsx>{`
                .intel-card {
                    background: rgba(0, 0, 0, 0.8);
                    border: 1px solid var(--accent-neon);
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;    /* Perfect horizontal centering */
                    justify-content: center;  /* Perfect vertical centering */
                    position: relative;
                    transition: transform 0.2s, box-shadow 0.2s;
                    text-align: center;
                }
                
                .intel-card:hover {
                    box-shadow: 0 0 15px rgba(0, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .intel-label {
                    font-family: 'Courier New', monospace;
                    font-size: 0.75rem;
                    color: #ffffff;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    margin-bottom: 0.5rem;
                    text-transform: uppercase;
                }

                .intel-value {
                    font-family: 'Courier New', monospace;
                    font-size: 2rem;
                    font-weight: 700;
                    color: #fff;
                    /* Glow only on the numbers */
                    text-shadow: 0 0 10px rgba(0, 255, 255, 0.6);
                }

                /* Mobile Adjustment */
                @media (max-width: 768px) {
                    .intel-value {
                        font-size: 1.75rem;
                    }
                }
            `}</style>

            {statItems.map((item, index) => (
                <div key={index} className="intel-card fade-in" style={{ animationDelay: `${index * 0.1}s` }}>
                    <div className="intel-label">{item.label}</div>
                    <div className="intel-value">
                        {item.value}{item.unit}
                    </div>
                </div>
            ))}
        </div>
    );
}
