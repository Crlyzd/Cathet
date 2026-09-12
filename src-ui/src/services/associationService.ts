import { invoke } from "@tauri-apps/api/core";

export interface AssociationStatus {
  isRegistered: boolean;
  currentExePath: string;
  registeredExePath: string | null;
}

export class AssociationService {
  /**
   * Retrieves the current Windows file association status and registered executable path.
   */
  async getStatus(): Promise<AssociationStatus | null> {
    try {
      return await invoke<AssociationStatus>("get_association_status");
    } catch (err) {
      console.error("Failed to query association status:", err);
      return null;
    }
  }

  /**
   * Registers Cathet as default editor in HKCU registry and opens Windows Default Apps page.
   */
  async configureDefaultApp(): Promise<AssociationStatus | null> {
    try {
      return await invoke<AssociationStatus>("configure_default_app");
    } catch (err) {
      console.error("Failed to configure default app:", err);
      throw err;
    }
  }

  /**
   * Unregisters Cathet ProgID and file association keys from HKCU registry.
   */
  async unregisterDefaultApp(): Promise<AssociationStatus | null> {
    try {
      return await invoke<AssociationStatus>("unregister_default_app");
    } catch (err) {
      console.error("Failed to unregister default app:", err);
      throw err;
    }
  }
}
