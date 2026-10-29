/**
 * PlatformService — Centralized device and OS detection for Cathet.
 */
export class PlatformService {
  private static instance: PlatformService | null = null;
  private readonly _isAndroid: boolean;
  private readonly _isMobile: boolean;

  private constructor() {
    const ua = navigator.userAgent.toLowerCase();
    this._isAndroid = ua.includes("android");
    this._isMobile = this._isAndroid || /iphone|ipad|ipod|mobile/.test(ua);
  }

  static getInstance(): PlatformService {
    if (!PlatformService.instance) {
      PlatformService.instance = new PlatformService();
    }
    return PlatformService.instance;
  }

  isAndroid(): boolean {
    return this._isAndroid;
  }

  isMobile(): boolean {
    return this._isMobile;
  }

  isDesktop(): boolean {
    return !this._isMobile;
  }

  applyPlatformClasses(): void {
    if (this._isMobile) {
      document.body.classList.add("is-mobile");
    }
    if (this._isAndroid) {
      document.body.classList.add("is-android");
    }
  }
}

