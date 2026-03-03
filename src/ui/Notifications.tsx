import React from 'react';
import type { Notification } from '../game/state';

interface NotificationsProps {
  notifications: Notification[];
  now: number;
}

export const Notifications: React.FC<NotificationsProps> = ({ notifications, now }) => {
  const visible = notifications.filter(n => now - n.time < 3000);
  return (
    <>
      {visible.map((notif) => (
        <div key={notif.id} className={`notif ${notif.type}`}>
          {notif.text}
        </div>
      ))}
    </>
  );
};
