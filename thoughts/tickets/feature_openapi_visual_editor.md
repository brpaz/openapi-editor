---
type: feature
priority: high
created: 2026-02-08T09:36:00Z
status: created
tags: [openapi, editor, tauri, react, desktop-app, greenfield]
keywords: [openapi 3.1, visual editor, form editor, tauri 2, react, tailwind, zustand, yaml, flatpak, devenv, schema editor, $ref]
patterns: [form-based editing, tree navigation, undo/redo, file I/O, clipboard, multi-file $ref resolution]
---

# FEATURE-001: OpenAPI 3.1 Visual Editor Desktop App

## Description
Build a cross-platform desktop application for visually editing OpenAPI 3.1 specifications. The editor uses a form-based panel approach with a tree sidebar for navigation, allowing users to create and edit API specs without writing YAML manually. The app opens/saves YAML files and supports clipboard operations.

## Context
Existing OpenAPI editors are either web-only (Swagger Editor), proprietary (Stoplight Studio), or abandoned (Apicurio Studio, Optic). There's a gap for a fast, native, open-source desktop editor focused on OpenAPI 3.1 with a modern form-based UX. Tauri 2 provides the native shell with a small footprint.

## Tech Stack (Decided)
- **App Framework**: Tauri 2 (Rust backend, webview frontend)
- **Frontend**: React 19 + Tailwind CSS
- **State Management**: Zustand
- **Dev Environment**: Devenv (Nix-based)
- **Distribution**: Flatpak (Linux), MSI/NSIS (Windows), DMG (macOS)
- **CI/CD**: GitHub Actions
- **Spec Format**: YAML only (input/output)
- **OpenAPI Version**: 3.1 only

## Requirements

### Functional Requirements

#### File I/O
- Open YAML files via native file dialog (Tauri dialog plugin)
- Paste YAML content from clipboard (Tauri clipboard plugin)
- Create new spec from scratch (minimal valid OpenAPI 3.1 template)
- Save back to the currently open file (overwrite)
- Save As to a new file location
- Copy entire spec to clipboard as YAML
- Remember recently opened files (persist across sessions)
- Show unsaved changes indicator (dirty state)
- Manual save only (Ctrl+S or button) — no auto-save

#### Multi-file $ref Support
- Resolve $ref pointing to local files (e.g., `./schemas/User.yaml`)
- Navigate to referenced schemas by clicking $ref links
- Handle circular references gracefully

#### Visual Editor — Tree Sidebar
- Tree structure mirroring the OpenAPI spec hierarchy:
  - Info (title, version, description, contact, license)
  - Servers
  - Tags
  - Paths → individual path items → operations
  - Schemas (components/schemas)
  - Responses (components/responses)
  - Parameters (components/parameters)
  - Request Bodies (components/requestBodies)
- Expand/collapse tree nodes
- Search/filter bar to find paths, schemas, etc. by name
- Add/delete operations on tree nodes (context menu or buttons)
- Visual indicators for validation errors on tree nodes

#### Visual Editor — Form Panels
- **Info Panel**: title, version, description (markdown), termsOfService, contact (name/url/email), license (name/url/identifier)
- **Servers Panel**: list of servers with url, description, variables
- **Tags Panel**: list of tags with name, description, externalDocs
- **Path/Operation Panel**:
  - HTTP method selector
  - Summary, description, operationId, tags
  - Parameters (path, query, header, cookie) with name, in, required, schema, description
  - Request body: content type, schema reference or inline schema
  - Responses: status code, description, headers, content type + schema
  - Add/remove operations on a path
- **Schema Panel**:
  - Type selector (string, number, integer, boolean, array, object, null)
  - Format, description, default, example, enum
  - Object: properties list with inline nested editing (expandable)
  - Array: items schema (inline editable)
  - Composition: oneOf, anyOf, allOf with add/remove schemas
  - $ref picker: select from existing component schemas
  - Nullable via type array (OpenAPI 3.1 style: `type: ["string", "null"]`)
- **Response Panel**: status code, description, headers, content types with schema
- **Parameter Panel**: name, in, required, deprecated, schema, description, examples
- **Request Body Panel**: description, required, content types with schemas

#### Validation
- Real-time OpenAPI 3.1 validation as user edits
- Inline field-level validation errors (red borders, error messages next to fields)
- Validate $ref targets exist
- Validate required fields are present
- Validate enum values, formats, patterns

#### Undo/Redo
- Full undo/redo stack (Ctrl+Z / Ctrl+Shift+Z)
- Per-field granularity (each form field change is an undoable action)

#### Keyboard Shortcuts
- Ctrl+S: Save
- Ctrl+Shift+S: Save As
- Ctrl+N: New spec
- Ctrl+O: Open file
- Ctrl+Z: Undo
- Ctrl+Shift+Z: Redo
- Ctrl+C (in spec context): Copy spec to clipboard

#### Theming
- System theme detection (light/dark)
- Manual toggle between light and dark mode
- Persist theme preference

### Non-Functional Requirements
- **Performance**: Handle specs with 200+ paths and 100+ schemas without lag
- **Startup**: App should launch in under 2 seconds
- **Memory**: Stay under 200MB for typical specs
- **Cross-platform**: Linux (primary), Windows, macOS
- **Accessibility**: Keyboard navigable, proper ARIA labels on form elements
- **Responsiveness**: Sidebar should be resizable; minimum window size enforced

## Current State
Nothing exists. Greenfield project.

## Desired State
A working desktop app (MVP) that can:
1. Open or create an OpenAPI 3.1 YAML spec
2. Navigate the spec via a tree sidebar with search
3. Edit all core elements via contextual form panels
4. Validate the spec in real-time with inline errors
5. Undo/redo any edit
6. Save to file or copy to clipboard
7. Run on Linux, Windows, and macOS

