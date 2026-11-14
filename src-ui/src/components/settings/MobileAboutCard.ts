import { icons } from "../../utils/monochromeIcons";
import { APP_VERSION } from "../../version";
import { openUrl } from "@tauri-apps/plugin-opener";
import { t } from "../../services/i18nService";
import { attachHeartSprout } from "../../utils/heartSprout";
import { UpdateInfo } from "../../services/updateService";

export function renderMobileAboutCard(updateInfo?: UpdateInfo | null, isChecking = false): string {
  const hasUpdate = !!updateInfo?.update_available;
  const statusText = isChecking
    ? t("settings.checkingUpdates")
    : hasUpdate
      ? t("settings.updateAvailable", { version: updateInfo!.latest_version })
      : t("settings.upToDate");
  const btnLabel = isChecking
    ? t("settings.checkingUpdates")
    : hasUpdate
      ? `${t("settings.getUpdate", { version: updateInfo!.latest_version })} ↗`
      : t("settings.checkUpdates");

  return `
    <div class="mobile-settings-section-title">${t("settings.about")}</div>
    <div class="mobile-settings-card mobile-about-card">
      <div class="mobile-about-brand">
        <img src="/app-icon.png" alt="Cathet" decoding="async" />
        <div>
          <div class="mobile-about-title">Cathet</div>
          <div class="mobile-about-version">v${APP_VERSION} (Android)</div>
        </div>
      </div>
      <div class="mobile-about-desc">${t("settings.aboutDesc")}</div>
      <div class="mobile-settings-row mobile-update-row">
        <div class="mobile-settings-row-left">
          <span class="mobile-settings-row-title">${t("settings.appUpdates")}</span>
          <span class="mobile-settings-row-subtitle" id="mobile-update-status">${statusText}</span>
        </div>
        <button class="mobile-about-btn mobile-update-btn ${hasUpdate ? "has-update" : ""}" id="btn-mobile-update" ${isChecking ? "disabled" : ""}>${btnLabel}</button>
      </div>
      <div class="about-hairline"></div>
      <div class="about-author-row">
        <span>Made with</span>
        <span class="minimal-heart-wrap" id="btn-mobile-sprout-heart" role="button" title="Send love">${icons.heart}</span>
        <span>by</span>
        <span class="author-name-text">Kaleksanan Bagus</span>
      </div>
      <div class="mobile-about-actions">
        <button class="mobile-about-btn" id="btn-about-github">${icons.github}<span>GitHub ↗</span></button>
        <button class="mobile-about-btn" id="btn-about-website">${icons.globe}<span>Website ↗</span></button>
        <button class="mobile-about-btn" id="btn-about-saweria">${icons.coffee}<span>Saweria ↗</span></button>
        <button class="mobile-about-btn" id="btn-about-kofi">${icons.coffee}<span>Ko-fi ↗</span></button>
      </div>
      <button class="mobile-about-btn" id="btn-about-bug" style="width: 100%; margin-top: 2px;">
        ${icons.bug}<span>Report an Issue or Bug ↗</span>
      </button>
    </div>
  `;
}

export function bindMobileAboutEvents(
  container: HTMLElement,
  onUpdateClick: () => void
): () => void {
  const openLink = (id: string, url: string) => {
    container.querySelector(`#${id}`)?.addEventListener("click", () => openUrl(url).catch(console.error));
  };
  openLink("btn-about-github", "https://github.com/Crlyzd/Cathet");
  openLink("btn-about-website", "https://kaleksanan.my.id");
  openLink("btn-about-saweria", "https://saweria.co/crlyzd");
  openLink("btn-about-kofi", "https://ko-fi.com/curlyzed");
  openLink("btn-about-bug", "https://github.com/Crlyzd/Cathet/issues/new");

  container.querySelector("#btn-mobile-update")?.addEventListener("click", onUpdateClick);

  const heartBtn = container.querySelector("#btn-mobile-sprout-heart") as HTMLElement | null;
  const aboutCard = container.querySelector(".mobile-about-card") as HTMLElement | null;
  if (heartBtn && aboutCard) {
    return attachHeartSprout(heartBtn, aboutCard);
  }
  return () => {};
}
