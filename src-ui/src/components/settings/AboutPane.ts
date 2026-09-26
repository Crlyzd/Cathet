import { icons } from "../../utils/monochromeIcons";
import { openUrl } from "@tauri-apps/plugin-opener";

export class AboutPaneComponent {
  private container: HTMLElement;

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
            <span class="minimal-heart-wrap">${icons.heart}</span>
            <span>by</span>
            <a class="author-name-link" id="link-author">Kaleksanan Bagus</a>
          </div>

          <!-- Coffee Row with Capsule -->
          <div class="about-coffee-row">
            <span class="coffee-icon-wrap">${icons.coffee}</span>
            <span class="coffee-label">Buy me a coffee:</span>
            <div class="coffee-capsule">
              <button class="capsule-link" id="link-saweria">
                <span>Saweria</span>
                ${icons.external}
              </button>
              <span class="capsule-slash">/</span>
              <button class="capsule-link" id="link-paypal">
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
    this.container.querySelector("#link-author")?.addEventListener("click", () => {
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
}
