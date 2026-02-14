# File I/O

OpenAPI Editor handles file operations through Tauri's filesystem APIs, with support for recent files, autosave, and clipboard operations.

## File Operations

All file I/O is implemented in `src/store/actions/file-actions.ts` and coordinates between Tauri APIs and both stores (spec-store, app-store).

### Open File

```typescript
import { dialog, fs } from '@tauri-apps/api';

export async function openFile() {
  try {
    // Show native file picker
    const filePath = await dialog.open({
      title: 'Open OpenAPI Spec',
      filters: [
        {
          name: 'OpenAPI',
          extensions: ['yaml', 'yml', 'json']
        }
      ],
      multiple: false,
    });
    
    if (!filePath || Array.isArray(filePath)) return;
    
    // Read file content
    const content = await fs.readTextFile(filePath);
    
    // Detect format
    const isJson = filePath.endsWith('.json');
    
    // Parse content
    let spec: OpenAPIObject;
    let document: Document | null;
    
    if (isJson) {
      // JSON: parse directly (no comment preservation)
      spec = JSON.parse(content);
      document = null;
    } else {
      // YAML: parse with comment preservation
      const parseResult = parseYaml(content);
      
      if (parseResult.errors.length > 0) {
        throw new Error(
          `YAML parsing errors:\n${parseResult.errors.map(e => e.message).join('\n')}`
        );
      }
      
      spec = parseResult.spec;
      document = parseResult.document;
    }
    
    // Update spec store
    useSpecStore.getState().setSpec(spec, document, filePath);
    
    // Clear undo history (new file = fresh history)
    useTemporalStore.getState().clear();
    
    // Add to recent files
    await addToRecentFiles(filePath);
    
    // Clear any previous errors
    useAppStore.getState().setError(null);
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to open file: ${err.message}`);
  }
}
```

### Save File

```typescript
export async function saveFile() {
  try {
    const { yamlDocument, spec, filePath } = useSpecStore.getState();
    
    if (!filePath) {
      // No file path - trigger "Save As"
      return await saveFileAs();
    }
    
    // Detect format
    const isJson = filePath.endsWith('.json');
    
    // Serialize content
    let content: string;
    
    if (isJson) {
      content = JSON.stringify(spec, null, 2);
    } else {
      // YAML with comment preservation
      if (!yamlDocument) {
        throw new Error('YAML document not available');
      }
      content = stringifyYaml(yamlDocument);
    }
    
    // Write to file
    await fs.writeTextFile(filePath, content);
    
    // Clear dirty flag
    useSpecStore.getState().setDirty(false);
    
    // Update recent files timestamp
    await addToRecentFiles(filePath);
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to save file: ${err.message}`);
  }
}
```

### Save File As

```typescript
export async function saveFileAs() {
  try {
    const { yamlDocument, spec } = useSpecStore.getState();
    
    // Show native save dialog
    const filePath = await dialog.save({
      title: 'Save OpenAPI Spec',
      filters: [
        {
          name: 'YAML',
          extensions: ['yaml', 'yml']
        },
        {
          name: 'JSON',
          extensions: ['json']
        }
      ],
      defaultPath: 'openapi.yaml',
    });
    
    if (!filePath) return;
    
    // Update file path in store
    useSpecStore.getState().setFilePath(filePath);
    
    // Save to new path
    await saveFile();
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to save file: ${err.message}`);
  }
}
```

### New File

```typescript
import { getDefaultSpec } from '../lib/spec-template';

