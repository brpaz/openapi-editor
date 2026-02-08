---
ticket: feature_openapi_visual_editor.md
created: 2026-02-08
status: complete
---

# Implementation Plan: OpenAPI 3.1 Visual Editor

## Overview

A cross-platform desktop app (Tauri 2 + React + Tailwind) for visually editing OpenAPI 3.1 specs via form-based panels with tree navigation. YAML-only, manual save, full undo/redo, inline validation.

---

## Technology Decisions

### Core Libraries

| Concern | Library | Version | Rationale |
|---------|---------|---------|-----------|
| YAML parse/serialize | `yaml` (eemeli/yaml) | 2.8.x | Comment-preserving round-trip via `parseDocument()`, LineCounter for offset→line/col mapping |
| OpenAPI validation | `@redocly/openapi-core` | 2.16.x | Returns `NormalizedProblem` with `LineColLocationObject` (line/col out of the box), supports OAS 3.1 natively |
| OpenAPI TS types | `openapi3-ts` | 4.5.x | Actively maintained, separate `oas31` import path with full OAS 3.1 types |
| $ref dereferencing | `@apidevtools/swagger-parser` | 12.1.x | Supports OAS 3.1.0-3.1.2, battle-tested dereference/bundle, used for initial load only |
| State management | `zustand` | 5.x | Lightweight, hook-based, excellent React integration |
| Undo/Redo | `zundo` (zustand temporal) | 2.x | Drop-in undo/redo middleware for Zustand |
| UI framework | Tailwind CSS | 4.x | Utility-first, system for dark mode via `class` strategy |
| Build tooling | Vite | 6.x | Default for Tauri 2 React template, fast HMR |

### Why This Stack

1. **`yaml` for round-trip**: Only JS YAML library that preserves comments. `parseDocument()` returns a mutable Document with CST nodes. `LineCounter` maps byte offsets to `{line, col}` — critical for mapping validation errors to source positions.

2. **`@redocly/openapi-core` for validation**: Unlike `@readme/openapi-parser` or `swagger-parser` (which validate JS objects and return JSON Pointer paths only), Redocly's linter returns problems with `start.line` / `start.col` / `end.line` / `end.col`. This eliminates the need to build a custom pointer→line mapper. Updated within the last week (2026-02-06).

3. **`openapi3-ts` for types**: `openapi-types` hasn't been published since 2023. `openapi3-ts` v4 provides dedicated `oas31` types and is maintained (last update 2025-06).

4. **`swagger-parser` for $ref resolution**: Used at file-open time to dereference multi-file `$ref`s into a single resolved object for editing. The resolved object is then used as the editing model, and the original YAML Document is kept in parallel for serialization.

### Architecture: Dual-Model Approach

```
┌─────────────────────────────────────────────────────┐
│                    File System                       │
│  main.yaml ──────────── ./schemas/User.yaml         │
└──────┬──────────────────────────┬────────────────────┘
       │ open                     │ resolve $ref
       ▼                          ▼
┌──────────────┐          ┌───────────────┐
│ YAML Document│          │ swagger-parser │
│ (eemeli/yaml)│          │  dereference   │
│ preserves    │          └───────┬───────┘
│ comments     │                  │
└──────┬───────┘                  ▼
       │              ┌────────────────────┐
       │              │ Resolved JS Object │
       │              │ (OpenAPIV3_1.Doc)  │
       │              └────────┬───────────┘
       │                       │
       │              ┌────────▼───────────┐
       │              │   Zustand Store    │
       │              │  (editing model)   │
       │              │  + zundo (undo)    │
       │              └────────┬───────────┘
       │                       │
       │              ┌────────▼───────────┐
       │              │   React UI         │
       │              │  Tree + Form Panels│
       │              └────────┬───────────┘
       │                       │ on edit
       │              ┌────────▼───────────┐
       │              │ Apply edit to both:│
       │              │ 1. Zustand state   │
       │              │ 2. YAML Document   │
       │              └────────┬───────────┘
       │                       │
       ▼                       ▼
┌──────────────┐      ┌───────────────────┐
│ YAML.stringify│      │ Redocly validate  │
│ (save to file)│      │ (on YAML string)  │
└──────────────┘      └───────────────────┘
```

**Why dual model?**
- The Zustand store holds a plain JS object (typed with `openapi3-ts`) for fast React rendering and form binding.
- The YAML Document (eemeli/yaml) preserves comments and formatting for faithful save.
- Edits are applied to both models synchronously. Validation runs on the YAML string output.
- This avoids the "edit JS object → serialize to YAML → lose all comments" problem.

