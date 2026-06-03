import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/;

export interface TransformedFrontmatter {
  title: string;
  published: string;
  series?: string;
  tags?: string[];
  github?: string[];
  description?: string;
  draft?: boolean;
  author?: string;
  toc?: boolean;
}

export interface FrontmatterResult {
  newFrontmatter: TransformedFrontmatter;
  originalMatch: string;
  newFrontmatterStr: string;
  errors: string[];
}

function stripHashFromTags(tags: unknown): string[] | undefined {
  if (!Array.isArray(tags)) return undefined;
  if (tags.length === 0) return undefined;
  return (tags as string[]).map((t) => String(t).replace(/^#/, ""));
}

function pickCaseInsensitive(
  obj: Record<string, unknown>,
  key: string
): unknown | undefined {
  const lowerKey = key.toLowerCase();
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lowerKey) return obj[k];
  }
  return undefined;
}

function hasKeyCaseInsensitive(obj: Record<string, unknown>, key: string): boolean {
  const lowerKey = key.toLowerCase();
  return Object.keys(obj).some((k) => k.toLowerCase() === lowerKey);
}

export function parseAndTransformFrontmatter(
  content: string,
  filename: string
): FrontmatterResult {
  const errors: string[] = [];
  const match = content.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      newFrontmatter: { title: filename, published: "" },
      originalMatch: "",
      newFrontmatterStr: "",
      errors: [`No frontmatter found in ${filename}`],
    };
  }

  const originalMatch = match[0];
  const rawFrontmatter = parseYaml(match[1]) as Record<string, unknown>;

  const newFrontmatter: TransformedFrontmatter = {
    title: filename,
    published: "",
  };

  const published = pickCaseInsensitive(rawFrontmatter, "published")
    ?? pickCaseInsensitive(rawFrontmatter, "Created");
  if (published) {
    newFrontmatter.published = String(published);
  } else {
    errors.push(`${filename}: missing "published" field in frontmatter`);
  }

  const hasPart =
    hasKeyCaseInsensitive(rawFrontmatter, "part") ||
    hasKeyCaseInsensitive(rawFrontmatter, "Part");
  if (hasPart) {
    const ctfValue = pickCaseInsensitive(rawFrontmatter, "ctf");
    if (ctfValue) {
      newFrontmatter.series = String(ctfValue);
    } else {
      errors.push(`${filename}: has "Part" but no "CTF" field`);
    }
  }

  const tags = pickCaseInsensitive(rawFrontmatter, "tags");
  const stripped = stripHashFromTags(tags);
  if (stripped) {
    newFrontmatter.tags = stripped;
  }

  const github = pickCaseInsensitive(rawFrontmatter, "github");
  if (github) {
    if (Array.isArray(github)) {
      const filtered = (github as string[]).filter((v) => String(v).trim() !== "");
      if (filtered.length > 0) {
        newFrontmatter.github = filtered.map((v) => String(v));
      }
    } else if (String(github).trim() !== "") {
      newFrontmatter.github = [String(github)];
    }
  }

  const description = pickCaseInsensitive(rawFrontmatter, "description");
  if (description && String(description).trim() !== "") {
    newFrontmatter.description = String(description);
  }

  const draft = pickCaseInsensitive(rawFrontmatter, "draft");
  if (draft !== undefined) {
    newFrontmatter.draft = Boolean(draft);
  }

  const author = pickCaseInsensitive(rawFrontmatter, "author");
  if (author && String(author).trim() !== "") {
    newFrontmatter.author = String(author);
  }

  const toc = pickCaseInsensitive(rawFrontmatter, "toc");
  if (toc !== undefined) {
    newFrontmatter.toc = Boolean(toc);
  }

  const yamlStr = stringifyYaml(newFrontmatter as Record<string, unknown>);
  const newFrontmatterStr = `---\n${yamlStr}---\n`;

  return { newFrontmatter, originalMatch, newFrontmatterStr, errors };
}

export function replaceFrontmatter(
  content: string,
  originalMatch: string,
  newFrontmatterStr: string
): string {
  if (!originalMatch) return content;
  return content.replace(originalMatch, newFrontmatterStr);
}

export function validateFrontmatter(
  fm: TransformedFrontmatter,
  filename: string
): string[] {
  const errors: string[] = [];
  if (!fm.title) errors.push(`${filename}: missing "title"`);
  if (!fm.published) errors.push(`${filename}: missing "published" date`);
  return errors;
}
