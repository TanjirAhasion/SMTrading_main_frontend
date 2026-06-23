export type ToastType = 'success' | 'danger' | 'warning' | 'info';

export interface ToastState {
  show: boolean;
  type: ToastType;
  title: string;
  message: string;
  icon: string;
}

export const TOAST_AUTO_HIDE_MS = 2500;

const toastIcons: Record<ToastType, string> = {
  success: 'fas fa-check-circle',
  danger: 'fas fa-times-circle',
  warning: 'fas fa-exclamation-triangle',
  info: 'fas fa-info-circle'
};

export function createEmptyToast(): ToastState {
  return {
    show: false,
    type: 'success',
    title: '',
    message: '',
    icon: toastIcons.success
  };
}

export class ToastController {
  private timer: ReturnType<typeof setTimeout> | null = null;

  show(
    type: ToastType,
    title: string,
    message: string,
    update: (toast: ToastState) => void,
    close: () => void,
    durationMs = TOAST_AUTO_HIDE_MS
  ): void {
    this.clearTimer();

    update({
      show: true,
      type,
      title,
      message,
      icon: toastIcons[type]
    });

    this.timer = setTimeout(close, durationMs);
  }

  close(update: (toast: ToastState) => void): void {
    this.clearTimer();
    update(createEmptyToast());
  }

  destroy(): void {
    this.clearTimer();
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
