export interface HomeCategoryTabsCallbacks {
  onSelectFolder: (folder: string) => void;
  onRequestNewFolder: () => void;
}

export class HomeCategoryTabsComponent {
  private element: HTMLElement;
  private callbacks: HomeCategoryTabsCallbacks;
  private activeFolder = "All";
  private folders: string[] = [];

  constructor(container: HTMLElement, callbacks: HomeCategoryTabsCallbacks) {
    this.callbacks = callbacks;
    this.element = document.createElement("div");
    this.element.className = "home-category-tabs";
    container.appendChild(this.element);
    this.render();
  }

  setFolders(folders: string[], active = "All"): void {
    this.folders = folders;
    this.activeFolder = active;
    this.render();
  }

  setActiveFolder(folder: string): void {
    this.activeFolder = folder;
    const chips = this.element.querySelectorAll(".home-tab-chip");
    chips.forEach((c) => {
      const f = c.getAttribute("data-folder");
      c.classList.toggle("active", f === folder);
    });
  }

  private render(): void {
    this.element.innerHTML = "";
    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "home-tabs-scroll";

    const allChip = this.createChip("All", "All", this.activeFolder === "All");
    scrollWrapper.appendChild(allChip);

    for (const folder of this.folders) {
      const chip = this.createChip(folder, folder, this.activeFolder === folder);
      scrollWrapper.appendChild(chip);
    }

    const addChip = document.createElement("button");
    addChip.className = "home-tab-chip home-tab-add";
    addChip.title = "Create New Folder";
    addChip.innerHTML = `<span class="home-tab-add-icon">+</span>`;
    addChip.addEventListener("click", (e) => {
      e.stopPropagation();
      this.callbacks.onRequestNewFolder();
    });
    scrollWrapper.appendChild(addChip);

    this.element.appendChild(scrollWrapper);
  }

  private createChip(label: string, folderValue: string, isActive: boolean): HTMLButtonElement {
    const chip = document.createElement("button");
    chip.className = `home-tab-chip${isActive ? " active" : ""}`;
    chip.setAttribute("data-folder", folderValue);
    chip.textContent = label;

    chip.addEventListener("click", () => {
      this.setActiveFolder(folderValue);
      this.callbacks.onSelectFolder(folderValue);
    });

    return chip;
  }

  destroy(): void {
    this.element.remove();
  }
}

