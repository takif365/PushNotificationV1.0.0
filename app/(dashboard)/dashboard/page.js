'use client';

import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';
import Link from 'next/link';
import CORSChecker from '@/components/CORSChecker';

import DashboardStats from '@/components/DashboardStats';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        totalDomains: 0,
        totalSubscribers: 0,
        newSubscribers24h: 0,
        clickRate: 0,
        successRate: 0,
        totalClicks: 0,
        totalReach: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
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
            console.error('Failed to load stats:', error);
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
                    Command Center
                </h1>
                <p className="text-dim" style={{ fontSize: '0.875rem' }}>
                    System Overview
                </p>
            </div>

            {/* Stats Grid - Using New Intel Component */}
            <DashboardStats stats={stats} loading={loading} />

            {/* Operations Section REMOVED as requested */}

            {/* Keeping the space tidy / Compact Layout */}
        </div>
    );
}
