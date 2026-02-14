# Undo/Redo System

OpenAPI Editor implements full undo/redo functionality using Zundo, a temporal state management library built on Zustand.

## Architecture

Undo/redo wraps the spec-store with Zundo's `temporal` middleware, creating a time-travel state management system.

```typescript
import { create } from 'zustand';
import { temporal } from 'zundo';

export const useSpecStore = create<SpecStore>()(
  temporal(
    (set, get) => ({
      // Regular store implementation
      spec: {},
      yamlDocument: null,
      isDirty: false,
      // ... actions
    }),
    {
      // Zundo configuration
      partialize: (state) => ({
        spec: state.spec,
        yamlDocument: state.yamlDocument,
        isDirty: state.isDirty,
      }),
      equality: (pastState, currentState) =>
        pastState.spec === currentState.spec,
      limit: 50,  // Keep last 50 states
    }
  )
);
```

## Temporal Store

Zundo creates a separate temporal store with undo/redo controls:

```typescript
import { useTemporalStore } from 'zundo';

// Access temporal controls
const { undo, redo, clear } = useTemporalStore((state) => state);

// Check undo/redo availability
const canUndo = useTemporalStore((state) => state.pastStates.length > 0);
const canRedo = useTemporalStore((state) => state.futureStates.length > 0);

// Navigate history
const pastStates = useTemporalStore((state) => state.pastStates);
const futureStates = useTemporalStore((state) => state.futureStates);
```

## Configuration

### Partialize: What Gets Tracked

```typescript
partialize: (state): UndoState => ({
  spec: state.spec,
  yamlDocument: state.yamlDocument,
  isDirty: state.isDirty,
})
```

**Included in undo history:**
- `spec`: The OpenAPI object
- `yamlDocument`: The eemeli/yaml Document AST
- `isDirty`: Unsaved changes flag

**Excluded from undo history:**
- `selectedPath`: UI state (selection should persist across undo/redo)
- `validationResult`: Re-computed after each undo/redo
- `filePath`: File path never changes during editing

**Why partialize?** Without it, every UI state change (selection, validation) would create undo states, polluting history with non-editing actions.

### Equality: When to Create States

```typescript
equality: (pastState, currentState) =>
  pastState.spec === currentState.spec
```

**Purpose**: Only create undo states when the spec actually changes.

**Why needed?** Without equality checks:
- Validation updates trigger new undo states (even though spec unchanged)
- Dirty flag changes create undo states
- Multiple calls to `setState` create duplicate states

**How it works**: Zundo compares previous and current states using this function. If they're equal (same spec reference), no new undo state is created.

### Limit: History Size

```typescript
limit: 50
```

**Purpose**: Limit undo history to 50 states to prevent memory bloat.

**Memory usage**: Each state stores full spec + YAML document. For large specs (10+ MB), 50 states could use 500+ MB.

**Trade-off**: Users can undo up to 50 changes. Older states are discarded.

## Usage in Components

### Keyboard Shortcuts

```typescript
// In App.tsx or keyboard handler
import { useTemporalStore } from 'zundo';

function useKeyboardShortcuts() {
  const undo = useTemporalStore((state) => state.undo);
  const redo = useTemporalStore((state) => state.redo);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();  // Ctrl+Shift+Z or Cmd+Shift+Z
        } else {
          undo();  // Ctrl+Z or Cmd+Z
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();  // Ctrl+Y or Cmd+Y (Windows)
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);
}
```

### Undo/Redo Buttons

```typescript
import { useTemporalStore } from 'zundo';

export function Toolbar() {
  const undo = useTemporalStore((state) => state.undo);
  const redo = useTemporalStore((state) => state.redo);
  const canUndo = useTemporalStore((state) => state.pastStates.length > 0);
  const canRedo = useTemporalStore((state) => state.futureStates.length > 0);
  
  return (
    <div className="toolbar">
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        ↶ Undo
      </button>
      
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
      >
        ↷ Redo
      </button>
    </div>
  );
}
```