## Research Context

### Keywords to Search
- `openapi 3.1` — Spec version we target
- `yaml round-trip` — YAML parsing that preserves structure
- `@apicurio/data-models` — Potential AST library for OpenAPI
- `openapi-types` — TypeScript types for OpenAPI
- `eemeli/yaml` — YAML parser with comment preservation
- `zustand undo` — Undo middleware for Zustand
- `tauri-plugin-fs` — File system access in Tauri 2
- `tauri-plugin-dialog` — Native file dialogs in Tauri 2
- `tauri-plugin-clipboard-manager` — Clipboard access in Tauri 2
- `devenv tauri` — Nix dev environment for Tauri
- `flatpak tauri` — Packaging Tauri for Flatpak
- `tauri-action` — GitHub Actions for building Tauri apps

### Patterns to Investigate
- Form-based editor layout (master/detail pattern from Apicurio)
- Tree navigation with selection → panel rendering
- JSON Schema form generation (for schema editing)
- Undo/redo with Zustand (temporal middleware or custom)
- Multi-file $ref resolution strategies
- Tauri 2 capabilities/permissions model for plugins

### Key Decisions Made
- YAML only (no JSON support) — simplifies I/O layer
- OpenAPI 3.1 only (no 3.0 backward compat) — simplifies validation
- Form-based panels (not code editor, not node graph)
- Zustand for state management
- Manual save (no auto-save)
- Inline nested schema editing (not separate panels for each schema)
- Single file editing at a time (multi-file $ref resolved read-only)
- System theme + manual toggle for dark/light mode
- No drag & drop for MVP
- No API preview/documentation view for MVP

## Architecture Overview (Preliminary)

### State Model
```
AppState
├── currentFile: string | null (file path)
├── recentFiles: string[]
├── isDirty: boolean
├── theme: 'light' | 'dark' | 'system'
├── spec: OpenAPIDocument (the parsed spec)
├── selectedNode: TreeNodePath (what's selected in the tree)
├── validationErrors: ValidationError[]
├── undoStack: Patch[]
├── redoStack: Patch[]
```

### Data Flow
1. Open file → Tauri FS reads YAML → `yaml` lib parses to JS object → Zustand store
2. User edits form field → Zustand mutation (with undo snapshot) → revalidate → update tree indicators
3. Save → Zustand state → `yaml` lib serializes to YAML → Tauri FS writes file

### Component Hierarchy (Conceptual)
```
App
├── TitleBar (file name, dirty indicator)
├── Toolbar (New, Open, Save, Undo, Redo, Theme toggle)
├── SplitPane
│   ├── Sidebar
│   │   ├── SearchBar
│   │   └── SpecTree
│   └── MainPanel
│       ├── InfoForm
│       ├── ServerForm
│       ├── PathForm
│       ├── OperationForm
│       ├── SchemaForm (recursive for nested)
│       ├── ResponseForm
│       ├── ParameterForm
│       └── RequestBodyForm
└── StatusBar (validation summary, file path)
```

## Out of Scope (Future / Non-MVP)
- Callbacks, Links, Security Schemes, Webhooks, Extensions
- Import from URL
- Diff view between versions
- Export to different formats (JSON, etc.)
- Plugin/extension system
- Drag & drop to open files
- Auto-save
- API documentation preview
- OpenAPI 3.0 support
- Swagger 2.0 support
- Code editor view (raw YAML editing)
- Collaborative editing
- Git integration

## Success Criteria

### Automated Verification
- [ ] `cargo tauri build` succeeds for Linux, Windows, macOS
- [ ] All unit tests pass (Vitest for React, cargo test for Rust)
- [ ] Lint passes (ESLint + Clippy)
- [ ] TypeScript strict mode — no type errors
- [ ] Flatpak build succeeds
- [ ] GitHub Actions CI pipeline green

### Manual Verification
- [ ] Can create a new spec, add paths/schemas/responses, save as YAML
- [ ] Can open the Petstore 3.1 example spec and see it correctly in the tree
- [ ] Can edit any field and undo/redo the change
- [ ] Validation errors appear inline when required fields are missing
- [ ] Can save to file and re-open — round-trip preserves structure
- [ ] Copy to clipboard produces valid YAML
- [ ] Dark mode toggle works and persists
- [ ] Recent files list shows previously opened specs
- [ ] Search/filter in tree sidebar works
- [ ] $ref links navigate to referenced schemas
- [ ] App launches in under 2 seconds
- [ ] Handles Petstore-scale spec (30+ paths, 20+ schemas) without lag

## Related Information
- OpenAPI 3.1 Specification: https://spec.openapis.org/oas/v3.1.0
- Tauri 2 Documentation: https://v2.tauri.app/
- Apicurio OpenAPI Editor (reference implementation): https://github.com/Apicurio/apicurio-openapi-editor
- Swagger Editor Next: https://github.com/swagger-api/swagger-editor

## Notes
- The `eemeli/yaml` library supports comment preservation and round-trip parsing — critical for not destroying user's YAML formatting
- Apicurio's `@apicurio/data-models` provides a typed AST with visitor pattern — evaluate whether to use it or build simpler typed model on top of `openapi-types`
- Zustand's `temporal` middleware (zundo) provides undo/redo out of the box
- Tauri 2 uses a capabilities/permissions model — all plugins (fs, dialog, clipboard) need explicit permission grants in `src-tauri/capabilities/`
- Multi-file $ref resolution should be read-only for MVP — editing a $ref'd schema opens the external file would be a separate feature
