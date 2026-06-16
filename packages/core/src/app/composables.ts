import {getCurrentScene, trackInScope, trackMounted} from './scene-context';
import {getCurrentApp} from './TuiApp';

export function onTick(handler: (dt: number) => void): () => void {
  const scene = getCurrentScene();
  if (!scene) {
    throw new Error('onTick() must be called during scene setup()');
  }

  const unsubscribe = scene.onTick(handler);
  trackInScope(unsubscribe);
  return unsubscribe;
}

export function onMounted(callback: () => void): void {
  trackMounted(callback);
}

export function onUnmounted(callback: () => void): void {
  trackInScope(callback);
}

export function useTemplateRef<T = unknown, Keys extends string = string>(_key: Keys): {value: T | null} {
  const ref = {value: null as T | null};
  trackInScope(() => {
    ref.value = null;
  });
  return ref;
}

export function useApp(): {
  dispose: () => void;
  stop: () => void;
  scene: ReturnType<typeof getCurrentScene>;
} {
  const app = getCurrentApp();
  if (!app) {
    throw new Error('useApp() must be called during scene setup()');
  }

  return {
    dispose() {
      app.dispose();
    },
    stop() {
      app.stop();
    },
    scene: getCurrentScene(),
  };
}
