import { App, PluginSettingTab, Setting } from "obsidian";
import type BlogPublisherPlugin from "./main";

export interface BlogPublisherSettings {
  blogRepoPath: string;
  vaultPagesPath: string;
  vaultDraftsPath: string;
  vaultAssetsPath: string;
  previewPort: number;
}

export const DEFAULT_SETTINGS: BlogPublisherSettings = {
  blogRepoPath: "/Users/di3go/Projects/blog",
  vaultPagesPath: "Pages/🖋️ Blog",
  vaultDraftsPath: "Pages/✏️ Blog Drafts",
  vaultAssetsPath: "Assets",
  previewPort: 4321,
};

export class BlogPublisherSettingTab extends PluginSettingTab {
  plugin: BlogPublisherPlugin;

  constructor(app: App, plugin: BlogPublisherPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Blog repo path")
      .setDesc("Absolute path to the Astro blog repository")
      .addText((text) =>
        text
          .setPlaceholder("/path/to/blog")
          .setValue(this.plugin.settings.blogRepoPath)
          .onChange(async (value) => {
            this.plugin.settings.blogRepoPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vault pages path")
      .setDesc("Relative path from vault root to the blog pages folder")
      .addText((text) =>
        text
          .setPlaceholder("Pages/🖋️ Blog")
          .setValue(this.plugin.settings.vaultPagesPath)
          .onChange(async (value) => {
            this.plugin.settings.vaultPagesPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vault drafts path")
      .setDesc("Relative path from vault root to the blog drafts folder")
      .addText((text) =>
        text
          .setPlaceholder("Pages/✏️ Blog Drafts")
          .setValue(this.plugin.settings.vaultDraftsPath)
          .onChange(async (value) => {
            this.plugin.settings.vaultDraftsPath = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Vault assets path")
      .setDesc("Relative path from vault root to the assets folder")
      .addText((text) =>
        text
          .setPlaceholder("Assets")
          .setValue(this.plugin.settings.vaultAssetsPath)
          .onChange(async (value) => {
            this.plugin.settings.vaultAssetsPath = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl("h3", { text: "Preview" });

    new Setting(containerEl)
      .setName("Preview port")
      .setDesc("Port for the Astro dev server preview")
      .addText((text) =>
        text
          .setPlaceholder("4321")
          .setValue(String(this.plugin.settings.previewPort))
          .onChange(async (value) => {
            const port = parseInt(value, 10);
            if (!isNaN(port) && port > 0 && port < 65536) {
              this.plugin.settings.previewPort = port;
              await this.plugin.saveSettings();
            }
          })
      );
  }
}
