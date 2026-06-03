import * as fs from "fs";
import * as path from "path";
import { log, notifyError } from "./utils";
import type { FolderMapping } from "./settings";
import { slugify } from "./utils";

const OBSIDIAN_EMBED_REGEX = /!\[\[([^|\]]+?)(?:\|([^\]]*))?\]\]/g;
const OBSIDIAN_LINK_REGEX = /\[\[([\w/][^|\]]*?)(?:\|([^\]]*))?\]\]/g;

export interface AttachmentResult {
  content: string;
  copiedFiles: string[];
  errors: string[];
}

export function processAttachments(
  content: string,
  assetsPath: string,
  targetDirPath: string
): AttachmentResult {
  const copiedFiles: string[] = [];
  const errors: string[] = [];
  let result = content;

  const matches = [...content.matchAll(OBSIDIAN_EMBED_REGEX)];

  for (const match of matches) {
    const fullMatch = match[0];
    let attachmentName = match[1];

    if (attachmentName.startsWith("Assets/")) {
      attachmentName = attachmentName.substring(7);
    }

    const sourcePath = path.join(assetsPath, attachmentName);
    const targetPath = path.join(targetDirPath, attachmentName);

    if (!fs.existsSync(sourcePath)) {
      errors.push(`Attachment not found: ${attachmentName}`);
      continue;
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(sourcePath, targetPath);
    copiedFiles.push(attachmentName);
    log(`Copied attachment: ${attachmentName}`);

    const altText = match[2] || attachmentName;
    result = result.replace(fullMatch, `![${altText}](./${attachmentName})`);
  }

  return { content: result, copiedFiles, errors };
}

export interface WikiLinkResult {
  content: string;
  resolved: number;
  errors: string[];
}

export function processWikiLinks(
  content: string,
  vaultPagesPath: string,
  folderMappings: FolderMapping[]
): WikiLinkResult {
  let resolved = 0;
  const errors: string[] = [];
  let result = content;

  const mappingMap = new Map<string, string>();
  for (const m of folderMappings) {
    mappingMap.set(m.sourceFolder.toLowerCase(), m.targetFolder);
  }

  const matches = [...result.matchAll(OBSIDIAN_LINK_REGEX)];

  for (const match of matches) {
    const fullMatch = match[0];
    let linkPath = match[1].trim();
    const displayText = match[2];

    if (linkPath.startsWith("Assets/")) continue;

    let relativePath = linkPath;
    const pagesPrefix = vaultPagesPath + "/";
    if (relativePath.toLowerCase().startsWith(pagesPrefix.toLowerCase())) {
      relativePath = relativePath.substring(pagesPrefix.length);
    }

    const parts = relativePath.split("/");
    if (parts.length < 2) continue;

    const sourceFolder = parts[0];
    const pageName = parts.slice(1).join("/").replace(/\.md$/, "");

    const targetFolder = mappingMap.get(sourceFolder.toLowerCase());
    if (!targetFolder) {
      errors.push(`Wiki-link "${linkPath}": no folder mapping for "${sourceFolder}"`);
      continue;
    }

    const slug = slugify(pageName);
    const url = `/${targetFolder}/${slug}`;
    const label = displayText || pageName;

    result = result.replace(fullMatch, `[${label}](${url})`);
    resolved++;
    log(`Resolved wiki-link: ${linkPath} → ${url}`);
  }

  return { content: result, resolved, errors };
}
