import {MouseEvent, TuiEventType} from '../events/types';
import {EVENT_BUS} from '../events';
import type {TuiScene} from '../extern/app/TuiScene';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import {isFocusable} from '../widgets/Focusable';
import type {FocusManager} from './FocusManager';

export class PointerManager {
  #pressTarget: TuiWidgetEntity | undefined;
  #hoverTarget: TuiWidgetEntity | undefined;
  #isDragging = false;
  #dragOffsetX = 0;
  #dragOffsetY = 0;
  #mouseHandler: ((data: MouseEvent) => void) | undefined;
  readonly #getScene: () => TuiScene | undefined;
  readonly #focusManager: FocusManager;

  constructor(getScene: () => TuiScene | undefined, focusManager: FocusManager) {
    this.#getScene = getScene;
    this.#focusManager = focusManager;
  }

  start(): void {
    this.#mouseHandler = (data: MouseEvent) => {
      const scene = this.#getScene();
      if (!scene) {
        return;
      }

      // Mouse move (button not set, buttons may indicate held state)
      if (data.button === undefined) {
        // Mouseover / mouseout / mousemove tracking
        const hitTarget = scene.hitTest(data);
        if (hitTarget !== this.#hoverTarget) {
          if (this.#hoverTarget) {
            this.#hoverTarget.dispatch('mouseout', data);
          }

          this.#hoverTarget = hitTarget;
          if (this.#hoverTarget) {
            this.#hoverTarget.dispatch('mouseover', data);
          }
        } else if (this.#hoverTarget) {
          this.#hoverTarget.dispatch('mousemove', data);
        }

        if (this.#pressTarget && this.#pressTarget.draggable && data.buttons && data.buttons > 0) {
          if (!this.#isDragging) {
            this.#isDragging = true;
            this.#pressTarget.dispatch('dragstart', data);
          }

          const mx = data.x - 1;
          const my = data.y - 1;
          const newX = Math.max(0, mx - this.#dragOffsetX);
          const newY = Math.max(0, my - this.#dragOffsetY);
          this.#pressTarget.updateRect({
            x: newX,
            y: newY,
          });
          this.#pressTarget.dispatch('drag', data);
        }

        return;
      }

      // Right-click: only handle press → release for contextmenu
      if (data.button === MouseEvent.RIGHT_MOUSE_BUTTON) {
        if (!data.isRelease) {
          this.#pressTarget = scene.hitTest(data);
        } else if (this.#pressTarget) {
          const releaseTarget = scene.hitTest(data);
          if (releaseTarget === this.#pressTarget) {
            this.#pressTarget.dispatch('contextmenu', data);
          }

          this.#pressTarget = undefined;
        }

        return;
      }

      // Left / middle button from here on
      // Press
      if (!data.isRelease) {
        this.#pressTarget = scene.hitTest(data);
        if (this.#pressTarget) {
          this.#pressTarget.dispatch('mousedown', data);
          this.#dragOffsetX = (data.x - 1) - this.#pressTarget.rect.x;
          this.#dragOffsetY = (data.y - 1) - this.#pressTarget.rect.y;

          if (isFocusable(this.#pressTarget)) {
            this.#focusManager.focusWidget(this.#pressTarget);
          } else {
            this.#focusManager.blurWidget();
          }
        } else {
          this.#focusManager.blurWidget();
        }

        return;
      }

      // Release
      if (this.#isDragging) {
        this.#pressTarget?.dispatch('dragend', data);
        this.#isDragging = false;
        this.#pressTarget = undefined;
        return;
      }

      if (this.#pressTarget) {
        this.#pressTarget.dispatch('mouseup', data);

        const releaseTarget = scene.hitTest(data);
        if (releaseTarget === this.#pressTarget) {
          this.#pressTarget.dispatch('click', data);
        }

        this.#pressTarget = undefined;
      }
    };

    EVENT_BUS.on(TuiEventType.MouseEvent, this.#mouseHandler);
  }

  stop(): void {
    if (this.#mouseHandler) {
      EVENT_BUS.off(TuiEventType.MouseEvent, this.#mouseHandler);
      this.#mouseHandler = undefined;
    }

    this.#pressTarget = undefined;
    this.#hoverTarget = undefined;
    this.#isDragging = false;
  }
}
