# Obsidian Blog Publisher

An Obsidian plugin that syncs your vault notes to an [Astro](https://astro.build/) blog, starts a live preview, and publishes via git push.

Built for the [multiterm-astro](https://github.com/di3go-sona/blog-astro) blog template.

## Features

- **Sync** — Incrementally syncs notes from your vault to the Astro blog's `src/content/` directory
  - Transforms frontmatter (title from filename, `published` date, `series` from CTF, tags, github link)
  - Copies attachments and converts `![[file]]` → `![file](./file)` markdown syntax
  - Creates slug-based directory structure (`slug/index.md`)
  - Only re-processes new or modified files
  - Cleans up stale directories for deleted notes
- **Preview** — Starts the Astro dev server and opens it in your browser after a successful sync
- **Publish** — Commits and pushes changes to the blog repo (triggers your deployment pipeline)
- **Auto-template** — Automatically inserts frontmatter when creating new notes in blog folders

## Frontmatter

### Obsidian source fields

```yaml
---
published: 2026-06-03
CTF: CyberApocalypse 2025    # optional, for writeups
Part: "1"                     # optional, sets series from CTF
Github: https://github.com/... # optional, for projects
Tags:
  - Blockchain
description: ...              # optional
draft: false                  # optional
author: ...                   # optional
toc: true                     # optional
---
```

### Astro output fields

| Obsidian | Astro | Notes |
|----------|-------|-------|
| (filename) | `title` | Always set from filename |
| `published` | `published` | Required |
| `Tags` | `tags` | `#` prefix stripped |
| `CTF` + `Part` | `series` | Series name from CTF when Part exists |
| `Github` | `github` | Passed through |
| `description` | `description` | Passed through |
| `draft` | `draft` | Passed through |
| `author` | `author` | Passed through |
| `toc` | `toc` | Passed through |

## Installation

### Manual

1. Download `main.js`, `manifest.json`, `styles.css`, and `versions.json` from the [latest release](https://github.com/di3go-sona/obsidian-blog-publisher/releases)
2. Copy them to `<vault>/.obsidian/plugins/obsidian-blog-publisher/`
3. Enable the plugin in Obsidian Settings → Community Plugins

### From source

```bash
git clone https://github.com/di3go-sona/obsidian-blog-publisher.git
cd obsidian-blog-publisher
npm install
npm run build
```

Then copy `main.js`, `manifest.json`, `styles.css`, and `versions.json` to your vault's plugin directory.

## Configuration

Configure in Obsidian Settings → Blog Publisher:

| Setting | Default | Description |
|---------|---------|-------------|
| Blog repo path | `/Users/di3go/Projects/blog` | Absolute path to your Astro blog repo |
| Vault pages path | `Pages/🖋️ Blog` | Vault-relative path to published notes |
| Vault drafts path | `Pages/✏️ Blog Drafts` | Vault-relative path to draft notes (auto-template only, not synced) |
| Vault assets path | `Assets` | Vault-relative path to attachments |
| Preview port | `4321` | Port for the Astro dev server |
| Folder mappings | Articles→articles, Writeups→writeups, Projects→projects | Maps vault subfolders to `src/content/` subfolders |

## Commands

| Command | Description |
|---------|-------------|
| `Blog: Sync` | Sync notes and open preview |
| `Blog: Publish` | Git add, commit, and push |

## Auto-template

When you create a new `.md` file under your configured pages or drafts path, the plugin automatically inserts:

```yaml
---
published: <today>
CTF:
Part:
Github:
Tags:
  -
---
```

Remove the fields you don't need. The sync only includes non-empty fields in the output.

## Development

```bash
npm install
npm run dev      # watch mode
npm run build    # production build
```

## License

MIT
