(function () {
    // PNS - Standalone Loader v10.0 (Multi-tenancy + Token Rotation)
    // PNS - Standalone Loader v10.1 (Robust Script Detection)
    let scriptTag = document.currentScript;

    // Fallback: Try to find script by src if currentScript is null (common in some frameworks)
    if (!scriptTag) {
        scriptTag = document.querySelector('script[src*="loader.js"]');
    }

    const DOMAIN_ID = scriptTag?.dataset?.domainId || 'MISSING_DOMAIN';
    const USER_ID = scriptTag?.dataset?.userId || 'MISSING_USER';

    // Log error but DO NOT RETURN early, to allow manual trigger to appear for debugging
    if (DOMAIN_ID === 'MISSING_DOMAIN' || USER_ID === 'MISSING_USER') {
        console.warn('[PNS] Warning: Missing domainId or userId. UI will still mount for debugging.');
    }

    const KEY = 'pns_user_interacted';
    const TOKEN_KEY = 'pns_token';
    const isDebug = new URLSearchParams(window.location.search).get('debug') === 'true';

    // CLEANUP: Force Unregister old Service Workers on every load for this strict fix
    if (navigator.serviceWorker) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            for (let registration of registrations) {
                registration.unregister();
            }
            console.log('[PNS] Strict Cleanup: Any existing SW unregistered to force new subscription');
        });
    }

    // FIREBASE CONFIG
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyB0grieksKtM28Q8sDqRJtIlCiVOa4O2TI",
        authDomain: "{{NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}}",
        projectId: "{{NEXT_PUBLIC_FIREBASE_PROJECT_ID}}",
        storageBucket: "{{NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}}",
        messagingSenderId: "{{NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}}",
        appId: "{{NEXT_PUBLIC_FIREBASE_APP_ID}}",
        vapidKey: "{{NEXT_PUBLIC_FIREBASE_VAPID_KEY}}"
    };

    const CONFIG = {
        title: "Stay Updated",
        subtitle: "Enable notifications to receive real-time alerts and important system updates.",
        btnText: "Enable Now",
        brandText: "Powered by TakiLabs",
        startDelay: 3000, // 3 Seconds Delay as requested
    };

    function getPlatform() {
        const ua = navigator.userAgent.toLowerCase();
        if (ua.indexOf("android") > -1) return "android";
        if (ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1 || ua.indexOf("ipod") > -1) return "ios";
        return "web";
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function initFirebase() {
        if (typeof firebase === 'undefined') {
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
            await loadScript("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(FIREBASE_CONFIG);
        }
        return firebase.messaging();
    }

    // ============================================================================
    // VISITOR DATA COLLECTION
    // ============================================================================

    async function collectVisitorData() {
        try {
            // Use server-side API to avoid CORS and ad-blocker issues
            const baseUrl = window.location.origin.includes('localhost')
                ? 'http://localhost:3000'
                : '{{NEXT_PUBLIC_APP_URL}}';

            const response = await fetch(`${baseUrl}/api/visitor-info`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            if (response.ok) {
                const visitorData = await response.json();
                console.log('[PNS] Visitor data collected from server:', visitorData);
                return visitorData;
            } else {
                throw new Error('Server API failed');
            }
        } catch (err) {
            console.error('[PNS] Failed to collect visitor data:', err);
            // Return minimal data if API fails
            return {
                ip: 'unknown',
                country: 'Unknown',
                country_code: 'XX',
                ua: navigator.userAgent,
                lang: navigator.language
            };
        }
    }

    // ============================================================================
    // TOKEN MANAGEMENT FUNCTIONS
    // ============================================================================

    async function deleteOldToken(oldToken) {
        // Obsolete: We don't need to delete from client, server handles invalid tokens or we just let them expire.
        // If strict deletion is needed, add an endpoint: /api/unsubscribe
        console.log('[PNS] Old token retired locally.');
    }

    async function saveToken(token, metadata) {
        const { domainId, platform, visitorData } = metadata;

        const baseUrl = window.location.origin.includes('localhost')
            ? 'http://localhost:3000'
            : '{{NEXT_PUBLIC_APP_URL}}';

        try {
            const res = await fetch(`${baseUrl}/api/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    domainId,
                    platform,
                    visitorData
                })
            });

            if (!res.ok) throw new Error('Subscription API failed');

            console.log('[PNS] ✅ Token secure subscription complete');
        } catch (err) {
            console.error('[PNS] Failed to save token:', err);
        }
    }

    async function updateTokenLastActive(token) {
        // Optional: We can implement a keep-alive endpoint later
        // For now, we rely on subscription for initial capture.
        console.log('[PNS] Token active.');
    }

    async function handleToken(messaging, registration) {
        const platform = getPlatform();

        // Collect visitor data (with fallback)
        console.log('[PNS] Collecting visitor data...');
        const visitorData = await collectVisitorData();
        console.log('[PNS] Visitor data collected:', visitorData);

        // 1. Get current FCM token
        const newToken = await messaging.getToken({
            vapidKey: FIREBASE_CONFIG.vapidKey,
            serviceWorkerRegistration: registration
        });

        if (!newToken) {
            console.error('[PNS] Failed to get FCM token');
            return;
        }

        // 2. Check for stored token (Token Rotation Detection)
        const storedToken = localStorage.getItem(TOKEN_KEY);

        if (storedToken && storedToken !== newToken) {
            // 🔄 TOKEN ROTATION DETECTED!
            console.log('[PNS] 🔄 Token rotation detected');
            console.log(`[PNS] Old: ${storedToken.substring(0, 20)}...`);
            console.log(`[PNS] New: ${newToken.substring(0, 20)}...`);

            // 3. Delete old token from Firestore
            await deleteOldToken(storedToken);

            // 4. Save new token with visitor data
            console.log('[PNS] Saving new token with visitor data...');
            await saveToken(newToken, { userId: USER_ID, domainId: DOMAIN_ID, platform, visitorData });

            // 5. Update localStorage
            localStorage.setItem(TOKEN_KEY, newToken);

            console.log('[PNS] ✅ Token rotation complete');
        } else if (!storedToken) {
            // First time - save token with visitor data
            console.log('[PNS] First time subscription, saving with visitor data...');
            await saveToken(newToken, { userId: USER_ID, domainId: DOMAIN_ID, platform, visitorData });
            localStorage.setItem(TOKEN_KEY, newToken);
        } else {
            // No rotation - just update lastActive
            console.log('[PNS] Token unchanged, updating lastActive');
            await updateTokenLastActive(newToken);
        }

        return newToken;
    }

    // ============================================================================
    // UI FUNCTIONS
    // ============================================================================

    function injectStyles() {
        if (document.getElementById('pns-styles')) return;
        const css = `
            :root {
                --pns-primary: #6366f1;
                --pns-bg: #ffffff;
                --pns-text: #111827;
                --pns-muted: #6b7280;
                --pns-font: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            @media (prefers-color-scheme: dark) {
                :root {
                    --pns-bg: #1f2937;
                    --pns-text: #f9fafb;
                    --pns-muted: #9ca3af;
                }
            }
            #pns-banner-overlay {
                position: fixed; bottom: 24px; left: 24px; right: 24px;
                background: var(--pns-bg); color: var(--pns-text);
                z-index: 2147483647; font-family: var(--pns-font);
                border-radius: 20px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
                border: 1px solid rgba(0,0,0,0.1);
                animation: pns-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
                max-width: 400px; padding: 24px;
            }
            #pns-manual-trigger {
                position: fixed; bottom: 10px; right: 10px;
                background: var(--pns-primary); color: white;
                padding: 8px 16px; border-radius: 20px;
                font-size: 12px; cursor: pointer; z-index: 2147483646;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                font-family: var(--pns-font); border: none;
            }
            @media (min-width: 640px) {
                #pns-banner-overlay { left: auto; max-width: 450px; }
            }
            @keyframes pns-slide-up {
                from { transform: translateY(120%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            .pns-title { font-size: 20px; font-weight: 700; margin: 0 0 8px; }
            .pns-subtitle { font-size: 14px; color: var(--pns-muted); margin: 0 0 20px; line-height: 1.5; }
            .pns-actions { display: flex; gap: 12px; }
            .pns-btn {
                flex: 1; padding: 12px 20px; border: none; border-radius: 12px;
                font-size: 15px; font-weight: 600; cursor: pointer;
                transition: all 0.2s ease; font-family: var(--pns-font);
            }
            .pns-btn-primary {
                background: var(--pns-primary); color: white;
            }
            .pns-btn-primary:hover { transform: scale(1.02); box-shadow: 0 4px 12px rgba(99,102,241,0.3); }
            .pns-btn-secondary {
                background: transparent; color: var(--pns-muted);
                border: 1px solid rgba(107,114,128,0.3);
            }
            .pns-btn-secondary:hover { background: rgba(107,114,128,0.05); }
            .pns-brand { margin-top: 12px; text-align: center; font-size: 11px; color: var(--pns-muted); opacity: 0.7; }
        `;
        const style = document.createElement('style');
        style.id = 'pns-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }

    async function mountUI() {
        injectStyles();

        // MANUAL TRIGGER BUTTON
        if (!document.getElementById('pns-manual-trigger')) {
            const btn = document.createElement('button');
            btn.id = 'pns-manual-trigger';
            btn.innerText = 'إعادة تفعيل الإشعارات';
            btn.onclick = () => {
                localStorage.removeItem(KEY); // Clear interaction flag
                document.getElementById('pns-banner-overlay')?.remove();
                mountUI(); // Remount banner
            };
            document.body.appendChild(btn);
        }

        // FORCE SHOW: Bypass localStorage check for now as requested
        // if (localStorage.getItem(KEY)) return;

        if (document.getElementById('pns-banner-overlay')) return;

        const banner = document.createElement('div');
        banner.id = 'pns-banner-overlay';
        banner.innerHTML = `
            <h3 class="pns-title">${CONFIG.title}</h3>
            <p class="pns-subtitle">${CONFIG.subtitle}</p>
            <div class="pns-actions">
                <button class="pns-btn pns-btn-primary" id="pns-enable">${CONFIG.btnText}</button>
                <button class="pns-btn pns-btn-secondary" id="pns-dismiss">Later</button>
            </div>
            <div class="pns-brand">${CONFIG.brandText}</div>
        `;
        document.body.appendChild(banner);

        banner.querySelector('#pns-dismiss').onclick = () => {
            localStorage.setItem(KEY, 'dismissed');
            banner.remove();
        };

        banner.querySelector('#pns-enable').onclick = async () => {
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    localStorage.setItem(KEY, 'granted');

                    if ('serviceWorker' in navigator) {
                        try {
                            const registration = await navigator.serviceWorker.register('/sw.js', {
                                scope: '/',
                                updateViaCache: 'none'
                            });
                            console.log('[PNS] Service Worker registered');

                            // Force Update
                            registration.update();

                            await navigator.serviceWorker.ready;

                            const messaging = await initFirebase();
                            console.log('[PNS] Requesting FCM token...');

                            // Handle token with rotation detection
                            await handleToken(messaging, registration);


                        } catch (swErr) {
                            console.error('[PNS] Service Worker registration failed:', swErr);
                        }
                    } else {
                        console.error('[PNS] Service Workers not supported');
                    }
                }
            } catch (e) {
                console.error('[PNS] Error during registration', e);
            }
            banner.remove();
        };
    }

    const run = () => {
        setTimeout(() => {
            if (document.body) mountUI();
            else window.addEventListener('load', mountUI);
        }, CONFIG.startDelay);
    };

    if (document.readyState === 'complete') run();
    else window.addEventListener('load', run);

    console.log(`[PNS] Loader initialized for domain: ${DOMAIN_ID}, user: ${USER_ID}`);
})();
