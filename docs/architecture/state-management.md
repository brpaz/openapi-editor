# State Management

OpenAPI Editor uses Zustand for state management with Zundo for undo/redo functionality. The application maintains two separate stores with distinct responsibilities.

## Store Architecture

### Spec Store (`src/store/spec-store.ts`)

The primary store for OpenAPI specification editing state.

**State:**
```typescript
interface SpecStore {
  // Core spec data
  spec: OpenAPIObject;              // Parsed OpenAPI object
  yamlDocument: Document | null;    // eemeli/yaml Document AST
  filePath: string | null;          // Current file path
  isDirty: boolean;                 // Unsaved changes flag
  
  // Navigation
  selectedPath: string | null;      // Currently selected tree node path
  
  // Validation
  validationResult: ValidationResult | null;  // SwaggerParser results
  
  // Actions
  setSpec: (spec: OpenAPIObject, document: Document, filePath?: string) => void;
  updateField: (path: string, value: any) => void;
  setSelectedPath: (path: string | null) => void;
  setValidationResult: (result: ValidationResult | null) => void;
  setDirty: (dirty: boolean) => void;
  // ... more actions
}
```

**Zundo Integration:**

The spec store is wrapped with Zundo's `temporal` middleware to enable undo/redo:

```typescript
export const useSpecStore = create<SpecStore>()(
  temporal(
    (set, get) => ({
      // Store implementation
    }),
    {
      // Only track these fields in undo history
      partialize: (state): UndoState => ({
        spec: state.spec,
        yamlDocument: state.yamlDocument,
        isDirty: state.isDirty,
      }),
      
      // Only create undo state when spec actually changes
      equality: (pastState, currentState) =>
        pastState.spec === currentState.spec,
    },
  ),
);
```

**Undo/Redo Access:**

```typescript
import { useTemporalStore } from 'zundo';

// In components
const undo = useTemporalStore((state) => state.undo);
const redo = useTemporalStore((state) => state.redo);
const canUndo = useTemporalStore((state) => state.pastStates.length > 0);
const canRedo = useTemporalStore((state) => state.futureStates.length > 0);
```

### App Store (`src/store/app-store.ts`)

Handles UI state and application-level concerns not related to spec editing.

**State:**
```typescript
interface AppStore {
  // Sidebar state
  sidebarWidth: number;           // Persisted to localStorage
  sidebarCollapsed: boolean;
  
  // Recent files
  recentFiles: RecentFile[];      // Last 10 opened files
  
  // Error handling
  error: string | null;           // App-level error messages
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setSidebarWidth: (width: number) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  addRecentFile: (file: RecentFile) => void;
  setError: (error: string | null) => void;
  // ... more actions
}
```

**localStorage Persistence:**

```typescript
// On sidebar width change
setSidebarWidth: (width) => {
  set({ sidebarWidth: width });
  localStorage.setItem('sidebarWidth', String(width));
}

// On store initialization
const storedWidth = localStorage.getItem('sidebarWidth');
const sidebarWidth = storedWidth ? Number(storedWidth) : 300;
```

**Recent Files Management:**

```typescript
addRecentFile: (file) => {
  set((state) => {
    // Remove duplicates
    const filtered = state.recentFiles.filter(f => f.path !== file.path);
    // Add to front, limit to 10
    const updated = [file, ...filtered].slice(0, 10);
    return { recentFiles: updated };
  });
}
```

## Action Architecture

Actions are organized into separate files under `src/store/actions/` for better maintainability.

### File Actions (`file-actions.ts`)

Coordinates between Tauri filesystem APIs and both stores:

```typescript
export async function openFile() {
  // Show Tauri dialog
  const filePath = await dialog.open({
    filters: [{ name: 'OpenAPI', extensions: ['yaml', 'yml', 'json'] }]
  });
  
  // Read file via Tauri fs plugin
  const content = await fs.readTextFile(filePath);
  
  // Parse YAML with comment preservation
  const { document, spec } = parseYaml(content);
  
  // Update spec store
  useSpecStore.getState().setSpec(spec, document, filePath);
  
  // Update app store
  useAppStore.getState().addRecentFile({
    path: filePath,
    name: path.basename(filePath),
    lastOpened: Date.now()
  });
}
```

### Tree Actions (`tree-actions.ts`)

Modifies the spec for CRUD operations on tree nodes:

