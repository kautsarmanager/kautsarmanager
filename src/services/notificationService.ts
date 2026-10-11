import { Task } from '../types';

export type DeadlineUrgency = 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future';

export interface TaskDeadlineNotification {
  id: string; // task.id
  task: Task;
  urgency: DeadlineUrgency;
  diffDays: number;
  urgencyLabel: string;
  formattedDate: string;
  reminderTime?: string;
  isRead: boolean;
  message: string;
}

const READ_STORAGE_KEY = 'pms_read_deadline_notifications';
const LAST_NOTIFIED_KEY = 'pms_last_browser_notified_timestamps';

/**
 * Normalizes a date string 'YYYY-MM-DD' into a local Date at 00:00:00
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!year || !month || !day) return new Date(dateStr);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Calculates day difference from today (local time).
 * < 0: Overdue
 * 0: Today
 * 1: Tomorrow
 * > 1: Future
 */
export function getDaysDifference(deadlineStr: string): number {
  const deadline = parseLocalDate(deadlineStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = deadline.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Gets urgency classification and label
 */
export function evaluateTaskUrgency(task: Task): {
  urgency: DeadlineUrgency;
  diffDays: number;
  label: string;
  message: string;
} {
  const diffDays = getDaysDifference(task.deadline);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      urgency: 'overdue',
      diffDays,
      label: 'Lewat Deadline',
      message: `Terlambat ${absDays} hari (${task.deadline})`,
    };
  }

  if (diffDays === 0) {
    return {
      urgency: 'today',
      diffDays,
      label: 'Hari Ini',
      message: task.reminder
        ? `Jatuh tempo HARI INI pukul ${task.reminder}`
        : 'Jatuh tempo HARI INI',
    };
  }

  if (diffDays === 1) {
    return {
      urgency: 'tomorrow',
      diffDays,
      label: 'Besok',
      message: task.reminder
        ? `Jatuh tempo BESOK pukul ${task.reminder}`
        : 'Batas waktu besok',
    };
  }

  if (diffDays <= 3) {
    return {
      urgency: 'soon',
      diffDays,
      label: `H-${diffDays}`,
      message: `Batas waktu dalam ${diffDays} hari (${task.deadline})`,
    };
  }

  return {
    urgency: 'future',
    diffDays,
    label: `${diffDays} hari lagi`,
    message: `Deadline ${task.deadline}`,
  };
}

// Shared AudioContext instance with automatic unlocker
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    getAudioContext();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

class NotificationService {
  private readIds: Set<string> = new Set();
  private lastNotified: Record<string, number> = {};
  private inAppListeners: Array<(title: string, body: string) => void> = [];

  constructor() {
    this.loadState();
  }

  public onInAppNotification(listener: (title: string, body: string) => void): () => void {
    this.inAppListeners.push(listener);
    return () => {
      this.inAppListeners = this.inAppListeners.filter((l) => l !== listener);
    };
  }

  private dispatchInApp(title: string, body: string) {
    this.inAppListeners.forEach((l) => l(title, body));
  }

  private loadState() {
    try {
      const stored = localStorage.getItem(READ_STORAGE_KEY);
      if (stored) {
        this.readIds = new Set(JSON.parse(stored));
      }
      const notified = localStorage.getItem(LAST_NOTIFIED_KEY);
      if (notified) {
        this.lastNotified = JSON.parse(notified);
      }
    } catch {
      this.readIds = new Set();
      this.lastNotified = {};
    }
  }

