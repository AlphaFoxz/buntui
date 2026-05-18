import type {TuiScene} from '../extern/app/TuiScene';

let currentScene: TuiScene | undefined;
let currentScope: Array<() => void> | undefined;
let mountedQueue: Array<() => void> | undefined;

export function setCurrentScene(scene: TuiScene | undefined): void {
  currentScene = scene;
}

export function getCurrentScene(): TuiScene | undefined {
  return currentScene;
}

export function trackInScope(cleanup: () => void): void {
  if (currentScope) {
    currentScope.push(cleanup);
  }
}

export function trackMounted(callback: () => void): void {
  if (mountedQueue) {
    mountedQueue.push(callback);
  }
}

export function runSetup(
  scene: TuiScene,
  setupFn: () => (() => void) | void,
): () => void {
  const scope: Array<() => void> = [];
  const mounted: Array<() => void> = [];
  currentScene = scene;
  currentScope = scope;
  mountedQueue = mounted;
  const cleanup = setupFn();
  currentScope = undefined;
  currentScene = undefined;
  mountedQueue = undefined;

  for (const cb of mounted) {
    cb();
  }

  const scopeCleanups = scope;
  return () => {
    for (const c of scopeCleanups) {
      c();
    }

    cleanup?.();
  };
}
