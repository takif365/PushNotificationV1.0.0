'use client';

import styles from './page.module.css';
import Link from 'next/link';

export default function LandingPage() {
    return (
        <div className={styles.landingVoid}>
            <h1 className={styles.landingTitle}>
                Private Notification Infrastructure
            </h1>
            <p className={styles.landingSubtitle}>
                Authorized Personnel Only
            </p>

            <Link href="/auth/login" className={styles.btnTerminal}>
                [ ACCESS TERMINAL ]
            </Link>


            <footer className={styles.landingFooter}>
                © 2026 | Restricted Access | Powered By TakiLabs
            </footer>
        </div>
    );
}