### History Panel (Advanced)

Display undo history with timestamps and labels:

```typescript
export function HistoryPanel() {
  const pastStates = useTemporalStore((state) => state.pastStates);
  const futureStates = useTemporalStore((state) => state.futureStates);
  const currentState = useSpecStore((state) => state);
  const { undo, redo } = useTemporalStore((state) => state);
  
  return (
    <div className="history-panel">
      <h3>History</h3>
      
      <div className="history-list">
        {/* Past states */}
        {pastStates.map((state, i) => (
          <div
            key={i}
            className="history-item past"
            onClick={() => {
              // Undo to this state
              const stepsBack = pastStates.length - i;
              for (let j = 0; j < stepsBack; j++) undo();
            }}
          >
            {generateLabel(state)}
          </div>
        ))}
        
        {/* Current state */}
        <div className="history-item current">
          {generateLabel(currentState)} (current)
        </div>
        
        {/* Future states */}
        {futureStates.map((state, i) => (
          <div
            key={i}
            className="history-item future"
            onClick={() => {
              // Redo to this state
              for (let j = 0; j <= i; j++) redo();
            }}
          >
            {generateLabel(state)}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateLabel(state: UndoState): string {
  // Extract meaningful label from state
  return state.spec.info?.title || 'Untitled';
}
```

## State Flow

### Edit Flow with Undo

```
User edits field
  ↓
spec-store.updateField(path, value)
  ↓
Store state changes:
  - spec updated
  - yamlDocument updated
  - isDirty = true
  ↓
Zundo's temporal middleware:
  1. Check equality (pastState.spec === currentState.spec)
  2. If different, push current state to pastStates
  3. Clear futureStates (redo history invalidated)
  ↓
UI re-renders with new state
  ↓
Undo button enabled (pastStates.length > 0)
```

### Undo Flow

```
User presses Ctrl+Z
  ↓
temporal.undo() called
  ↓
Zundo restores previous state:
  1. Pop current state → futureStates
  2. Pop last pastState → current state
  3. Update spec-store with restored state
  ↓
spec-store state changes:
  - spec restored
  - yamlDocument restored
  - isDirty restored
  ↓
Tree rebuilds from restored spec
  ↓
Panels re-render with restored values
  ↓
Validation re-runs on restored spec
  ↓
selectedPath preserved (not in undo state)
```

### Redo Flow

```
User presses Ctrl+Shift+Z
  ↓
temporal.redo() called
  ↓
Zundo restores next state:
  1. Pop current state → pastStates
  2. Pop first futureState → current state
  3. Update spec-store with restored state
  ↓
spec-store state changes:
  - spec restored
  - yamlDocument restored
  - isDirty restored
  ↓
UI re-renders with restored values
```

## Document Cloning

Each edit clones the YAML document to create a new state:

```typescript
// In spec-store.ts
updateField: (path, value) => {
  const { yamlDocument } = get();
  
  // Clone document (immutability for undo)
  const newDocument = yamlDocument.clone();
  
  // Apply edit to clone
  applyEdit(newDocument, path, value);
  
  // Update store with new document
  set({
    yamlDocument: newDocument,
    spec: documentToSpec(newDocument),
    isDirty: true,
  });
}
```

**Why clone?** Zustand stores state by reference. Mutating the same Document instance would break undo (past states would reflect current state).

**Performance**: Document cloning is fast (<10ms for typical specs). Zundo's equality check prevents creating states on non-editing updates.

## Edge Cases

### Clearing History

History is cleared on file open:

```typescript
// In file-actions.ts
export async function openFile() {
  // Load file
  const { document, spec } = parseYaml(content);
  
  // Update store
  useSpecStore.getState().setSpec(spec, document, filePath);
  
  // Clear undo history
  useTemporalStore.getState().clear();
}
```

**Why?** Undoing to a different file's state would be confusing. New file = fresh history.

### Dirty Flag on Undo