  private saveReadState() {
    try {
      localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(this.readIds)));
    } catch {}
  }

  private saveNotifiedState() {
    try {
      localStorage.setItem(LAST_NOTIFIED_KEY, JSON.stringify(this.lastNotified));
    } catch {}
  }

  /**
   * Generates active notifications for pending tasks with deadlines
   */
  public getNotifications(tasks: Task[]): TaskDeadlineNotification[] {
    const pendingTasks = tasks.filter((t) => t.status !== 'completed' && Boolean(t.deadline));

    const notifications: TaskDeadlineNotification[] = pendingTasks.map((task) => {
      const { urgency, diffDays, label, message } = evaluateTaskUrgency(task);

      const d = parseLocalDate(task.deadline);
      const formattedDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(d);

      return {
        id: task.id,
        task,
        urgency,
        diffDays,
        urgencyLabel: label,
        formattedDate,
        reminderTime: task.reminder,
        isRead: this.readIds.has(task.id),
        message,
      };
    });

    // Priority sort: overdue first, then today, then tomorrow, then soon, then future
    const urgencyOrder: Record<DeadlineUrgency, number> = {
      overdue: 0,
      today: 1,
      tomorrow: 2,
      soon: 3,
      future: 4,
    };

    return notifications.sort((a, b) => {
      const orderA = urgencyOrder[a.urgency];
      const orderB = urgencyOrder[b.urgency];
      if (orderA !== orderB) return orderA - orderB;
      return a.diffDays - b.diffDays;
    });
  }

  /**
   * Gets counts of urgent notifications (overdue + today)
   */
  public getUrgentCounts(tasks: Task[]): {
    total: number;
    unread: number;
    overdue: number;
    today: number;
    soon: number;
  } {
    const list = this.getNotifications(tasks);
    const overdue = list.filter((n) => n.urgency === 'overdue').length;
    const today = list.filter((n) => n.urgency === 'today').length;
    const soon = list.filter((n) => n.urgency === 'tomorrow' || n.urgency === 'soon').length;
    const unread = list.filter((n) => !n.isRead && (n.urgency === 'overdue' || n.urgency === 'today')).length;

    return {
      total: overdue + today + soon,
      unread,
      overdue,
      today,
      soon,
    };
  }

  /**
   * Mark notification as read
   */
  public markAsRead(taskId: string) {
    this.readIds.add(taskId);
    this.saveReadState();
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(tasks: Task[]) {
    tasks.forEach((t) => this.readIds.add(t.id));
    this.saveReadState();
  }

  /**
   * Check if browser notifications are supported
   */
  public isNotificationSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  /**
   * Get current browser notification permission
   */
  public getPermissionStatus(): NotificationPermission {
    if (!this.isNotificationSupported()) return 'denied';
    return Notification.permission;
  }

  /**
   * Request browser notification permission
   */
  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.isNotificationSupported()) return 'denied';
    try {
      const res = await Notification.requestPermission();
      return res;
    } catch {
      return 'denied';
    }
  }

  /**
   * Play clean audible synthesized chime sound
   */
  public playChime(type: 'urgent' | 'regular' = 'regular') {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(ctx.destination);

      if (type === 'urgent') {
        // High alert pleasant two-tone bell (880Hz -> 1320Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1320, now + 0.12); // E6

        // Audible volume
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Calm pleasant chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.12); // A5

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.45);
      }
    } catch {
      // Audio fallback
    }
  }

  /**
   * Send a browser native notification and dispatch in-app fallback
   */
  public sendBrowserNotification(title: string, body: string, taskId?: string) {
    // Always trigger in-app banner for guaranteed visibility on all devices
    this.dispatchInApp(title, body);

    if (!this.isNotificationSupported() || Notification.permission !== 'granted') {
      return;
    }

    // Debounce native push per task
    const now = Date.now();
    if (taskId) {
      const last = this.lastNotified[taskId] || 0;
      if (now - last < 3 * 60 * 60 * 1000) {
        return;
      }
      this.lastNotified[taskId] = now;
      this.saveNotifiedState();
    }

    try {
      const notif = new Notification(title, {
        body,
        icon: '/icon.svg',
        tag: taskId || 'pms-deadline',
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch {
      // Fallback handled by dispatchInApp
    }
  }

  /**
   * Scan tasks and trigger notifications for overdue & due today tasks
   */
  public checkAndTriggerScheduledDeadlines(tasks: Task[]): {
    triggeredCount: number;
    urgentTitles: string[];
  } {
    const notifications = this.getNotifications(tasks);
    const urgent = notifications.filter(
      (n) => (n.urgency === 'overdue' || n.urgency === 'today') && !n.isRead
    );

    if (urgent.length === 0) {
      return { triggeredCount: 0, urgentTitles: [] };
    }

    // If browser permission is granted, push notifications
    if (this.isNotificationSupported() && Notification.permission === 'granted') {
      urgent.slice(0, 3).forEach((n) => {
        const title =
          n.urgency === 'overdue'
            ? `⚠️ Tugas Lewat Deadline: ${n.task.title}`
            : `⏰ Deadline Hari Ini: ${n.task.title}`;
        this.sendBrowserNotification(title, n.message, n.task.id);
      });
    }

    return {
      triggeredCount: urgent.length,
      urgentTitles: urgent.map((u) => u.task.title),
    };
  }
}

export const notificationService = new NotificationService();
