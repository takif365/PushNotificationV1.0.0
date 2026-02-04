export default {
    async scheduled(event, env, ctx) {
        console.log("Cron trigger fired");
        try {
            const secret = env.CRON_SECRET;
            if (!secret) {
                console.error("CRON_SECRET is not set in environment variables");
                return;
            }

            // Replace with your actual deployed URL
            const appUrl = 'https://push-notification-v1-0-0-vsu4.vercel.app';
            const url = `${appUrl}/api/cron/process-scheduled`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${secret}`
                }
            });

            const data = await response.text();
            console.log(`Cron execution result: ${response.status}`, data);
        } catch (error) {
            console.error("Cron failed to execute:", error);
        }
    }
};
