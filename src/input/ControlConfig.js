export const DEFAULT_BINDINGS = Object.freeze({
  moveForward: ['KeyW', 'ArrowUp'],
  moveBackward: ['KeyS', 'ArrowDown'],
  moveLeft: ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  crouch: ['KeyC'],
  aim: ['Mouse2'],
  interact: ['KeyE'],
  handbrake: ['Space'],
  pause: ['Escape'],
});

export const DEFAULT_CONTROL_SETTINGS = Object.freeze({
  sprintMode: 'hold',
  cameraRelativeMovement: true,
  touchDeadzone: 0.08,
});

const STORAGE_KEY = 'nd.control-settings.v2';

function cloneBindings(bindings) {
  return Object.fromEntries(
    Object.entries(bindings).map(([action, codes]) => [action, [...codes]])
  );
}

export function loadControlSettings() {
  const fallback = {
    bindings: cloneBindings(DEFAULT_BINDINGS),
    ...DEFAULT_CONTROL_SETTINGS,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const saved = JSON.parse(raw);
    return {
      ...fallback,
      ...saved,
      bindings: {
        ...fallback.bindings,
        ...(saved?.bindings || {}),
      },
    };
  } catch {
    return fallback;
  }
}

export function saveControlSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

export function resetControlSettings() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return loadControlSettings();
}
