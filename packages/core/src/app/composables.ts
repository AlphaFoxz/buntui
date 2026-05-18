import {getCurrentScene, trackInScope, trackMounted} from './scene-context';

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
