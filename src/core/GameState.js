export const GameState = Object.freeze({
  MAIN_MENU: 'main-menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  SETTINGS: 'settings',
  ABOUT: 'about',
});

export class GameStateManager {
  constructor(initial = GameState.MAIN_MENU) {
    this.current = initial;
    this.listeners = new Set();
  }

  set(state) {
    if (this.current === state) return;
    const previous = this.current;
    this.current = state;
    this.listeners.forEach(listener => listener(state, previous));
  }

  onChange(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get paused() {
    return this.current !== GameState.PLAYING;
  }
}
