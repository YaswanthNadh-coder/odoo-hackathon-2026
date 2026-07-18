'use client';

import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setNotifications(prev =>
          id === 'all'
            ? prev.map(n => ({ ...n, isRead: true }))
            : prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'compliance': return '🔴';
      case 'approval': return '✅';
      case 'policy': return '📝';
      case 'badge': return '🏆';
      default: return '🔔';
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--border-glow)',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
        }}
        className="hover:bg-white/10"
      >
        <span style={{ fontSize: '1.25rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--accent-gov)',
            color: 'white',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          marginTop: '0.5rem',
          width: '320px',
          maxHeight: '400px',
          background: 'rgba(20, 20, 20, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-glow)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={() => markAsRead('all')}
                style={{ fontSize: '0.75rem', color: 'var(--accent-overall)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                Mark all as read
              </button>
            )}
          </div>
          
          <div style={{ overflowY: 'auto', flexGrow: 1, padding: '0.5rem' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No notifications yet.
              </div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '0.5rem',
                    background: notification.isRead ? 'transparent' : 'rgba(255, 255, 255, 0.03)',
                    border: notification.isRead ? '1px solid transparent' : '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: notification.isRead ? 'default' : 'pointer',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    transition: 'all 0.2s',
                  }}
                  className={!notification.isRead ? 'hover:bg-white/5' : ''}
                >
                  <div style={{ fontSize: '1.25rem', marginTop: '0.1rem' }}>
                    {getTypeIcon(notification.type)}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: notification.isRead ? 500 : 700, color: notification.isRead ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                        {notification.title}
                      </h4>
                      {!notification.isRead && (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-overall)', marginTop: '4px' }} />
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: notification.isRead ? 'var(--text-muted)' : 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {notification.message}
                    </p>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      {new Date(notification.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
