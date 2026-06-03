import { exec } from "child_process";
import type { BlogPublisherSettings } from "./settings";
import { log, notify, notifyError } from "./utils";

function execAsync(command: string, options?: { cwd?: string }): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, { cwd: options?.cwd, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

export async function publish(settings: BlogPublisherSettings): Promise<void> {
  const blogRepoPath = settings.blogRepoPath;

  try {
    const status = await execAsync("git status --porcelain", { cwd: blogRepoPath });

    if (!status) {
      notify("Nothing to publish — no changes detected.");
      return;
    }

    await execAsync("git add -A", { cwd: blogRepoPath });

    const date = new Date().toISOString().split("T")[0];
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const commitMessage = `publish: ${date} ${timestamp}`;

    await execAsync(`git commit -m "${commitMessage}"`, { cwd: blogRepoPath });
    log(`Committed: ${commitMessage}`);

    await execAsync("git push", { cwd: blogRepoPath });
    log("Pushed to remote");

    notify("Published! Changes pushed to remote.");
  } catch (err) {
    notifyError(`Publish failed: ${(err as Error).message}`);
  }
}
