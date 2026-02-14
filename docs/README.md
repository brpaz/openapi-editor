# OpenAPI Editor Documentation

Comprehensive documentation for the OpenAPI Editor project, a desktop application for visually editing OpenAPI 3.x specifications with comment preservation and undo/redo support.

## Architecture

Understanding the core systems and design decisions:

- **[Overview](architecture/overview.md)** - High-level architecture, technology stack, and key design decisions
- **[State Management](architecture/state-management.md)** - Zustand + Zundo: dual-store architecture, undo/redo, persistence patterns
- **[YAML Engine](architecture/yaml-engine.md)** - Comment-preserving YAML parsing/serialization using eemeli/yaml Document AST

## Features

Core features and their implementations:

- **[Validation](features/validation.md)** - Real-time OpenAPI validation with SwaggerParser, debouncing, error mapping
- **[Tree Navigation](features/tree-navigation.md)** - Hierarchical spec navigation, search/filter, CRUD operations
- **[Undo/Redo](features/undo-redo.md)** - Temporal state management with Zundo, keyboard shortcuts, history panel
- **[File I/O](features/file-io.md)** - Open/save with Tauri APIs, recent files persistence, clipboard operations

## Getting Started

### Prerequisites

- **Node.js 24+** (with pnpm)
- **Rust 1.70+** (for Tauri backend)
- **System dependencies** (see main README.md)

### Development Setup

```bash
# Clone repository
git clone https://github.com/yourusername/openapi-editor.git
cd openapi-editor

# Install dependencies
pnpm install

# Run development server
pnpm run tauri dev
```

### Build for Production

```bash
# Build for your platform
pnpm run tauri build

# Outputs:
# - Linux: .deb, .rpm, .AppImage (in src-tauri/target/release/bundle/)
# - macOS: .dmg, .app
# - Windows: .msi, .exe
```

### Build Flatpak

```bash
# Requires GNOME SDK 49
flatpak install flathub org.gnome.Sdk//49 org.gnome.Platform//49

# Build Flatpak bundle
task build:flatpak
```

## Project Structure

```
openapi-editor/
├── src/
│   ├── components/       # React components
│   │   ├── layout/       # Header, Sidebar, StatusBar
│   │   ├── tree/         # SpecTree, TreeNode, TreeSearch
│   │   ├── panels/       # Editor panels for each spec section
│   │   └── shared/       # FormField, ValidationBadge, reusable UI
│   ├── store/
│   │   ├── app-store.ts         # UI state (sidebar, recent files)
│   │   ├── spec-store.ts        # Spec state + undo/redo (Zundo)
│   │   └── actions/
│   │       ├── file-actions.ts  # Open, save, new, clipboard
│   │       └── tree-actions.ts  # Add/delete spec elements
│   ├── lib/
│   │   ├── yaml-engine.ts       # Comment-preserving YAML
│   │   ├── tree-builder.ts      # Build tree from spec
│   │   ├── validator.ts         # SwaggerParser validation
│   │   ├── ref-resolver.ts      # $ref resolution
│   │   └── recent-files.ts      # Recent file persistence
│   ├── types/
│   │   ├── editor.ts            # SpecState, SpecActions
│   │   ├── tree.ts              # TreeNode, TreeNodeType
│   │   └── validation.ts        # ValidationResult, ValidationError
│   └── hooks/
│       └── useValidation.ts     # Access field/path errors
├── src-tauri/            # Rust backend (Tauri)
├── flatpak/              # Flatpak manifest and desktop files
├── docs/                 # This documentation
└── Taskfile.yml          # Task runner (build, dev, test)
```

## Technology Stack

### Frontend
- **React 19** - UI framework
- **TypeScript 5.8** - Type safety
- **Vite 7** - Build tool and dev server
- **Tailwind CSS v4** - Styling

### State Management
- **Zustand 5** - Lightweight state management
- **Zundo 2.3** - Undo/redo temporal middleware

### Core Libraries
- **eemeli/yaml 2.8** - Comment-preserving YAML parser
- **@apidevtools/swagger-parser 12.1** - OpenAPI validation
- **openapi3-ts 4.5** - TypeScript type definitions

### Desktop Framework
- **Tauri 2** - Native desktop wrapper (Rust + WebView)
- **Tauri FS Plugin** - Filesystem access (read/write files)
- **Tauri Dialog Plugin** - Native file dialogs

