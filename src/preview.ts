import { exec, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import type { BlogPublisherSettings } from "./settings";
import { log, notify, notifyError } from "./utils";

let previewProcess: ReturnType<typeof spawn> | null = null;

function getShellEnv(): { PATH: string; [k: string]: string } {
  const defaultPaths = [
    "/opt/homebrew/bin",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    "/usr/sbin",
    "/sbin",
  ];
  const existingPath = process.env.PATH || "";
  const merged = [
    ...defaultPaths.filter((p) => !existingPath.includes(p)),
    ...existingPath.split(":"),
  ].join(":");
  return { ...process.env, PATH: merged } as { PATH: string; [k: string]: string };
}

async function waitForServer(
  port: number,
  maxRetries = 30,
  intervalMs = 1000
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
          res.resume();
          resolve();
        });
        req.on("error", reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error("timeout"));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return false;
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) log(`Failed to open browser: ${err.message}`);
  });
}

export function isPreviewRunning(): boolean {
  return previewProcess !== null;
}

export function stopPreview(): void {
  if (previewProcess) {
    previewProcess.kill();
    previewProcess = null;
  }
}

export async function startPreview(settings: BlogPublisherSettings): Promise<void> {
  const port = settings.previewPort ?? 4321;
  const blogRepoPath = settings.blogRepoPath;

  if (isPreviewRunning()) {
    stopPreview();
    await new Promise((r) => setTimeout(r, 1000));
  }

  const viteCache = path.join(blogRepoPath, "node_modules", ".vite");
  if (fs.existsSync(viteCache)) {
    fs.rmSync(viteCache, { recursive: true, force: true });
    log("Cleared Vite cache");
  }

  log(`Starting Astro dev server in ${blogRepoPath} on port ${port}...`);

  previewProcess = spawn("npm", ["run", "dev", "--", "--port", String(port)], {
    cwd: blogRepoPath,
    shell: true,
    stdio: "pipe",
    env: getShellEnv(),
  });

  previewProcess.on("error", (err) => {
    notifyError(`Failed to start dev server: ${err.message}`);
    previewProcess = null;
  });

  previewProcess.on("exit", (code) => {
    if (code !== null && code !== 0 && previewProcess) {
      log(`Dev server exited with code ${code}`);
    }
    previewProcess = null;
  });

  notify("Starting preview server...");

  const ready = await waitForServer(port);
  if (ready) {
    const url = `http://localhost:${port}`;
    notify(`Preview ready at ${url}`);
    openBrowser(url);
  } else {
    notifyError("Preview server did not start in time. Check console for errors.");
  }
}
