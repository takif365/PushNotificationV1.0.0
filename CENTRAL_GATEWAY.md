# 🌐 Firebase Master Proxy (Central Gateway)

This system allows you to collect Push Notification tokens from **any domain** without manually adding them to the Firebase Console.

## 🚀 How it Works
1.  **Central Gateway**: A Firebase Function that receives tokens and saves them to Firestore with the domain name.
2.  **CDN Loader**: A single `pns-loader.js` file that you can host once and call from anywhere.
3.  **Proxy Worker**: A tiny script to handle background notifications on the target domains.

---

## 1. Installation on Target Sites

On any new site where you want to collect notifications, you only need to do two things:

### A. Add the Loader Script
Add this line before the `</body>` tag:
```html
<script src="https://api.yourpanel.com/pns-loader.js"></script>
```
*(Replace the URL with your actual hosted script path)*

### B. Add the Proxy Worker
Create a file named `firebase-messaging-sw.js` in the **root directory** of the target site and paste this code:
```javascript
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyB0grieksKtM28Q8sDqRJtIlCiVOa4O2TI",
    authDomain: "push-notification-d1fb7.firebaseapp.com",
    projectId: "push-notification-d1fb7",
    storageBucket: "push-notification-d1fb7.firebasestorage.app",
    messagingSenderId: "462544520587",
    appId: "1:462544520587:web:7feb1ff5e930f6c81b5b8e"
});

const messaging = firebase.messaging();
```

---

## 2. Targeting Notifications (Dashboard)

When you want to send notifications from your dashboard, the tokens are now tagged with their `domain`.

### Filtering in Firestore:
- Tokens are stored in the `push_tokens` collection.
- Each document has a `domain` field (e.g., `site1.com`).
- To send to a specific site, your sending script should query:
  `where("domain", "==", "site1.com")`

### Using the Proxy API:
You can call your new function `sendNotificationByDomain` with a JSON body:
```json
{
  "domain": "site1.com",
  "title": "Special Offer!",
  "body": "Click to see more"
}
```

---

## ⚠️ Important Notes
- **HTTPS**: The target site **must** use HTTPS for the prompt to appear.
- **Ray ID**: The Ray ID generated is unique per session for that realistic Cloudflare look.
- **One-Time Only**: The interaction is saved in `localStorage`, so successful users won't see the prompt again.
