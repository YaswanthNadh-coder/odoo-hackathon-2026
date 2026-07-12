import prisma from '@/lib/db';

type NotificationType = 'compliance' | 'approval' | 'policy' | 'badge' | 'system';

export async function createNotification(userId: string, title: string, message: string, type: NotificationType) {
  try {
    const config = await prisma.appConfig.findUnique({ where: { id: 'global' } });

    // Check if the notification type is enabled in the configuration
    let isEnabled = true;
    if (config) {
      if (type === 'compliance' && !config.notifyCompliance) isEnabled = false;
      if (type === 'approval' && !config.notifyApproval) isEnabled = false;
      if (type === 'policy' && !config.notifyPolicyReminder) isEnabled = false;
      if (type === 'badge' && !config.notifyBadgeUnlock) isEnabled = false;
    }

    if (!isEnabled) {
      return null;
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}
