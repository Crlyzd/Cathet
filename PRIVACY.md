# Privacy Policy for Cathet

**Effective Date:** November 17, 2026

Cathet ("Cathet Note") is a free, open-source (`GPL-3.0-or-later`), local-first text and Markdown editor for Windows, Linux, and Android developed by Kaleksanan Bagus (`Crlyzd`).

---

## 1. Zero Telemetry & No Personal Data Collection
Cathet does **not** collect, sell, rent, or transmit personal information, usage analytics, crash reports, advertising identifiers, or behavioral telemetry. There are no user accounts, cloud sync servers, or third-party tracking SDKs.

## 2. Local Data & File Access
- **Documents & Notes:** Files you open, edit, or save remain strictly on your device's filesystem or user-selected storage locations (including Android Storage Access Framework `content://` / `file://` URIs). On Windows (including the Microsoft Store MSIX package with `runFullTrust`), local filesystem access is used solely to open, edit, and save files you explicitly choose or drag into the editor. On Android, Home dashboard notes and folder metadata (`metadata.json`) are stored locally in the app's private data directory.
- **App Preferences:** Settings such as theme, font, frosted glass/backdrop appearance, language, and Dual-Pane layout preferences are stored locally on your device.
- **Images & Clipboard:** Pasted or keyboard-committed images are optimized in memory on your device and never uploaded to external servers.

## 3. Biometric Authentication (Android Private Vault)
When you lock or unlock hidden notes on Android, Cathet invokes the operating system's native `BiometricPrompt` (fingerprint or device lock screen PIN/pattern). Cathet only receives a pass/fail confirmation from Android and never accesses, reads, or stores biometric templates or device credentials.

## 4. Network Connections
- **Update Checks:** Cathet may query the public GitHub Releases API (`https://api.github.com/repos/Crlyzd/Cathet/releases/latest`) to check for newer versions (and download release installers/APKs from GitHub only when you choose to update). Standard HTTP connection metadata (such as your IP address) is handled by GitHub under [GitHub's Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).
- **User-Initiated Actions:** External links you click (such as project links in About, "Search with Google" in the context menu, or links inside Markdown documents), Android system text-selection actions (such as Translate, Web Search, or Share), and remote `https://` image URLs embedded in Markdown files you preview are handled by your operating system, browser, or WebView only when triggered by you.

## 5. Android Permissions
- `INTERNET`: Used for GitHub update checks, user-opened external links, and loading remote `https://` images inside Markdown Preview.
- `VIBRATE`: Used solely for local tactile/haptic feedback.
- File & Intent Queries: Used to open/save text and Markdown files and enable native Android text-selection actions.

## 6. Children's Privacy
Cathet does not knowingly collect any personal information from anyone, including children under the age of 13.

## 7. Changes to This Policy
Updates to this Privacy Policy will be published in `PRIVACY.md` in the official Cathet repository with a revised effective date.

## 8. Contact
If you have questions or concerns about this Privacy Policy, please open an issue at [github.com/Crlyzd/Cathet/issues](https://github.com/Crlyzd/Cathet/issues) or visit [kaleksanan.my.id](https://kaleksanan.my.id).
