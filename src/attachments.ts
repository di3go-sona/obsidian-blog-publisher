import * as fs from "fs";
import * as path from "path";
import { log, notifyError } from "./utils";

const OBSIDIAN_EMBED_REGEX = /!\[\[([^|\]]+?)(?:\|([^\]]*))?\]\]/g;

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
