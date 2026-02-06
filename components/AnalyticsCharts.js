'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    LineController
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Title,
    Tooltip,
    Filler
);

const LineChartCard = ({ title, data, labels, color, loading }) => {
    // Generate gradient for fill
    const getGradient = (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, `${color}40`); // 25% opacity
        gradient.addColorStop(1, `${color}00`); // 0% opacity
        return gradient;
    };

    const chartData = {
        labels: labels || [],
        datasets: [
            {
                label: title,
                data: data || [],
                borderColor: color,
                backgroundColor: (context) => getGradient(context),
                borderWidth: 1, /* Sleek/Thin Line */
                pointBackgroundColor: '#000',
                pointBorderColor: color,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointRadius: 3,
                pointHoverRadius: 5,
                fill: true,
                tension: 0.4, // Smooth curves
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                titleColor: color,
                bodyColor: '#fff',
                titleFont: { family: "'JetBrains Mono', monospace", size: 12 },
                bodyFont: { family: "'JetBrains Mono', monospace", size: 12 },
                borderColor: '#333',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: (items) => {
                        // Format date nicely
                        const date = new Date(items[0].label);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    },
                    label: (context) => {
                        return `${context.parsed.y} ${title.split(' ').pop()}`; // e.g. "120 CLICKS"
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)', // Slightly more visible grid
                    drawBorder: false
                },
                ticks: {
                    color: '#ffffff', // Pure White
                    font: { family: "'JetBrains Mono', monospace", size: 10 },
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 6
                },
                border: { display: false }
            },
            y: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false
                },
                ticks: {
                    color: '#ffffff', // Pure White
                    font: { family: "'JetBrains Mono', monospace", size: 10 },
                    maxTicksLimit: 5
                },
                border: { display: false },
                beginAtZero: true
            }
        }
    };

    return (
        <div className="chart-card">
            <style jsx>{`
                .chart-card {
                    /* Minimal Dark Neon Style */
                    background: rgba(0, 255, 240, 0.02);
                    border: 0.5px solid #00FFF0; /* Thinned Neon Border */
                    box-shadow: 0 0 10px rgba(0, 255, 240, 0.1);
                    border-radius: var(--radius-md);
                    padding: 1rem;
                    height: 200px; /* Reduced Height */
                    display: flex;
                    flex-direction: column;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                
                .chart-card:hover {
                    box-shadow: 0 0 20px rgba(0, 255, 240, 0.25);
                    background: rgba(0, 255, 240, 0.05);
                }

                .chart-title {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #ffffff;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .chart-body {
                    flex: 1;
                    width: 100%;
                    min-height: 0;
                    position: relative;
                }
                
                /* Loading State */
                .loading-pulse {
                    width: 100%;
                    height: 100%;
                    background: rgba(255,255,255,0.02);
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `}</style>

            <div className="chart-title">
                {title}
            </div>

            <div className="chart-body">
                {loading ? (
                    <div className="loading-pulse"></div>
                ) : (
                    <Chart type="line" data={chartData} options={options} />
                )}
            </div>
        </div>
    );
};

export default function AnalyticsCharts() {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const auth = getAuth(app);
                let token;
                if (auth.currentUser) {
                    token = await auth.currentUser.getIdToken();
                }

                const res = await fetch('/api/analytics/history', {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });

                if (res.ok) {
                    const data = await res.json();
                    setHistory(data);
                }
            } catch (error) {
                console.error("Failed to load history", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const labels = history?.labels || [];

    // Color Mapping - Unified Neon Cyan
    const cyanColor = '#00FFF0';
    const colorMap = {
        clicks: cyanColor,
        reach: cyanColor,
        subs: cyanColor,
        newSubs: cyanColor
    };

    return (
        <div className="charts-container-full">
            <div className="grid-container">
                <style jsx>{`
                    .grid-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 1rem;
                        margin: 0 auto; /* Center Align */
                        margin-top: 0.5rem;
                        width: 100%;
                        max-width: 85%; /* ~25% reduction in overall width */
                    }
                    
                    @media (max-width: 1024px) {
                        .grid-container {
                            grid-template-columns: 1fr;
                            max-width: 100%; /* Full width on mobile */
                        }
                    }
                `}</style>

                {/* Chart 1: Total Clicks */}
                <LineChartCard
                    title="TOTAL CLICKS"
                    labels={labels}
                    data={history?.datasets?.totalClicks}
                    color={colorMap.clicks}
                    loading={loading}
                />

                {/* Chart 2: Total Reach */}
                <LineChartCard
                    title="TOTAL REACH"
                    labels={labels}
                    data={history?.datasets?.totalReach}
                    color={colorMap.reach}
                    loading={loading}
                />

                {/* Chart 3: Total Subscribers */}
                <LineChartCard
                    title="TOTAL SUBSCRIBERS"
                    labels={labels}
                    data={history?.datasets?.totalSubscribers}
                    color={colorMap.subs}
                    loading={loading}
                />

                {/* Chart 4: New Subs (24h/Daily) */}
                <LineChartCard
                    title="NEW SUBS (DAILY)"
                    labels={labels}
                    data={history?.datasets?.newSubscribers}
                    color={colorMap.newSubs}
                    loading={loading}
                />
            </div>
        </div>
    );
}
