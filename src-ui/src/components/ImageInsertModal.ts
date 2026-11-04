/**
 * ImageInsertModal.ts — Frosted glass popup dialog for inserting images in Cathet.
 * Supports manual URL/path input on Desktop and system photo picker on Android.
 */
import { PlatformService } from "../services/platformService";
import { formatDisplayTitle } from "../utils/pathUtils";

export interface ImageInsertResult {
  markdown?: string;
  file?: File;
  altText?: string;
}

export interface ImageInsertModalOptions {
  onInsert: (result: ImageInsertResult) => void;
  onCancel?: () => void;
}

const PHOTO_ICON = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;

export class ImageInsertModalComponent {
  private element: HTMLElement;
  private options: ImageInsertModalOptions;
  private isMobile: boolean;

  constructor(options: ImageInsertModalOptions) {
    this.options = options;
    this.isMobile = PlatformService.getInstance().isMobile();
    this.element = document.createElement("div");
    this.element.className = "image-modal-backdrop";
    this.render();
    document.body.appendChild(this.element);
    this.bindEvents();
  }

  private render(): void {
    const mobilePickerHtml = this.isMobile
      ? `
        <div class="image-modal-mobile-picker">
          <input type="file" id="image-modal-file-input" accept="image/*" style="display:none;" />
          <button type="button" class="image-modal-gallery-btn" id="image-modal-gallery-btn">
            ${PHOTO_ICON}
            <span>Choose from Gallery / Files</span>
          </button>
          <div class="image-modal-divider"><span>or enter address below</span></div>
        </div>
      `
      : "";

    this.element.innerHTML = `
      <div class="image-modal-card" role="dialog" aria-modal="true" aria-labelledby="image-modal-title">
        <h3 class="image-modal-title" id="image-modal-title">Insert Image</h3>
        ${mobilePickerHtml}
        <div class="image-modal-field">
          <label class="image-modal-label" for="image-modal-address">Image Address</label>
          <input
            type="text"
            id="image-modal-address"
            class="image-modal-input"
            placeholder="${this.isMobile ? 'https://example.com/image.png' : 'https://... or C:/path/to/image.png'}"
            spellcheck="false"
            autocomplete="off"
          />
        </div>
        <div class="image-modal-field">
          <label class="image-modal-label" for="image-modal-alt">Description / Alt Text (optional)</label>
          <input
            type="text"
            id="image-modal-alt"
            class="image-modal-input"
            placeholder="e.g. Diagram"
            spellcheck="false"
          />
        </div>
        <div class="image-modal-actions">
          <button type="button" class="image-modal-btn btn-cancel">Cancel</button>
          <button type="button" class="image-modal-btn btn-confirm primary">Insert</button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    const addressInput = this.element.querySelector("#image-modal-address") as HTMLInputElement;
    const altInput = this.element.querySelector("#image-modal-alt") as HTMLInputElement;
    const fileInput = this.element.querySelector("#image-modal-file-input") as HTMLInputElement | null;
    const galleryBtn = this.element.querySelector("#image-modal-gallery-btn") as HTMLButtonElement | null;

    // Focus address input
    setTimeout(() => {
      addressInput?.focus();
    }, 30);

    // Click outside to cancel
    this.element.addEventListener("click", (e) => {
      if (e.target === this.element) this.close();
    });

    this.element.querySelector(".btn-cancel")?.addEventListener("click", () => this.close());

    const submit = () => {
      const address = addressInput.value.trim();
      if (!address) {
        addressInput.focus();
        return;
      }

      let alt = altInput.value.trim();
      if (!alt) {
        const derived = formatDisplayTitle(address);
        alt = derived && derived !== "Untitled" ? derived : "Image";
      }

      this.options.onInsert({
        markdown: `![${alt}](${address})`,
        altText: alt,
      });
      this.close();
    };

    this.element.querySelector(".btn-confirm")?.addEventListener("click", submit);

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        this.close();
      }
    };

    addressInput.addEventListener("keydown", handleKey);
    altInput.addEventListener("keydown", handleKey);

    // Android gallery picker integration
    if (galleryBtn && fileInput) {
      galleryBtn.addEventListener("click", () => {
        fileInput.click();
      });

      fileInput.addEventListener("change", () => {
        const file = fileInput.files?.[0];
        if (file) {
          const alt = altInput.value.trim() || file.name.replace(/\.[^/.]+$/, "") || "Image";
          this.options.onInsert({ file, altText: alt });
          this.close();
        }
      });
    }
  }

  close(): void {
    this.options.onCancel?.();
    this.element.classList.add("closing");
    setTimeout(() => {
      this.element.remove();
    }, 120);
  }
}

