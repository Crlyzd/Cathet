export type FormatBarPosition = "top" | "bottom" | "left";

const STORAGE_KEY_VISIBLE = "cathet_format_bar_visible";
const STORAGE_KEY_POSITION = "cathet_format_bar_position";

/**
 * FormatBarService — Persists desktop floating markdown toolbar visibility and dock position.
 */
export class FormatBarService {
  private static instance: FormatBarService;
  private visible: boolean;
  private position: FormatBarPosition;

  private constructor() {
    this.visible = localStorage.getItem(STORAGE_KEY_VISIBLE) === "true";
    const savedPos = localStorage.getItem(STORAGE_KEY_POSITION);
    this.position = savedPos === "top" || savedPos === "bottom" || savedPos === "left" ? savedPos : "bottom";
  }

  public static getInstance(): FormatBarService {
    if (!FormatBarService.instance) {
      FormatBarService.instance = new FormatBarService();
    }
    return FormatBarService.instance;
  }

  public isVisible(): boolean {
    return this.visible;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    localStorage.setItem(STORAGE_KEY_VISIBLE, visible ? "true" : "false");
  }

  public toggleVisible(): boolean {
    this.setVisible(!this.visible);
    return this.visible;
  }

  public getPosition(): FormatBarPosition {
    return this.position;
  }

  public setPosition(pos: FormatBarPosition): void {
    this.position = pos;
    localStorage.setItem(STORAGE_KEY_POSITION, pos);
  }
}