---

## Project Structure

```
openapi-editor/
├── devenv.nix                    # Nix dev environment
├── devenv.yaml                   # Devenv config
├── package.json                  # Node dependencies
├── tsconfig.json                 # TypeScript config
├── vite.config.ts                # Vite config
├── tailwind.config.ts            # Tailwind config
├── index.html                    # Vite entry
├── flatpak-builder.yaml          # Flatpak manifest
├── .github/
│   └── workflows/
│       ├── ci.yml                # Lint + test on PR
│       ├── release.yml           # Tauri build + release (multi-platform)
│       └── flatpak.yml           # Flatpak build
├── src/                          # React frontend
│   ├── main.tsx                  # React entry
│   ├── App.tsx                   # Root component
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # Main layout (toolbar + sidebar + panel)
│   │   │   ├── Toolbar.tsx       # New, Open, Save, Undo, Redo, Theme
│   │   │   ├── Sidebar.tsx       # Tree container + search
│   │   │   ├── StatusBar.tsx     # Validation summary, file path
│   │   │   └── SplitPane.tsx     # Resizable split view
│   │   ├── tree/
│   │   │   ├── SpecTree.tsx      # Tree component
│   │   │   ├── TreeNode.tsx      # Individual tree node
│   │   │   └── TreeSearch.tsx    # Search/filter bar
│   │   ├── panels/
│   │   │   ├── WelcomePanel.tsx  # Start screen (new, open, recent)
│   │   │   ├── InfoPanel.tsx     # API info editor
│   │   │   ├── ServerPanel.tsx   # Servers editor
│   │   │   ├── TagPanel.tsx      # Tags editor
│   │   │   ├── PathPanel.tsx     # Path item editor
│   │   │   ├── OperationPanel.tsx# Operation editor (params, body, responses)
│   │   │   ├── SchemaPanel.tsx   # Schema editor (recursive)
│   │   │   ├── ResponsePanel.tsx # Response component editor
│   │   │   ├── ParameterPanel.tsx# Parameter component editor
│   │   │   └── RequestBodyPanel.tsx
│   │   ├── schema/               # Schema-specific editing components
│   │   │   ├── SchemaEditor.tsx  # Recursive schema editor
│   │   │   ├── PropertyList.tsx  # Object properties editor
│   │   │   ├── TypeSelector.tsx  # Type picker (string, object, array, etc.)
│   │   │   ├── RefPicker.tsx     # $ref selector dropdown
│   │   │   └── CompositionEditor.tsx # oneOf/anyOf/allOf editor
│   │   └── shared/
│   │       ├── FormField.tsx     # Reusable form field with label + validation
│   │       ├── MarkdownEditor.tsx# Description field (markdown)
│   │       ├── ArrayEditor.tsx   # Generic list add/remove/reorder
│   │       ├── KeyValueEditor.tsx# For headers, variables, etc.
│   │       └── ValidationBadge.tsx # Inline error indicator
│   ├── store/
│   │   ├── spec-store.ts        # Main Zustand store (spec + selection + dirty)
│   │   ├── app-store.ts         # App-level state (theme, recent files)
│   │   └── actions/
│   │       ├── file-actions.ts  # Open, save, new, clipboard ops
│   │       ├── spec-actions.ts  # Add/remove/update spec elements
│   │       └── tree-actions.ts  # Selection, navigation
│   ├── lib/
│   │   ├── yaml-engine.ts       # YAML parse/stringify with comment preservation
│   │   ├── validator.ts         # Redocly validation wrapper
│   │   ├── ref-resolver.ts      # $ref resolution via swagger-parser
│   │   ├── spec-template.ts     # Blank OpenAPI 3.1 template
│   │   ├── tree-builder.ts      # Build tree structure from spec
│   │   ├── keyboard-shortcuts.ts# Shortcut registration
│   │   └── recent-files.ts      # Persist/retrieve recent files
│   ├── hooks/
│   │   ├── useSpec.ts           # Spec store selector hooks
│   │   ├── useValidation.ts    # Validation state hooks
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useTheme.ts         # System theme detection + toggle
│   ├── types/
│   │   ├── tree.ts             # Tree node types
│   │   ├── editor.ts           # Editor state types
│   │   └── validation.ts       # Validation error types
│   └── styles/
│       └── globals.css          # Tailwind imports + custom styles
└── src-tauri/                    # Tauri Rust backend
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── capabilities/
    │   └── default.json          # Plugin permissions (fs, dialog, clipboard)
    ├── src/
    │   ├── lib.rs               # Plugin registration
    │   └── main.rs              # Entry point
    └── icons/                    # App icons
```

