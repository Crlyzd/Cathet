import { invoke } from "@tauri-apps/api/core";
import { PlatformService } from "./platformService";

export class BiometricService {
  private static instance: BiometricService;

  static getInstance(): BiometricService {
    if (!BiometricService.instance) {
      BiometricService.instance = new BiometricService();
    }
    return BiometricService.instance;
  }

  async authenticate(
    title = "Unlock Private Notes",
    subtitle = "Confirm fingerprint or device PIN"
  ): Promise<boolean> {
    if (!PlatformService.getInstance().isAndroid()) {
      return true;
    }
    try {
      return await invoke<boolean>("authenticate_biometric", { title, subtitle });
    } catch (err) {
      console.warn("Biometric authentication cancelled or failed:", err);
      return false;
    }
  }
}

