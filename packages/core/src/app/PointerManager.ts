import {MouseEvent, TuiEventType, type WheelEvent} from '../events/types';
import {EVENT_BUS} from '../events';
import type {TuiScene} from '../extern/app/TuiScene';
import type {TuiWidgetEntity} from '../widgets/TuiWidgetEntity';
import {isFocusable} from '../widgets/Focusable';
import type {FocusManager} from './FocusManager';

export class PointerManager {
  #pressTarget: TuiWidgetEntity | undefined;
  #dragTarget: TuiWidgetEntity | undefined;
  #hoverTarget: TuiWidgetEntity | undefined;
  #isDragging = false;
  #dragOffsetX = 0;
  #dragOffsetY = 0;
  #mouseHandler: ((data: MouseEvent) => void) | undefined;
  #wheelHandler: ((data: WheelEvent) => void) | undefined;
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

        if (this.#pressTarget && data.buttons && data.buttons > 0) {
          const dragTarget = this.#dragTarget;
          if (dragTarget) {
            if (!this.#isDragging) {
              this.#isDragging = true;
              dragTarget.clearPositionPercentSpec();
              dragTarget.dispatch('dragstart', data);
            }

            const mx = data.x - 1;
            const my = data.y - 1;
            const newX = mx - this.#dragOffsetX;
            const newY = my - this.#dragOffsetY;
            const oldX = dragTarget.rect.x;
            const oldY = dragTarget.rect.y;
            dragTarget.updateRect({
              x: newX,
              y: newY,
            });

            if (newX !== oldX) {
              dragTarget.dispatch('update:x', {x: newX});
            }

            if (newY !== oldY) {
              dragTarget.dispatch('update:y', {y: newY});
            }

            dragTarget.dispatch('drag', data);
          } else {
            this.#pressTarget.dispatch('mousemove', data);
          }
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
        const hitTarget = scene.hitTest(data);
        this.#pressTarget = hitTarget;
        if (hitTarget) {
          hitTarget.dispatch('mousedown', data);

          // Find nearest draggable ancestor for drag operations
          this.#dragTarget = hitTarget.closest(w => w.draggable);
          if (this.#dragTarget) {
            this.#dragOffsetX = (data.x - 1) - this.#dragTarget.rect.x;
            this.#dragOffsetY = (data.y - 1) - this.#dragTarget.rect.y;
          }

          // Find nearest focusable ancestor
          const focusTarget = hitTarget.closest(w => isFocusable(w));
          if (focusTarget && isFocusable(focusTarget)) {
            this.#focusManager.focusWidget(focusTarget);
          } else {
            this.#focusManager.blurWidget();
          }
        } else {
          this.#dragTarget = undefined;
          this.#focusManager.blurWidget();
        }

        return;
      }

      // Release
      if (this.#isDragging) {
        this.#dragTarget?.dispatch('dragend', data);
        this.#isDragging = false;
        this.#dragTarget = undefined;
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
        this.#dragTarget = undefined;
      }
    };

    EVENT_BUS.on(TuiEventType.MouseEvent, this.#mouseHandler);

    this.#wheelHandler = (data: WheelEvent) => {
      const scene = this.#getScene();
      if (!scene) {
        return;
      }

      const hitTarget = scene.hitTest(data);
      if (hitTarget) {
        hitTarget.dispatch('wheel', data);
      }
    };

    EVENT_BUS.on(TuiEventType.WheelEvent, this.#wheelHandler);
  }

  stop(): void {
    if (this.#mouseHandler) {
      EVENT_BUS.off(TuiEventType.MouseEvent, this.#mouseHandler);
      this.#mouseHandler = undefined;
    }

    if (this.#wheelHandler) {
      EVENT_BUS.off(TuiEventType.WheelEvent, this.#wheelHandler);
      this.#wheelHandler = undefined;
    }

    this.resetState();
  }

  resetState(): void {
    if (this.#hoverTarget) {
      this.#hoverTarget.dispatch('mouseout', {
        button: undefined,
        buttons: undefined,
        x: 0,
        y: 0,
        isRelease: false,
        shiftKey: false,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
      });
    }

    this.#pressTarget = undefined;
    this.#dragTarget = undefined;
    this.#hoverTarget = undefined;
    this.#isDragging = false;
  }
}