---

## Implementation Phases

### Phase 0: Project Scaffolding ✅

**Goal**: Working Tauri 2 + React + Tailwind + Devenv skeleton that builds and runs.

1. Create Tauri 2 project via `create-tauri-app` (React-TS template)
2. Add Tailwind CSS (Vite plugin)
3. Write `devenv.nix` with Rust, Node, WebKit2GTK, OpenSSL, and other Linux deps
4. Write `devenv.yaml`
5. Install Tauri plugins: `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-clipboard-manager`
6. Configure capabilities/permissions in `src-tauri/capabilities/default.json`
7. Register plugins in `src-tauri/src/lib.rs`
8. Add npm dependencies: `yaml`, `openapi3-ts`, `@redocly/openapi-core`, `@apidevtools/swagger-parser`, `zustand`, `zundo`
9. Configure ESLint, Prettier, TypeScript strict mode
10. Verify: `devenv shell` → `cargo tauri dev` → blank React app in Tauri window

**Deliverable**: Running empty app with all dependencies installed.

### Phase 1: Core Data Layer ✅

**Goal**: YAML engine, spec store, validation pipeline — no UI beyond console verification.

#### 1a. YAML Engine (`src/lib/yaml-engine.ts`)
- `parseYaml(content: string)` → `{ document: yaml.Document, spec: OpenAPIObject }`
- `stringifyYaml(document: yaml.Document)` → `string`
- `applyEdit(document: yaml.Document, path: string[], value: unknown)` → mutate document node
- Use `parseDocument()` with `keepSourceTokens: true` for comment preservation
- Use `LineCounter` for offset tracking

#### 1b. Spec Store (`src/store/spec-store.ts`)
- Zustand store with `temporal` middleware (zundo) for undo/redo
- State: `{ spec, yamlDocument, filePath, isDirty, selectedPath, validationErrors }`
- Actions: `openFile`, `newSpec`, `save`, `saveAs`, `updateField`, `addElement`, `removeElement`
- Each `updateField` applies to both `spec` (JS object) and `yamlDocument` (YAML AST) atomically
- Undo/redo operates on the entire state snapshot (zundo handles this)

#### 1c. Validation (`src/lib/validator.ts`)
- Wrap `@redocly/openapi-core` lint API
- Input: YAML string → Output: `ValidationError[]` with `{ message, path, severity, line, col }`
- Debounce validation (300ms after last edit)
- Run in a requestIdleCallback or Web Worker if performance requires

#### 1d. $ref Resolver (`src/lib/ref-resolver.ts`)
- Use `swagger-parser.dereference()` at file-open time
- For multi-file specs: resolve relative $ref paths against the file's directory
- Keep a map of `$ref string → resolved location` for navigation

#### 1e. Spec Template (`src/lib/spec-template.ts`)
- Minimal valid OpenAPI 3.1 YAML template for "New Spec":
```yaml
openapi: 3.1.0
info:
  title: My API
  version: 0.1.0
paths: {}
```

**Verification**: Unit tests (Vitest) for YAML round-trip, store mutations, validation output.

### Phase 2: App Shell & Layout ✅

**Goal**: The main window layout with toolbar, resizable sidebar, panel area, status bar. Dark mode. No editing yet — just the skeleton.

#### 2a. App Shell
- `AppShell.tsx`: flexbox layout — toolbar (top), sidebar (left), main panel (center), status bar (bottom)
- `SplitPane.tsx`: draggable divider between sidebar and panel, persist width in localStorage
- `Toolbar.tsx`: New, Open, Save, Save As, Undo, Redo, Theme toggle buttons
- `StatusBar.tsx`: validation error count, current file path, dirty indicator

#### 2b. Theme System
- Tailwind `darkMode: 'class'`
- `useTheme` hook: detect `prefers-color-scheme`, allow manual override, persist to localStorage
- Toggle applies `dark` class to `<html>`

#### 2c. File Operations (Tauri Integration)
- `file-actions.ts`:
  - `openFile()`: `dialog.open({ filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }] })` → `fs.readTextFile(path)` → `parseYaml()` → store
  - `saveFile()`: `stringifyYaml()` → `fs.writeTextFile(path, content)`
  - `saveAs()`: `dialog.save({ filters: ... })` → write
  - `copyToClipboard()`: `clipboard.writeText(yamlString)`
  - `pasteFromClipboard()`: `clipboard.readText()` → `parseYaml()` → store
  - `newSpec()`: load template → store