```typescript
export function addPath(parentPath: string, pathName: string) {
  const store = useSpecStore.getState();
  const { yamlDocument } = store;
  
  // Add to YAML document (preserves comments)
  const fullPath = `${parentPath}.${pathName}`;
  addToMap(yamlDocument, fullPath, {});
  
  // Update store
  store.updateField(fullPath, {});
  
  // Select new node
  store.setSelectedPath(fullPath);
}

export function deletePath(pathToDelete: string) {
  const store = useSpecStore.getState();
  const { yamlDocument } = store;
  
  // Remove from YAML document
  deleteAtPath(yamlDocument, pathToDelete);
  
  // Clear selection if deleted node was selected
  if (store.selectedPath?.startsWith(pathToDelete)) {
    store.setSelectedPath(null);
  }
}
```

## State Flow Patterns

### Initialization

```
App mount
  ↓
Load persisted UI state (sidebar width, recent files)
  ↓
app-store initialized
  ↓
spec-store initialized with empty spec
  ↓
User opens file → File action updates both stores
```

### Edit Cycle

```
User edits field in panel
  ↓
Panel calls spec-store.updateField(path, value)
  ↓
updateField() calls yaml-engine.applyEdit()
  ↓
YAML document updated (comments preserved)
  ↓
spec-store.spec updated
  ↓
spec-store.isDirty set to true
  ↓
Zundo creates undo state
  ↓
Debounced validation triggered (300ms)
  ↓
ValidationResult stored in spec-store
  ↓
Tree + panels re-render
```

### Undo/Redo Cycle

```
User presses Ctrl+Z
  ↓
Zundo restores previous state:
  - spec (OpenAPI object)
  - yamlDocument (Document AST)
  - isDirty flag
  ↓
Tree rebuilds from restored spec
  ↓
Panels re-render with restored values
  ↓
selectedPath preserved (not part of undo state)
  ↓
Validation re-runs on restored spec
```

## Key Design Decisions

### Why Two Stores?

**Separation of concerns:**
- **Spec Store**: Document editing state (undo/redo required)
- **App Store**: UI preferences (undo/redo NOT required)

Wrapping the entire app state in `temporal()` would pollute undo history with sidebar resizes, recent file updates, and error message changes.

### Why Partialize Undo State?

Zundo's `partialize` option limits what gets tracked in undo history:

```typescript
partialize: (state) => ({
  spec: state.spec,
  yamlDocument: state.yamlDocument,
  isDirty: state.isDirty,
})
```

**Excluded from undo:**
- `selectedPath`: Users expect selection to stay on current node after undo
- `validationResult`: Validation re-runs automatically after undo
- `filePath`: File path shouldn't change during undo

### Why Equality Check?

```typescript
equality: (pastState, currentState) =>
  pastState.spec === currentState.spec
```

Without this, every `setValidationResult()` call would create a new undo state, even though the spec didn't change. The equality function ensures undo states are only created when the actual spec content changes.

### Why Action Files?

Actions that coordinate multiple stores or Tauri APIs are extracted to `actions/` files to:
- Avoid circular dependencies
- Centralize complex state orchestration
- Make testing easier (mock store access)

## Store Access Patterns

### In React Components

```typescript
// Subscribe to specific state slices
const spec = useSpecStore((state) => state.spec);
const isDirty = useSpecStore((state) => state.isDirty);
const sidebarWidth = useAppStore((state) => state.sidebarWidth);

// Call actions directly
const updateField = useSpecStore((state) => state.updateField);
const setSidebarWidth = useAppStore((state) => state.setSidebarWidth);

// Use actions
updateField('info.title', 'My API');
setSidebarWidth(350);
```

### Outside React (Actions)

```typescript
// Get store instance
const specStore = useSpecStore.getState();
const appStore = useAppStore.getState();

// Read state
const { spec, yamlDocument } = specStore;
const { recentFiles } = appStore;

// Call actions
specStore.setSpec(newSpec, newDocument);
appStore.addRecentFile(file);
```

## Testing Considerations

Zustand stores are plain functions, making them easy to test:

```typescript
import { useSpecStore } from './spec-store';

test('updateField modifies spec', () => {
  const store = useSpecStore.getState();
  
  store.setSpec(initialSpec, initialDocument);
  store.updateField('info.title', 'New Title');
  
  expect(store.spec.info.title).toBe('New Title');
  expect(store.isDirty).toBe(true);
});
```

For undo/redo testing, access Zundo's temporal store:

```typescript
import { useTemporalStore } from 'zundo';

test('undo restores previous state', () => {
  const store = useSpecStore.getState();
  const temporal = useTemporalStore.getState();
  
  store.updateField('info.title', 'Version 1');
  store.updateField('info.title', 'Version 2');
  
  temporal.undo();
  
  expect(store.spec.info.title).toBe('Version 1');
});
```

## Related Documentation

- [YAML Engine](yaml-engine.md) - How spec updates preserve comments
- [Validation System](../features/validation.md) - Debounced validation flow
- [Undo/Redo](../features/undo-redo.md) - Zundo integration details
- [File I/O](../features/file-io.md) - File action implementations
