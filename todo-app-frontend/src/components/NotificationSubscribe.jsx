import { useState, useEffect } from "react";
import axios from "../api/axios";

export default function NotificationSubscribe() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vapidKey, setVapidKey] = useState("");

  // Kiểm tra hỗ trợ trình duyệt
  useEffect(() => {
    const checkSupport = () => {
      return (
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
      );
    };
    setIsSupported(checkSupport());

    // Lấy VAPID key từ backend
    const getVapidKey = async () => {
      try {
        const res = await axios.get("/push/public-key");
        setVapidKey(res.data.key);
      } catch (err) {
        console.error("Failed to get VAPID key:", err);
      }
    };
    getVapidKey();
  }, []);

  // Kiểm tra subscription hiện tại
  useEffect(() => {
    const checkSubscription = async () => {
      if (!isSupported) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    };
    checkSubscription();
  }, [isSupported]);

  // Hàm request permission
  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      setError("Trình duyệt không hỗ trợ Notification API");
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  };

  // Hàm subscribe
  const subscribe = async () => {
    if (!isSupported || !vapidKey) {
      setError("Trình duyệt không hỗ trợ push notifications");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Request permission
      const granted = await requestNotificationPermission();
      if (!granted) {
        setError("Bạn đã từ chối quyền thông báo");
        setLoading(false);
        return;
      }

      // 2. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe với VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // 4. Gửi subscription đến backend
      await axios.post("/push/subscribe", { subscription });

      setIsSubscribed(true);
      alert("✅ Đã bật thông báo thành công!");
    } catch (err) {
      console.error("Subscription error:", err);
      setError("Không thể đăng ký thông báo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Hàm unsubscribe
  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await axios.post("/push/unsubscribe");
        setIsSubscribed(false);
        alert("✅ Đã tắt thông báo");
      }
    } catch (err) {
      console.error("Unsubscribe error:", err);
      setError("Không thể hủy đăng ký: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function
  function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  if (!isSupported) {
    return (
      <div className="notification-warning">
        <p>⚠️ Trình duyệt của bạn không hỗ trợ push notifications</p>
      </div>
    );
  }

  return (
    <div className="notification-subscribe">     
      {error && <div className="error-message">{error}</div>}
      
      <div className="notification-controls">
        {isSubscribed ? (
          <button 
            onClick={unsubscribe} 
            disabled={loading}
            className="btn btn-warning"
          >
            {loading ? "Đang xử lý..." : "🔕 Tắt thông báo"}
          </button>
        ) : (
          <button 
            onClick={subscribe} 
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Đang xử lý..." : "🔔 Bật thông báo"}
          </button>
        )}
      </div>
    </div>
  );
}