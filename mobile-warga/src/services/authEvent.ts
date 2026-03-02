type AuthEventType = 'UNAUTHORIZED' | 'PAYMENT_REQUIRED';
type AuthListener = (event: AuthEventType) => void;

class AuthEventEmitter {
  private listeners: AuthListener[] = [];

  subscribe(listener: AuthListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  emit(event: AuthEventType) {
    this.listeners.forEach(listener => listener(event));
  }
}

export const authEvents = new AuthEventEmitter();