#### 2d. Recent Files
- Persist list in Tauri's app data dir (via `fs` plugin + `appDataDir`)
- Show on WelcomePanel
- Max 10 entries, most recent first

#### 2e. Keyboard Shortcuts
- Register via `useEffect` + `keydown` listener
- Ctrl+S → save, Ctrl+Shift+S → save as, Ctrl+O → open, Ctrl+N → new, Ctrl+Z → undo, Ctrl+Shift+Z → redo

**Verification**: App opens, theme toggles, can open/save YAML files, clipboard works. Visual check only — no editing forms yet.

### Phase 3: Tree Navigation ✅

**Goal**: Sidebar tree that reflects the spec structure, with search, selection, and CRUD.

#### 3a. Tree Builder (`src/lib/tree-builder.ts`)
- Convert spec object → tree node array:
  ```ts
  type TreeNode = {
    id: string;          // JSON Pointer path, e.g., "/paths/~1users/get"
    label: string;       // Display name, e.g., "GET /users"
    type: 'info' | 'servers' | 'tags' | 'path' | 'operation' | 'schema' | 'response' | 'parameter' | 'requestBody';
    children?: TreeNode[];
    hasErrors?: boolean;
  }
  ```
- Sections: Info, Servers, Tags, Paths (grouped by path → operations), Components (Schemas, Responses, Parameters, Request Bodies)

#### 3b. SpecTree Component
- Recursive `TreeNode` rendering with expand/collapse
- Selected node highlighted
- Error indicator (red dot) on nodes with validation errors
- Click → set `selectedPath` in store → main panel renders corresponding form

#### 3c. Tree Search
- Filter tree nodes by label (case-insensitive substring match)
- Highlight matching text in node labels
- Auto-expand parents of matching nodes

#### 3d. Tree CRUD
- Add buttons per section: "Add Path", "Add Schema", "Add Response", etc.
- Delete via context button on each node (with confirmation)
- Add path: prompt for path string (e.g., `/users/{id}`)
- Add schema: prompt for schema name
- Add operation: dropdown for HTTP method on a path node

**Verification**: Open Petstore spec → tree renders correctly → search filters → can add/delete paths and schemas.

### Phase 4: Form Panels — Core ✅

**Goal**: Editable form panels for all MVP spec elements.

#### Shared Components First
- `FormField`: label + input + validation error display. Supports text, textarea, select, checkbox, number.
- `ArrayEditor`: generic list with add/remove/reorder for arrays (servers, tags, enum values, etc.)
- `KeyValueEditor`: for headers, server variables, etc.
- `ValidationBadge`: inline error icon + tooltip
- `MarkdownEditor`: textarea with markdown preview toggle for description fields
- `RefPicker`: dropdown listing all component schemas/responses/parameters for $ref selection

#### 4a. InfoPanel
- Fields: title, version, description, termsOfService
- Contact sub-form: name, url, email
- License sub-form: name, url, identifier (SPDX)

#### 4b. ServerPanel
- List of servers (ArrayEditor)
- Each: url, description
- Server variables (KeyValueEditor per server)

#### 4c. TagPanel
- List of tags (ArrayEditor)
- Each: name, description, externalDocs (url, description)

#### 4d. PathPanel + OperationPanel
- PathPanel: shows the path string (read-only after creation), list of operations
- OperationPanel (selected operation):
  - Summary, description, operationId
  - Tags (multi-select from existing tags)
  - Parameters (ArrayEditor of ParameterEditor)
  - Request Body: required toggle, content type selector, schema (inline SchemaEditor or RefPicker)
  - Responses: keyed by status code (ArrayEditor), each has description + content type + schema

#### 4e. SchemaPanel (most complex)
- TypeSelector: dropdown for type (string, number, integer, boolean, array, object, null)
- Conditional fields based on type:
  - string: format, minLength, maxLength, pattern, enum, default, example
  - number/integer: format, minimum, maximum, exclusiveMinimum, exclusiveMaximum, multipleOf, enum, default
  - boolean: default
  - array: items (recursive SchemaEditor), minItems, maxItems, uniqueItems
  - object: PropertyList (recursive), required list, additionalProperties
  - null: (no extra fields)
