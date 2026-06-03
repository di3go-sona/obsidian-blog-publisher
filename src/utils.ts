import { Notice } from "obsidian";

export function slugify(filename: string): string {
  return filename.toLowerCase().replace(/ /g, "-");
}

export function log(msg: string): void {
  console.log(`[Blog Publisher] ${msg}`);
}

export function notify(msg: string, duration = 4000): void {
  new Notice(`Blog Publisher: ${msg}`, duration);
}

export function notifyError(msg: string): void {
  new Notice(`Blog Publisher: ${msg}`, 8000);
  console.error(`[Blog Publisher] ${msg}`);
}
