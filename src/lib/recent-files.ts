import {
  readTextFile,
  writeTextFile,
  mkdir,
  exists,
} from "@tauri-apps/plugin-fs";
import { appDataDir, join } from "@tauri-apps/api/path";

export interface RecentFileEntry {
  path: string;
  openedAt: number;
}

const RECENT_FILES_FILENAME = "recent-files.json";
const MAX_RECENT_FILES = 10;

async function getRecentFilesPath(): Promise<string> {
  const dataDir = await appDataDir();
  return join(dataDir, RECENT_FILES_FILENAME);
}

export async function loadRecentFiles(): Promise<RecentFileEntry[]> {
  try {
    const filePath = await getRecentFilesPath();
    const dirExists = await exists(await appDataDir());
    if (!dirExists) return [];

    const fileExists = await exists(filePath);
    if (!fileExists) return [];

    const content = await readTextFile(filePath);
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry: unknown): entry is RecentFileEntry =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as RecentFileEntry).path === "string" &&
          typeof (entry as RecentFileEntry).openedAt === "number",
      )
      .slice(0, MAX_RECENT_FILES);
  } catch {
    return [];
  }
}

export async function saveRecentFiles(
  files: RecentFileEntry[],
): Promise<void> {
  const filePath = await getRecentFilesPath();
  const dataDir = await appDataDir();

  const dirExists = await exists(dataDir);
  if (!dirExists) {
    await mkdir(dataDir, { recursive: true });
  }

  const trimmed = files.slice(0, MAX_RECENT_FILES);
  await writeTextFile(filePath, JSON.stringify(trimmed, null, 2));
}
