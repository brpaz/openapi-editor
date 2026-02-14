# Architecture Overview

OpenAPI Editor is a desktop application for editing OpenAPI 3.x specifications, built with Tauri 2 for native performance and React 19 for the UI.

## Core Technology Stack

- **Desktop Framework**: Tauri 2 (Rust backend, web frontend)
- **UI Framework**: React 19 with TypeScript 5.8
- **Build System**: Vite 7
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand 5 + Zundo 2.3 (undo/redo)
- **YAML Processing**: eemeli/yaml 2.8 (comment-preserving parser)
- **Validation**: @apidevtools/swagger-parser 12.1
- **Type Definitions**: openapi3-ts 4.5

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Tauri Desktop App                      │
├─────────────────────────────────────────────────────────────┤
│  React UI Layer                                              │
│  ├── Layout Components (Header, Sidebar, StatusBar)         │
│  ├── Tree Navigation (SpecTree, TreeNode, TreeSearch)       │
│  ├── Editor Panels (dynamic based on selection)             │
│  └── Shared Components (FormField, ValidationBadge)         │
├─────────────────────────────────────────────────────────────┤
│  State Management                                            │
│  ├── Spec Store (spec, YAML document, validation, undo)     │
│  └── App Store (UI state, recent files, errors)             │
├─────────────────────────────────────────────────────────────┤
│  Core Libraries                                              │
│  ├── yaml-engine.ts (comment-preserving YAML)               │
│  ├── tree-builder.ts (hierarchical navigation)              │
│  ├── validator.ts (debounced SwaggerParser validation)      │
│  ├── ref-resolver.ts ($ref resolution)                      │
│  └── recent-files.ts (file history)                         │
├─────────────────────────────────────────────────────────────┤
│  Tauri Backend (Rust)                                        │
│  └── Filesystem plugin (read/write YAML files)              │
└─────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

### Comment-Preserving YAML Engine

Standard YAML libraries discard comments when parsing. This editor uses `eemeli/yaml` with `keepSourceTokens: true` to preserve comments, whitespace, and formatting during edits. The Document AST is manipulated directly via `setIn()`, `deleteIn()`, and `addToMap()` methods, then serialized back to YAML with original formatting intact.

**Why it matters**: Users can maintain inline documentation, examples, and annotations in their OpenAPI specs without losing them on save.

### Dual-Store Architecture

The application separates concerns into two Zustand stores:

- **Spec Store**: Manages the OpenAPI spec object, underlying YAML document, file path, dirty state, selected path, and validation results. Wrapped with Zundo's `temporal` middleware for undo/redo.
- **App Store**: Handles UI state like sidebar width, recent files list, error messages, and loading indicators. Persists sidebar preferences to localStorage.

**Why it matters**: Undo/redo only affects spec changes, not UI state. Recent files and preferences persist across sessions without polluting undo history.

### Tree-Based Navigation

The spec is represented as a hierarchical tree built from the OpenAPI structure (info, servers, paths, components). Each node maps to a specific path in the spec (e.g., `paths./users.get.responses.200`). Clicking a node renders the corresponding editor panel.

**Why it matters**: Users navigate complex specs visually without manually traversing nested objects. Search/filter helps locate specific operations or schemas quickly.

### Debounced Validation

Validation runs asynchronously 300ms after the last edit, using SwaggerParser to check OpenAPI compliance. Errors are mapped back to tree nodes and form fields for inline display.

**Why it matters**: Real-time feedback without blocking the UI. Users see errors exactly where they occur (field-level, node-level, status bar summary).

## Data Flow

### File Open Flow

```
User clicks File → Open
  ↓
Tauri dialog.open() → file path
  ↓
fs.readTextFile(path) → YAML string
  ↓
parseYaml() → Document + spec object
  ↓
spec-store.setSpec() + app-store.addRecentFile()
  ↓
buildTree(spec) → TreeNode[]
  ↓
Tree renders → user selects node → panel renders
```

### Edit Flow

```
User edits field in panel
  ↓
Action calls spec-store.updateField(path, value)
  ↓
yaml-engine.applyEdit(document, path, value)
  ↓
document.toString() → updated YAML
  ↓
spec-store.setDirty(true)
  ↓
validateSpecDebounced() schedules validation (300ms)
  ↓
SwaggerParser.validate() → errors
  ↓
spec-store.setValidationResult()
  ↓
ValidationBadge, StatusBar update
```

### Undo/Redo Flow

```
User presses Ctrl+Z
  ↓
Zundo's temporal middleware restores previous state
  ↓
spec-store.spec + yamlDocument + isDirty restored
  ↓
buildTree() re-runs → tree updates
  ↓
selectedPath preserved → panel re-renders with old values
```

## File Structure

```
src/
├── components/
│   ├── layout/       # Header, Sidebar, StatusBar, ErrorBanner
│   ├── tree/         # SpecTree, TreeNode, TreeSearch
│   ├── panels/       # Editor panels for each spec section
│   └── shared/       # FormField, ValidationBadge, reusable UI
├── store/
│   ├── app-store.ts           # UI state
│   ├── spec-store.ts          # Spec state + undo/redo
│   └── actions/
│       ├── file-actions.ts    # Open, save, new, clipboard
│       └── tree-actions.ts    # Add/delete spec elements
├── lib/
│   ├── yaml-engine.ts         # Comment-preserving YAML
│   ├── tree-builder.ts        # Build tree from spec
│   ├── validator.ts           # SwaggerParser validation
│   ├── ref-resolver.ts        # $ref resolution
│   ├── recent-files.ts        # Recent file persistence
│   └── spec-template.ts       # Default OpenAPI template
├── types/
│   ├── editor.ts              # SpecState, SpecActions interfaces
│   ├── tree.ts                # TreeNode, TreeNodeType
│   └── validation.ts          # ValidationResult, ValidationError
└── hooks/
    └── useValidation.ts       # Access field/path errors
```

## Next Steps

- **State Management Details**: See [state-management.md](state-management.md)
- **YAML Engine Details**: See [yaml-engine.md](yaml-engine.md)
- **Component Architecture**: See [components.md](components.md)
- **Validation System**: See [../features/validation.md](../features/validation.md)
- **Tree Navigation**: See [../features/tree-navigation.md](../features/tree-navigation.md)
- **Undo/Redo System**: See [../features/undo-redo.md](../features/undo-redo.md)
- **File I/O**: See [../features/file-io.md](../features/file-io.md)
