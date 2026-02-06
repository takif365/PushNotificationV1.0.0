'use client';

import { getAuth, signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { app } from '@/lib/firebase';

export default function TopBar({ user }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            const auth = getAuth(app);
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>
                </div>

                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </button>

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
