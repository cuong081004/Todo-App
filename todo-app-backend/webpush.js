// backend/webpush.js
const webpush = require("web-push");

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  console.warn("VAPID keys not found in environment. Generate keys and set VAPID_PUBLIC_KEY & VAPID_PRIVATE_KEY.");
} else {
  webpush.setVapidDetails(
    "mailto:giacuongnt123@gmail.com", // change to your contact email
    publicKey,
    privateKey
  );
}

module.exports = webpush;
