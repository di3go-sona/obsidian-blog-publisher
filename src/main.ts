import { Notice, Plugin, TFile } from "obsidian";
import {
  BlogPublisherSettings,
  DEFAULT_SETTINGS,
  BlogPublisherSettingTab,
} from "./settings";
import { syncVaultToBlog } from "./sync";
import { startPreview, stopPreview } from "./preview";
import { publish } from "./publish";

const BLOG_TEMPLATE = `---
published: {{date}}
type: article
CTF:
Part:
Github:
  -
Tags:
  -
---
`;

export default class BlogPublisherPlugin extends Plugin {
  settings: BlogPublisherSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();

    this.addRibbonIcon("refresh-cw", "Blog: Sync", async () => {
      await this.runSync();
    });

    this.addRibbonIcon("upload-cloud", "Blog: Publish", async () => {
      await this.runPublish();
    });

    this.addCommand({
      id: "blog-sync",
      name: "Sync notes to blog",
      callback: () => this.runSync(),
    });

    this.addCommand({
      id: "blog-publish",
      name: "Publish blog (git push)",
      callback: () => this.runPublish(),
    });

    this.addSettingTab(new BlogPublisherSettingTab(this.app, this));

    this.registerEvent(
      this.app.vault.on("create", (file) => {
        this.onFileCreated(file);
      })
    );
  }

  onunload() {
    stopPreview();
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private isBlogFile(file: TFile): boolean {
    if (file.extension !== "md") return false;

    const pagesPrefix = this.settings.vaultPagesPath + "/";
    const draftsPrefix = this.settings.vaultDraftsPath + "/";

    return file.path.startsWith(pagesPrefix) || file.path.startsWith(draftsPrefix);
  }

  private async onFileCreated(file: TFile) {
    if (!this.isBlogFile(file)) return;

    try {
      const content = await this.app.vault.read(file);
      if (content.startsWith("---")) return;

      const today = new Date().toISOString().split("T")[0];
      const template = BLOG_TEMPLATE.replace("{{date}}", today);
      await this.app.vault.modify(file, template + content);
    } catch {
      // file may not be readable yet, skip
    }
  }

  private async runSync() {
    try {
      const result = await syncVaultToBlog(this.app, this.settings);
      if (result.errors.length === 0) {
        await startPreview(this.settings);
      }
    } catch (err) {
      console.error("[Blog Publisher] Sync failed:", err);
      new Notice(`Blog Publisher: Sync failed — ${(err as Error).message}`, 8000);
    }
  }

  private async runPublish() {
    await publish(this.settings);
  }
}
