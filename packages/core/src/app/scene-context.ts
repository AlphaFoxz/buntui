import type {TuiScene} from '../extern/app/TuiScene';

let currentScene: TuiScene | undefined;
let currentScope: Array<() => void> | undefined;
let mountedQueue: Array<() => void> | undefined;
let currentProps: Record<string, unknown> | undefined;

export function setCurrentScene(scene: TuiScene | undefined): void {
  currentScene = scene;
}

export function getCurrentScene(): TuiScene | undefined {
  return currentScene;
}

export function setCurrentProps(props: Record<string, unknown> | undefined): void {
  currentProps = props;
}

export function getCurrentProps(): Record<string, unknown> | undefined {
  return currentProps;
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
  props?: Record<string, unknown>,
): () => void {
  const previousScene = currentScene;
  const previousScope = currentScope;
  const previousMounted = mountedQueue;
  const previousProps = currentProps;

  const scope: Array<() => void> = [];
  const mounted: Array<() => void> = [];
  currentScene = scene;
  currentScope = scope;
  mountedQueue = mounted;
  currentProps = props;

  let cleanup: (() => void) | void;
  try {
    cleanup = setupFn();
  } finally {
    currentScene = previousScene;
    currentScope = previousScope;
    mountedQueue = previousMounted;
    currentProps = previousProps;
  }

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
