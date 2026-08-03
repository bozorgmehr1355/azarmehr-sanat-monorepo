import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const NotificationContext = createContext();
export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children, currentUserId }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const SUPABASE_URL = "https://<project>.supabase.co";
  const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/crm_notifications?receiver_id=eq.${currentUserId}&order=created_at.desc`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Accept: "application/json",
          },
        }
      );
      if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Error loading notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  return (
    <NotificationContext.Provider value={{ notifications, loading, fetchNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