## Common Tasks

### Adding a New Panel

1. Create panel component in `src/components/panels/`:

```typescript
// src/components/panels/MyPanel.tsx
export function MyPanel({ path }: { path: string }) {
  const spec = useSpecStore(state => state.spec);
  const updateField = useSpecStore(state => state.updateField);
  
  // Extract data from spec based on path
  const data = getAtPath(spec, path);
  
  return (
    <div className="panel">
      <FormField
        label="Title"
        value={data.title}
        onChange={(value) => updateField(`${path}.title`, value)}
      />
    </div>
  );
}
```

2. Add routing in main editor component:

```typescript
if (selectedPath.startsWith('my-section.')) {
  return <MyPanel path={selectedPath} />;
}
```

3. Update tree builder to include new nodes:

```typescript
// In tree-builder.ts
if (spec.mySection) {
  nodes.push({
    id: 'my-section',
    label: 'My Section',
    path: 'my-section',
    type: 'my-section',
    children: buildMySectionChildren(spec.mySection),
  });
}
```

### Adding a New Action

1. Create action in appropriate actions file:

```typescript
// src/store/actions/tree-actions.ts
export function addMyElement(parentPath: string, name: string) {
  const store = useSpecStore.getState();
  const { yamlDocument } = store;
  
  const fullPath = `${parentPath}.${name}`;
  addToMap(yamlDocument, fullPath, { /* default data */ });
  
  store.updateField(fullPath, { /* default data */ });
  store.setSelectedPath(fullPath);
}
```

2. Call from component:

```typescript
import { addMyElement } from '../store/actions/tree-actions';

<button onClick={() => addMyElement('parent.path', 'new-element')}>
  Add Element
</button>
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run specific test file
pnpm test src/lib/yaml-engine.test.ts
```

### Linting and Type Checking

```bash
# Run ESLint
pnpm run lint

# Run TypeScript compiler (type checking only)
pnpm exec tsc --noEmit
```

## Contributing

### Code Style

- **Formatting**: Prettier (runs on save in most editors)
- **Linting**: ESLint with TypeScript rules
- **Imports**: Organize imports (React, third-party, local)
- **Types**: Prefer explicit types over inference for public APIs

### Commit Messages

Follow conventional commits:

```
feat: add schema editor panel
fix: preserve comments on array edits
docs: update validation documentation
test: add tree builder edge case tests
refactor: extract file dialog logic
```

### Pull Requests

1. Create feature branch from `main`
2. Make changes with tests
3. Ensure all tests pass: `pnpm test`
4. Ensure lint passes: `pnpm run lint`
5. Push and create PR
6. CI will run checks and build

## Troubleshooting

### YAML Comments Lost

**Problem**: Comments disappear after editing.

**Solution**: Ensure `yamlDocument` is being updated, not just `spec`. All edits must go through `yaml-engine.ts` functions (`applyEdit`, `addToMap`, `deleteAtPath`).

### Validation Not Running

**Problem**: Validation errors not showing after edits.

**Solution**: Check that `validateSpecDebounced()` is called in `updateField`. Validation is debounced 300ms—wait for idle time.

### Undo Not Working

**Problem**: Undo/redo not restoring previous state.

**Solution**: 
1. Verify `temporal` middleware is applied to spec-store
2. Check that `equality` function is comparing correctly
3. Ensure `partialize` includes all necessary state

### Build Fails

**Problem**: `pnpm run tauri build` fails.

**Solution**:
1. Ensure Rust toolchain is installed: `rustc --version`
2. Check system dependencies (see main README.md)
3. Clear cache: `rm -rf src-tauri/target && pnpm run tauri build`

## Additional Resources

- **Main README**: See [../README.md](../README.md) for setup instructions
- **OpenAPI Specification**: https://spec.openapis.org/oas/v3.1.0
- **Tauri Documentation**: https://v2.tauri.app/
- **Zustand Documentation**: https://github.com/pmndrs/zustand
- **Zundo Documentation**: https://github.com/charkour/zundo
- **eemeli/yaml Documentation**: https://eemeli.org/yaml/

## License

[Insert license information from main README]

## Support

- **Issues**: https://github.com/yourusername/openapi-editor/issues
- **Discussions**: https://github.com/yourusername/openapi-editor/discussions
