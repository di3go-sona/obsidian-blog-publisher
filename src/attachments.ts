import * as fs from "fs";
import * as path from "path";
import { log, notifyError } from "./utils";
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
  vaultPagesPath: string
): WikiLinkResult {
  let resolved = 0;
  const errors: string[] = [];
  let result = content;

  const matches = [...result.matchAll(OBSIDIAN_LINK_REGEX)];

  for (const match of matches) {
    const fullMatch = match[0];
    let linkPath = match[1].trim();
    const displayText = match[2];

    if (linkPath.startsWith("Assets/")) continue;

    let pageName = linkPath;
    const pagesPrefix = vaultPagesPath + "/";
    if (pageName.toLowerCase().startsWith(pagesPrefix.toLowerCase())) {
      pageName = pageName.substring(pagesPrefix.length);
    }

    // Strip any old subfolder prefix (Articles/, Writeups/, Projects/)
    pageName = pageName.replace(/^(Articles|Writeups|Projects)\//i, "");

    pageName = pageName.replace(/\.md$/, "");
    if (!pageName) continue;

    const slug = slugify(pageName);
    const url = `/blog/${slug}`;
    const label = displayText || pageName;

    result = result.replace(fullMatch, `[${label}](${url})`);
    resolved++;
    log(`Resolved wiki-link: ${linkPath} → ${url}`);
  }

  return { content: result, resolved, errors };
}
