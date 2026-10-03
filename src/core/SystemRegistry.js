export class SystemRegistry {
  constructor() {
    this.systems = new Map();
  }

  register(name, system) {
    if (!name || !system) throw new TypeError('A system name and object are required');
    if (this.systems.has(name)) throw new Error(`System already registered: ${name}`);
    this.systems.set(name, system);
    system.onRegister?.(this);
    return () => this.unregister(name);
  }

  unregister(name) {
    const system = this.systems.get(name);
    if (!system) return false;
    system.onUnregister?.(this);
    system.dispose?.();
    this.systems.delete(name);
    return true;
  }

  fixedUpdate(dt) {
    for (const system of this.systems.values()) system.fixedUpdate?.(dt);
  }

  update(dt) {
    for (const system of this.systems.values()) system.update?.(dt);
  }

  lateUpdate(dt) {
    for (const system of this.systems.values()) system.lateUpdate?.(dt);
  }

  dispose() {
    for (const name of [...this.systems.keys()]) this.unregister(name);
  }

  has(name) {
    return this.systems.has(name);
  }
}