The dirty flag is part of undo state:

```typescript
// Before edit
{ spec, yamlDocument, isDirty: false }

// After edit
{ spec, yamlDocument, isDirty: true }

// After undo
{ spec, yamlDocument, isDirty: false }  // Restored!
```

**Result**: Undoing to the initial state clears the dirty flag. Users can undo all changes and close without "unsaved changes" prompt.

### Selection Preservation

selectedPath is NOT in undo state:

```typescript
// User selects "info" node
selectedPath = 'info';

// User edits info.title
spec.info.title = 'New Title';

// User undos
spec.info.title = 'Old Title';  // Restored
selectedPath = 'info';          // Preserved!
```

**Why?** Users expect selection to stay on the current node. Restoring selection to a different node would be disorienting.

### Validation Re-run

Validation results are NOT in undo state. Validation re-runs after undo:

```typescript
// In spec-store.ts
const setValidationResult = (result) => {
  set({ validationResult: result });
};

// After undo, validation re-runs
useTemporalStore.temporal.undo();
validateSpecDebounced();  // Re-validate restored spec
```

**Why?** Validation results are derived from spec state. Storing them in undo history is redundant.

## Performance Considerations

### Memory Usage

Each undo state stores:
- Full spec object (~10KB - 1MB for large specs)
- Full YAML document (~10KB - 1MB)
- Dirty flag (1 byte)

**50 states = 500KB - 50MB** depending on spec size.

**Mitigation**: Limit to 50 states. For larger specs, reduce limit to 20-30.

### State Comparison

Zundo's equality function compares spec references:

```typescript
equality: (pastState, currentState) =>
  pastState.spec === currentState.spec
```

**Cost**: O(1) reference comparison (fast).

**Alternative**: Deep equality (`_.isEqual(pastState, currentState)`) would be O(n) and slow.

### Document Cloning

Cloning the YAML document on every edit:

```typescript
const newDocument = yamlDocument.clone();
```

**Cost**: ~5-10ms for typical specs, ~50-100ms for large specs.

**Mitigation**: Already implemented—equality check prevents cloning on non-editing updates.

## Testing

Undo/redo is tested via spec-store tests:

```typescript
import { useSpecStore } from './spec-store';
import { useTemporalStore } from 'zundo';

test('undo restores previous state', () => {
  const store = useSpecStore.getState();
  const temporal = useTemporalStore.getState();
  
  // Initial state
  store.setSpec(initialSpec, initialDocument);
  
  // Make changes
  store.updateField('info.title', 'Version 1');
  store.updateField('info.title', 'Version 2');
  
  // Undo
  temporal.undo();
  
  expect(store.spec.info.title).toBe('Version 1');
  expect(temporal.pastStates).toHaveLength(1);
  expect(temporal.futureStates).toHaveLength(1);
});

test('redo restores next state', () => {
  const store = useSpecStore.getState();
  const temporal = useTemporalStore.getState();
  
  store.updateField('info.title', 'Version 1');
  store.updateField('info.title', 'Version 2');
  
  temporal.undo();
  temporal.redo();
  
  expect(store.spec.info.title).toBe('Version 2');
});

test('new edit clears redo history', () => {
  const store = useSpecStore.getState();
  const temporal = useTemporalStore.getState();
  
  store.updateField('info.title', 'Version 1');
  store.updateField('info.title', 'Version 2');
  
  temporal.undo();  // Back to Version 1
  
  expect(temporal.futureStates).toHaveLength(1);
  
  store.updateField('info.title', 'Version 3');  // New edit
  
  expect(temporal.futureStates).toHaveLength(0);  // Redo cleared
});
```

## Related Documentation

- [State Management](../architecture/state-management.md) - Spec-store + Zundo integration
- [YAML Engine](../architecture/yaml-engine.md) - Document cloning for undo
- [Validation](validation.md) - Validation re-run after undo
- [File I/O](file-io.md) - Clearing history on file open
