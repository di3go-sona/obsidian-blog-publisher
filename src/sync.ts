import * as fs from "fs";
import * as path from "path";
import { App } from "obsidian";
import type { BlogPublisherSettings } from "./settings";
import { slugify, log, notify, notifyError } from "./utils";
import { parseAndTransformFrontmatter, replaceFrontmatter } from "./frontmatter";
import { processAttachments, processWikiLinks } from "./attachments";

export interface SyncResult {
  synced: number;
  skipped: number;
  deleted: number;
  errors: string[];
}

function listMarkdownFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((f) => fs.statSync(path.join(dirPath, f)).isFile() && f.endsWith(".md"));
}

function getMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}

function listTargetSlugDirs(targetFolderPath: string): Set<string> {
  if (!fs.existsSync(targetFolderPath)) return new Set();
  return new Set(
    fs
      .readdirSync(targetFolderPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
  );
}

function cleanupDeletedSources(
  targetFolderPath: string,
  syncedSlugs: Set<string>
): number {
  const existingSlugs = listTargetSlugDirs(targetFolderPath);
  let deleted = 0;
  for (const slug of existingSlugs) {
    if (!syncedSlugs.has(slug)) {
      const dirPath = path.join(targetFolderPath, slug);
      fs.rmSync(dirPath, { recursive: true, force: true });
      log(`Deleted stale directory: ${slug}`);
      deleted++;
    }
  }
  return deleted;
}

function syncFile(
  sourceFilePath: string,
  fullFilename: string,
  targetFolderPath: string,
  assetsPath: string,
  vaultPagesPath: string
): { errors: string[]; synced: boolean } {
  const filename = fullFilename.replace(/\.md$/, "");
  const targetDirname = slugify(filename);
  const targetDirPath = path.join(targetFolderPath, targetDirname);
  const targetFilePath = path.join(targetDirPath, "index.md");

  const sourceMtime = getMtime(sourceFilePath);
  const targetMtime = getMtime(targetFilePath);

  if (targetMtime > 0 && sourceMtime <= targetMtime) {
    return { errors: [], synced: false };
  }

  log(`Syncing: ${fullFilename}`);

  const fileContent = fs.readFileSync(sourceFilePath, "utf-8");
  const { originalMatch, newFrontmatterStr, errors: fmErrors } =
    parseAndTransformFrontmatter(fileContent, filename);

  if (fmErrors.length > 0 && !originalMatch) {
    return { errors: fmErrors, synced: false };
  }

  let content = replaceFrontmatter(fileContent, originalMatch, newFrontmatterStr);

  fs.mkdirSync(targetDirPath, { recursive: true });

  const { content: processedContent, errors: attErrors } = processAttachments(
    content,
    assetsPath,
    targetDirPath
  );

  const { content: linkedContent, errors: linkErrors } = processWikiLinks(
    processedContent,
    vaultPagesPath
  );

  fs.writeFileSync(targetFilePath, linkedContent, "utf-8");

  return { errors: [...fmErrors, ...attErrors, ...linkErrors], synced: true };
}

export async function syncVaultToBlog(
  app: App,
  settings: BlogPublisherSettings
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, deleted: 0, errors: [] };

  const vaultPath = (app.vault.adapter as any).getBasePath?.() as string | undefined;
  if (!vaultPath) {
    notifyError("Could not determine vault path");
    result.errors.push("Could not determine vault path");
    return result;
  }

  const pagesPath = path.join(vaultPath, settings.vaultPagesPath);
  const assetsPath = path.join(vaultPath, settings.vaultAssetsPath);
  const blogContentPath = path.join(settings.blogRepoPath, "src", "content", "blog");

  if (!fs.existsSync(pagesPath)) {
    notifyError(`Pages path not found: ${pagesPath}`);
    result.errors.push(`Pages path not found: ${pagesPath}`);
    return result;
  }

  fs.mkdirSync(blogContentPath, { recursive: true });

  const files = listMarkdownFiles(pagesPath);
  const allSyncedSlugs = new Set<string>();

  for (const fullFilename of files) {
    const sourceFilePath = path.join(pagesPath, fullFilename);
    const { errors, synced } = syncFile(
      sourceFilePath,
      fullFilename,
      blogContentPath,
      assetsPath,
      settings.vaultPagesPath
    );

    if (errors.length > 0) {
      result.errors.push(...errors);
    }

    if (synced) {
      result.synced++;
    } else {
      result.skipped++;
    }
    allSyncedSlugs.add(slugify(fullFilename.replace(/\.md$/, "")));
  }

  result.deleted = cleanupDeletedSources(blogContentPath, allSyncedSlugs);

  if (result.errors.length > 0) {
    const errorSummary = result.errors.join("\n");
    notifyError(`Sync had ${result.errors.length} error(s):\n${errorSummary}`);
    log(`Sync errors:\n${errorSummary}`);
  } else {
    notify(
      `Synced ${result.synced} file(s), skipped ${result.skipped}, deleted ${result.deleted}`
    );
  }

  return result;
}