export async function newFile() {
  try {
    // Get default OpenAPI template
    const spec = getDefaultSpec();
    
    // Parse as YAML document for comment preservation
    const yamlContent = stringifyYaml(spec);
    const { document } = parseYaml(yamlContent);
    
    // Clear current file
    useSpecStore.getState().setSpec(spec, document, null);
    
    // Clear undo history
    useTemporalStore.getState().clear();
    
    // Clear dirty flag (new file starts clean)
    useSpecStore.getState().setDirty(false);
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to create new file: ${err.message}`);
  }
}
```

### Close File

```typescript
export async function closeFile(): Promise<boolean> {
  const { isDirty } = useSpecStore.getState();
  
  // Check for unsaved changes
  if (isDirty) {
    const confirmed = await dialog.ask(
      'You have unsaved changes. Do you want to save before closing?',
      {
        type: 'warning',
        title: 'Unsaved Changes',
        okLabel: 'Save',
        cancelLabel: 'Discard',
      }
    );
    
    if (confirmed) {
      await saveFile();
    }
  }
  
  // Clear spec store
  useSpecStore.getState().clear();
  
  // Clear undo history
  useTemporalStore.getState().clear();
  
  return true;
}
```

## Recent Files

Recent files are persisted to disk using Tauri's filesystem APIs.

### Storage Location

```typescript
import { path } from '@tauri-apps/api';

async function getRecentFilesPath(): Promise<string> {
  // Store in app config directory
  const configDir = await path.configDir();
  return await path.join(configDir, 'openapi-editor', 'recent-files.json');
}
```

**Path examples:**
- Linux: `~/.config/openapi-editor/recent-files.json`
- macOS: `~/Library/Application Support/openapi-editor/recent-files.json`
- Windows: `%APPDATA%\openapi-editor\recent-files.json`

### Data Structure

```typescript
interface RecentFile {
  path: string;           // Absolute file path
  name: string;           // File name (for display)
  lastOpened: number;     // Timestamp (Date.now())
}

// Stored as JSON array
type RecentFilesList = RecentFile[];
```

### Load Recent Files

```typescript
export async function loadRecentFiles(): Promise<RecentFile[]> {
  try {
    const recentFilesPath = await getRecentFilesPath();
    
    // Check if file exists
    const exists = await fs.exists(recentFilesPath);
    if (!exists) return [];
    
    // Read and parse
    const content = await fs.readTextFile(recentFilesPath);
    const files = JSON.parse(content) as RecentFile[];
    
    // Filter out non-existent files
    const validFiles = [];
    for (const file of files) {
      const fileExists = await fs.exists(file.path);
      if (fileExists) {
        validFiles.push(file);
      }
    }
    
    // Sort by last opened (most recent first)
    validFiles.sort((a, b) => b.lastOpened - a.lastOpened);
    
    return validFiles.slice(0, 10);  // Keep only 10 most recent
    
  } catch (err) {
    console.error('Failed to load recent files:', err);
    return [];
  }
}
```

### Add to Recent Files

```typescript
export async function addToRecentFiles(filePath: string) {
  try {
    // Load existing recent files
    const recentFiles = await loadRecentFiles();
    
    // Remove duplicates (if file already in list)
    const filtered = recentFiles.filter(f => f.path !== filePath);
    
    // Add new entry at front
    const newFile: RecentFile = {
      path: filePath,
      name: await path.basename(filePath),
      lastOpened: Date.now(),
    };
    
    const updated = [newFile, ...filtered].slice(0, 10);
    
    // Save back to disk
    const recentFilesPath = await getRecentFilesPath();
    
    // Ensure directory exists
    const dir = await path.dirname(recentFilesPath);
    await fs.createDir(dir, { recursive: true });
    
    // Write JSON
    await fs.writeTextFile(recentFilesPath, JSON.stringify(updated, null, 2));
    
    // Update app store
    useAppStore.getState().setRecentFiles(updated);
    
  } catch (err) {
    console.error('Failed to add to recent files:', err);
  }
}
```

### Recent Files Menu

```typescript
export function RecentFilesMenu() {
  const recentFiles = useAppStore(state => state.recentFiles);
  
  if (recentFiles.length === 0) {
    return <div className="menu-item disabled">No recent files</div>;
  }
  
  return (
    <div className="recent-files-menu">
      {recentFiles.map(file => (
        <div
          key={file.path}
          className="menu-item"
          onClick={() => openRecentFile(file.path)}
        >
          <span className="file-name">{file.name}</span>
          <span className="file-path">{file.path}</span>
          <span className="file-time">{formatTimestamp(file.lastOpened)}</span>
        </div>
      ))}
    </div>
  );
}

async function openRecentFile(filePath: string) {
  try {
    const content = await fs.readTextFile(filePath);
    const { document, spec } = parseYaml(content);
    
    useSpecStore.getState().setSpec(spec, document, filePath);
    useTemporalStore.getState().clear();
    
    await addToRecentFiles(filePath);
  } catch (err) {
    useAppStore.getState().setError(`Failed to open recent file: ${err.message}`);
  }
}
```

## Clipboard Operations

### Copy Spec

```typescript
import { clipboard } from '@tauri-apps/api';

export async function copySpecToClipboard() {
  try {
    const { yamlDocument, spec, filePath } = useSpecStore.getState();
    
    const isJson = filePath?.endsWith('.json');
    
    let content: string;
    if (isJson) {
      content = JSON.stringify(spec, null, 2);
    } else {
      content = stringifyYaml(yamlDocument);
    }
    
    await clipboard.writeText(content);
    
    // Show toast notification
    showToast('Spec copied to clipboard');
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to copy: ${err.message}`);
  }
}
```

### Paste Spec

```typescript
export async function pasteSpecFromClipboard() {
  try {
    const content = await clipboard.readText();
    
    if (!content) {
      throw new Error('Clipboard is empty');
    }
    
    // Try parsing as JSON first
    try {
      const spec = JSON.parse(content);
      useSpecStore.getState().setSpec(spec, null, null);
      useTemporalStore.getState().clear();
      return;
    } catch {
      // Not JSON, try YAML
    }
    
    // Try parsing as YAML
    const { document, spec, errors } = parseYaml(content);
    
    if (errors.length > 0) {
      throw new Error(`Invalid OpenAPI spec:\n${errors.map(e => e.message).join('\n')}`);
    }
    
    useSpecStore.getState().setSpec(spec, document, null);
    useTemporalStore.getState().clear();
    
  } catch (err) {
    useAppStore.getState().setError(`Failed to paste: ${err.message}`);
  }
}
```

## Autosave (Future Enhancement)

Autosave is not currently implemented but planned:

```typescript
// Proposed implementation
let autosaveTimer: number | null = null;

