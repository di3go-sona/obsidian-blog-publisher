export interface SyncedFrontmatter {
  filename: string;
  series?: string;
  published: string;
  part?: number;
}

export function checkAmbiguousOrdering(
  entries: SyncedFrontmatter[]
): string[] {
  const errors: string[] = [];

  // Group by series
  const bySeries = new Map<string, SyncedFrontmatter[]>();
  for (const entry of entries) {
    if (!entry.series) continue;
    const group = bySeries.get(entry.series);
    if (group) {
      group.push(entry);
    } else {
      bySeries.set(entry.series, [entry]);
    }
  }

  for (const [series, posts] of bySeries) {
    // Group by published date within the series
    const byDate = new Map<string, SyncedFrontmatter[]>();
    for (const post of posts) {
      const group = byDate.get(post.published);
      if (group) {
        group.push(post);
      } else {
        byDate.set(post.published, [post]);
      }
    }

    for (const [date, sameDatePosts] of byDate) {
      if (sameDatePosts.length < 2) continue;

      // Check if all posts with this date have part
      const missingPart = sameDatePosts.filter((p) => p.part === undefined);
      if (missingPart.length > 0) {
        const names = sameDatePosts.map((p) => p.filename).join(", ");
        errors.push(
          `Series "${series}" has ${sameDatePosts.length} articles on ${date} (${names}) but some are missing "part" — ordering may be ambiguous`
        );
      }
    }
  }

  return errors;
}
