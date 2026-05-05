export interface Toast {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}

type Listener = (toast: Toast) => void;

const listeners: Listener[] = [];

export function createToast(toast: Omit<Toast, "id">) {
  const id = Math.random().toString(36).slice(2);
  const t = { ...toast, id };
  listeners.forEach((l) => l(t));
}

export function onToast(listener: Listener) {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx > -1) listeners.splice(idx, 1);
  };
}
