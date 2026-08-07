type Callback = (data?: any) => void;

export class EventBus {
  private events: Map<string, Callback[]> = new Map();

  on(event: string, callback: Callback): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: Callback): void {
    if (!this.events.has(event)) return;
    const callbacks = this.events.get(event)!.filter((cb) => cb !== callback);
    this.events.set(event, callbacks);
  }

  emit(event: string, data?: any): void {
    if (!this.events.has(event)) return;
    this.events.get(event)!.forEach((cb) => cb(data));
  }
}

export const globalEventBus = new EventBus();
