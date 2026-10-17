import { icons } from "../../utils/monochromeIcons";
import { openUrl } from "@tauri-apps/plugin-opener";
import { attachHeartSprout } from "../../utils/heartSprout";

export class AboutPaneComponent {
  private container: HTMLElement;
  private heartSproutCleanup: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
    this.bindEvents();
  }

  public renderHtml(): string {
    return `
      <div class="settings-card">
        <div class="about-box">
          <!-- App Title & Icon Header -->
          <div class="about-hero-header">
            <img src="/app-icon.png" class="about-hero-icon-img" alt="Cathet" />
            <span class="about-hero-title">Cathet</span>
          </div>

          <!-- Short App Description -->
          <div class="about-desc">
            Lightweight, distraction-free text & markdown editor crafted with native Windows frosted glass.
          </div>

          <div class="about-hairline"></div>

          <!-- Author Row -->
          <div class="about-author-row">
            <span>Made with</span>
            <span class="minimal-heart-wrap" id="btn-sprout-heart" role="button" title="Send love">${icons.heart}</span>
            <span>by</span>
            <span class="author-name-text">Kaleksanan Bagus</span>
          </div>

          <!-- Project Links Row (Left Label, Right Capsule) -->
          <div class="about-row-aligned">
            <div class="about-row-label">
              <span class="project-icon-wrap">${icons.globe}</span>
              <span>Project Links</span>
            </div>
            <div class="about-capsule project-capsule">
              <button class="capsule-link link-project" id="link-github" title="View Source on GitHub">
                ${icons.github}
                <span>GitHub</span>
                ${icons.external}
              </button>
              <span class="capsule-slash">/</span>
              <button class="capsule-link link-project" id="link-website" title="Visit Personal Website">
                ${icons.globe}
                <span>Website</span>
                ${icons.external}
              </button>
            </div>
          </div>

          <!-- Coffee Row (Left Label, Right Capsule) -->
          <div class="about-row-aligned">
            <div class="about-row-label">
              <span class="coffee-icon-wrap">${icons.coffee}</span>
              <span class="coffee-label">Buy me a coffee:</span>
            </div>
            <div class="coffee-capsule">
              <button class="capsule-link link-coffee" id="link-saweria">
                <span>Saweria</span>
                ${icons.external}
              </button>
              <span class="capsule-slash">/</span>
              <button class="capsule-link link-coffee" id="link-paypal">
                <span>PayPal</span>
                ${icons.external}
              </button>
            </div>
          </div>

          <div class="about-hairline"></div>

          <!-- Standalone Bug Report -->
          <div class="about-bug-row">
            <button class="standalone-bug-btn" id="link-bug">
              <span class="bug-icon-wrap">${icons.bug}</span>
              <span>Report an Issue or Bug</span>
              ${icons.external}
            </button>
          </div>

          <!-- Engine Stack Attribution inside About Pane -->
          <div class="about-engine-meta">
            <span>Engine: Tauri v2 • Rust Tokio</span>
            <span>Webview2 & TypeScript</span>
          </div>
        </div>
      </div>
    `;
  }

  private render(): void {
    this.container.innerHTML = this.renderHtml();
  }

  public bindEvents(): void {
    const heartBtn = this.container.querySelector("#btn-sprout-heart") as HTMLElement | null;
    const aboutBox = this.container.querySelector(".about-box") as HTMLElement | null;
    if (heartBtn && aboutBox) {
      this.heartSproutCleanup?.();
      this.heartSproutCleanup = attachHeartSprout(heartBtn, aboutBox);
    }

    this.container.querySelector("#link-github")?.addEventListener("click", () => {
      openUrl("https://github.com/Crlyzd/Cathet");
    });

    this.container.querySelector("#link-website")?.addEventListener("click", () => {
      openUrl("https://kaleksananbagus.com/");
    });

    this.container.querySelector("#link-saweria")?.addEventListener("click", () => {
      openUrl("https://saweria.co/curlyzed");
    });

    this.container.querySelector("#link-paypal")?.addEventListener("click", () => {
      openUrl("https://paypal.me/BagusMassani");
    });

    this.container.querySelector("#link-bug")?.addEventListener("click", () => {
      openUrl("https://docs.google.com/forms/d/e/1FAIpQLSf9RoZ7ANybXnsOQMyCAFXxSB85rJxr2z767aPOk_gECioiMg/viewform");
    });
  }

  public destroy(): void {
    this.heartSproutCleanup?.();
    this.heartSproutCleanup = null;
  }
}
