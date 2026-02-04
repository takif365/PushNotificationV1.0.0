'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';


import DashboardStats from '@/components/DashboardStats';
import AnalyticsCharts from '@/components/AnalyticsCharts';

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        totalDomains: 0,
        totalSubscribers: 0,
        totalCampaigns: 0,
        deliveredNotifications: 0,
        clickRate: 0,
        totalClicks: 0,
        totalReach: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        try {
            const auth = getAuth(app);
            const token = await auth.currentUser?.getIdToken();

            const res = await fetch('/api/analytics/overview', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fade-in">
            {/* Header */}
            <div className="mb-md">
                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: '200',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    marginBottom: '0.5rem'
                }}>
                    Analytics
                </h1>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    Performance Metrics
                </p>
            </div>

            {/* Stats Grid */}
            <DashboardStats stats={stats} loading={loading} />

            {/* Charts Section */}
            <div className="fade-in">
                <AnalyticsCharts />
            </div>
        </div>
    );
}