- Nullable: checkbox that toggles `type: ["<type>", "null"]` (OAS 3.1 style)
- Composition: oneOf/anyOf/allOf tabs, each with a list of SchemaEditors or RefPickers
- Description, example, deprecated, readOnly, writeOnly
- $ref mode: switch between "inline schema" and "reference" (RefPicker)

#### 4f. ComponentPanels
- ResponsePanel: description, headers (KeyValueEditor), content (content type + schema)
- ParameterPanel: name, in (path/query/header/cookie), required, deprecated, description, schema
- RequestBodyPanel: description, required, content (content type + schema)

**Verification**: Edit every field type → verify store updates → save → re-open → values preserved. Undo/redo each edit.

### Phase 5: Validation Integration ✅

**Goal**: Real-time validation with inline error display.

1. Wire validation to store: on any spec change (debounced 300ms), run Redocly lint
2. Map validation errors to tree nodes (set `hasErrors` flag)
3. Map validation errors to form fields (match by JSON path → highlight field, show error message)
4. StatusBar shows total error/warning count
5. Click error in status bar → navigate to the relevant tree node + field

**Verification**: Remove a required field → error appears inline within 500ms. Fix it → error clears.

### Phase 6: Polish & Edge Cases ✅

1. Window title: show file name + dirty indicator
2. Unsaved changes warning on close/new/open (Tauri `onCloseRequested`)
3. Handle invalid YAML gracefully (show parse error, don't crash)
4. Handle corrupt/non-OpenAPI files (show "not a valid OpenAPI spec" error)
5. Empty state: WelcomePanel with New/Open/Recent
6. Responsive sidebar (min/max width, collapse button)
7. Loading state for large files
8. Performance: virtualize tree if >500 nodes, memoize form components

### Phase 7: CI/CD & Distribution ✅

1. ✅ GitHub Actions: CI workflow (`.github/workflows/ci.yml` — lint + type-check + test on PR/push to main)
2. ✅ GitHub Actions: Release workflow (`.github/workflows/release.yml` — tauri-action multi-platform build: macOS aarch64/x86_64, Ubuntu 22.04, Windows)
3. ✅ Flatpak manifest (`flatpak/com.bruno.openapi-editor.yml` — GNOME 47 runtime, repackage .deb)
4. ✅ GitHub Actions: Flatpak build workflow (`.github/workflows/flatpak.yml` — builds bundle from release binary)
5. ✅ App icons (custom SVG → Inkscape render → `npx tauri icon` for all platforms: PNG, ICO, ICNS)
6. ✅ App metadata (`flatpak/com.bruno.openapi-editor.metainfo.xml`, `flatpak/com.bruno.openapi-editor.desktop`)

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual-model sync complexity (JS object + YAML Document) | Edits could desync | Centralize all mutations through a single `applyEdit()` function that updates both atomically. Integration tests for round-trip fidelity. |
| Redocly validation performance on large specs | UI lag | Debounce + run in Web Worker. Profile early with 200+ path specs. |
| YAML comment preservation edge cases | Comments lost on certain edits | Test extensively with comment-heavy specs. Accept that comments on deleted nodes are lost. |
| Recursive SchemaEditor performance | Deep nesting = slow renders | Limit inline expansion depth (e.g., 5 levels), virtualize long property lists, React.memo aggressively |
| Multi-file $ref resolution in Tauri sandbox | Tauri FS scope might block reading sibling files | Configure FS scope to allow reading from the spec file's parent directory recursively |
| Flatpak WebKit2GTK compatibility | GNOME runtime version mismatch | Pin to GNOME 46+ (confirmed compatible with WebKit2GTK 4.1) |

---

## Open Questions (For Review)

1. **YAML Document mutation API**: eemeli/yaml's `Document` has `setIn()` / `getIn()` / `deleteIn()` for path-based mutations. Need to verify these preserve sibling comments. If not, may need CST-level manipulation for some edits.

2. **Redocly as library vs CLI**: Need to confirm `@redocly/openapi-core` can be used as a library (import + call lint programmatically) rather than CLI-only. The npm package exists and exports lint functions, but API surface needs POC verification.

3. **Zundo snapshot size**: For large specs, storing full state snapshots per undo step could use significant memory. May need to switch to patch-based undo (immer patches) if this becomes an issue.

4. **Web Worker for validation**: If validation blocks the main thread, should use a Comlink-wrapped Web Worker. Adds complexity but may be necessary for specs with 100+ paths.