export function enableAutosave(intervalMs: number = 30000) {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
  }
  
  autosaveTimer = setInterval(async () => {
    const { isDirty, filePath } = useSpecStore.getState();
    
    // Only autosave if:
    // 1. File has unsaved changes
    // 2. File has a path (not "Untitled")
    if (isDirty && filePath) {
      await saveFile();
      console.log('Autosaved:', filePath);
    }
  }, intervalMs);
}

export function disableAutosave() {
  if (autosaveTimer) {
    clearInterval(autosaveTimer);
    autosaveTimer = null;
  }
}
```

## Error Handling

### File Not Found

```typescript
try {
  const content = await fs.readTextFile(filePath);
  // ...
} catch (err) {
  if (err.message.includes('not found')) {
    useAppStore.getState().setError('File not found. It may have been moved or deleted.');
    // Remove from recent files
    removeFromRecentFiles(filePath);
  } else {
    useAppStore.getState().setError(`Failed to open file: ${err.message}`);
  }
}
```

### Permission Denied

```typescript
try {
  await fs.writeTextFile(filePath, content);
} catch (err) {
  if (err.message.includes('permission')) {
    useAppStore.getState().setError('Permission denied. Check file permissions and try again.');
  } else {
    useAppStore.getState().setError(`Failed to save file: ${err.message}`);
  }
}
```

### Invalid Spec

```typescript
const { document, spec, errors } = parseYaml(content);

if (errors.length > 0) {
  // Show parsing errors
  useAppStore.getState().setError(
    `YAML parsing errors:\n${errors.map(e => `Line ${e.line}: ${e.message}`).join('\n')}`
  );
  return;
}

// Validate OpenAPI schema
const validationResult = await validateSpec(spec);

if (!validationResult.valid) {
  // Allow opening but show warnings
  useAppStore.getState().setError(
    `OpenAPI validation warnings:\n${validationResult.errors.map(e => e.message).join('\n')}`
  );
}

useSpecStore.getState().setSpec(spec, document, filePath);
```

## Keyboard Shortcuts

File operations are mapped to standard keyboard shortcuts:

| Action | Shortcut |
|--------|----------|
| New File | Ctrl+N / Cmd+N |
| Open File | Ctrl+O / Cmd+O |
| Save File | Ctrl+S / Cmd+S |
| Save As | Ctrl+Shift+S / Cmd+Shift+S |
| Close File | Ctrl+W / Cmd+W |

```typescript
// In keyboard handler
function useFileShortcuts() {
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const modifier = e.ctrlKey || e.metaKey;
      
      if (modifier && e.key === 'n') {
        e.preventDefault();
        await newFile();
      }
      
      if (modifier && e.key === 'o') {
        e.preventDefault();
        await openFile();
      }
      
      if (modifier && e.key === 's') {
        e.preventDefault();
        if (e.shiftKey) {
          await saveFileAs();
        } else {
          await saveFile();
        }
      }
      
      if (modifier && e.key === 'w') {
        e.preventDefault();
        await closeFile();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
```

## File Watchers (Future Enhancement)

Not implemented, but planned for auto-reload on external changes:

```typescript
// Proposed implementation using Tauri's fs watch
import { fs } from '@tauri-apps/api';

let unwatchFn: (() => void) | null = null;

export async function watchFile(filePath: string) {
  if (unwatchFn) {
    unwatchFn();
  }
  
  unwatchFn = await fs.watch(filePath, async (event) => {
    if (event.type === 'modify') {
      const { isDirty } = useSpecStore.getState();
      
      if (isDirty) {
        // Show dialog: reload or keep local changes?
        const reload = await dialog.ask(
          'File was modified externally. Reload and discard local changes?',
          { type: 'warning', title: 'File Modified' }
        );
        
        if (!reload) return;
      }
      
      // Reload file
      const content = await fs.readTextFile(filePath);
      const { document, spec } = parseYaml(content);
      useSpecStore.getState().setSpec(spec, document, filePath);
      useTemporalStore.getState().clear();
    }
  });
}
```

## Related Documentation

- [State Management](../architecture/state-management.md) - File state in stores
- [YAML Engine](../architecture/yaml-engine.md) - Parsing/serialization
- [Validation](validation.md) - Validation on file open
- [Undo/Redo](undo-redo.md) - History cleared on file open
