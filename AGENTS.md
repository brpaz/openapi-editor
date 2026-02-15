# AGENTS.md — Development Guide for AI Coding Agents

This document provides conventions and commands for AI agents working in this codebase.

---

## Build, Test, and Lint Commands

### Prerequisites
**Always run `devenv shell` before any build commands.** This sets up `PKG_CONFIG_PATH` and system library paths for Tauri's WebKit2GTK dependencies.

### Core Commands

```bash
# Development
task dev                # Start Tauri dev server with hot reload
task dev:web            # Start Vite dev server only (no Tauri window)
pnpm run tauri dev      # Alternative to task dev

# Building
task build              # Production build for current platform
task build:debug        # Debug build with symbols
task build:web          # Build web bundle only (without Tauri)
task build:flatpak      # Build Flatpak bundle
pnpm run tauri build    # Alternative to task build

# Testing
task test               # Run all tests once
pnpm test               # Alternative to task test
task test:watch         # Run tests in watch mode
pnpm exec vitest        # Alternative watch mode
task test:coverage      # Run tests with coverage report
pnpm exec vitest run --coverage

# Run single test file
pnpm exec vitest run src/lib/validator.test.ts
pnpm exec vitest src/store/spec-store.test.ts  # Watch mode for single file

# Linting and Type Checking
task lint               # Run ESLint
pnpm run lint           # Alternative to task lint
task lint:fix           # Auto-fix ESLint issues
pnpm exec eslint src/ --fix
task typecheck          # Run TypeScript type checking
pnpm exec tsc --noEmit  # Alternative to task typecheck
task check              # Run lint + typecheck + test (all checks)

# Utilities
task install            # Install dependencies with pnpm
pnpm install --frozen-lockfile
task clean              # Remove build artifacts
task icons              # Regenerate app icons from SVG
```

---

## Project Structure

```
src/
├── components/          # React components
│   ├── layout/          # AppShell, Toolbar, Sidebar, StatusBar, SplitPane
│   ├── panels/          # WelcomePanel, OperationPanel, SchemaPanel, etc.
│   ├── schema/          # SchemaEditor, SchemaTree
│   ├── shared/          # FormField, Button, Input, etc.
│   └── tree/            # TreeNode, TreeView
├── store/               # Zustand state stores
│   ├── actions/         # Store action modules (tree-actions, file-actions)
│   ├── spec-store.ts    # OpenAPI spec state with undo/redo
│   └── app-store.ts     # UI state (sidebar, theme)
├── hooks/               # Custom React hooks (useKeyboardShortcuts, useTheme)
├── lib/                 # Core utilities (validator, yaml-engine, tree-builder)
├── types/               # TypeScript type definitions
└── App.tsx              # Root component
```

---

## Code Style Guidelines

### File Naming Conventions
- **Components**: PascalCase with `.tsx` extension → `AppShell.tsx`, `FormField.tsx`
- **Hooks**: camelCase with `use` prefix, `.ts` extension → `useValidation.ts`, `useTheme.ts`
- **Stores**: kebab-case with `.ts` extension → `spec-store.ts`, `app-store.ts`
- **Libraries/Utilities**: kebab-case with `.ts` extension → `yaml-engine.ts`, `tree-builder.ts`
- **Types**: camelCase with `.ts` extension → `editor.ts`, `validation.ts`
- **Folders**: kebab-case → `components/`, `shared/`, `store/actions/`

### Import Organization
Group imports in this order (no strict alphabetization, but logical grouping):

1. **External libraries** (React, Zustand, Tauri, third-party packages)
2. **Type imports** (using `type` keyword)
3. **Relative imports** (from `../../` paths)

**Example** (from `AppShell.tsx`):
```typescript
// External libraries
import { useAppStore } from "../../store/app-store";
import { useSpecStore } from "../../store/spec-store";

// Hooks
import { useWindowTitle } from "../../hooks/useWindowTitle";
import { useCloseHandler } from "../../hooks/useCloseHandler";

// Components
import Toolbar from "./Toolbar";
import ErrorBanner from "./ErrorBanner";
import Sidebar from "./Sidebar";
```

**Example** (from `spec-store.ts`):
```typescript
// External libraries
import { create, useStore } from "zustand";
import { temporal, type TemporalState } from "zundo";
import type { Document } from "yaml";
import type { oas31 } from "openapi3-ts";

// Types
import type { SpecState, SpecStore } from "../types/editor";
import type { ValidationResult } from "../types/validation";

// Utilities
import {
  parseYaml,
  stringifyYaml,
  applyEdit,
} from "../lib/yaml-engine";
```

### TypeScript Patterns

**Interfaces vs Types**:
- Use `interface` for object shapes (component props, store state, action signatures)
- Use `type` for unions, intersections, and computed types

**Examples**:
```typescript
// Interface for object shapes
interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

// Type for unions and intersections
type SpecStore = SpecState & SpecActions;
type ValidationSeverity = "error" | "warning" | "info";
```

**Strict Typing**:
- NO `as any`, `@ts-ignore`, or `@ts-expect-error` allowed
- Use proper type guards and narrow types explicitly
- Leverage TypeScript's strict mode (`tsconfig.json` has `strict: true`)

### Component Patterns

**Functional components** with arrow functions or function declarations:
```typescript
export default function AppShell() {
  const spec = useSpecStore((s) => s.spec);
  const selectedPath = useSpecStore((s) => s.selectedPath);
  
  return (
    <div className="flex h-screen flex-col">
      {/* component JSX */}
    </div>
  );
}
```

**Hook usage** for side effects and computed state:
```typescript
export default function AppShell() {
  useWindowTitle();  // Custom hook for side effects
  useCloseHandler();
  
  // Zustand selectors for state
  const spec = useSpecStore((s) => s.spec);
}
```

### State Management with Zustand

**Store structure** (from `spec-store.ts`):
```typescript
export const useSpecStore = create<SpecStore>()(
  temporal(
    (set, get) => ({
      // Initial state
      spec: null,
      yamlDocument: null,
      isDirty: false,
      
      // Actions
      openFile: async (path: string, content: string) => {
        set({ spec, yamlDocument, filePath: path, isDirty: false });
      },
    }),
    {
      // Undo/redo config
      equality: (a, b) => a.spec === b.spec,
      partialize: (state) => ({ spec: state.spec, yamlDocument: state.yamlDocument }),
    }
  )
);
```

**Accessing store state**:
```typescript
// Selector pattern (preferred for performance)
const spec = useSpecStore((s) => s.spec);
const selectedPath = useSpecStore((s) => s.selectedPath);

// Access actions
const openFile = useSpecStore((s) => s.openFile);
```

### Error Handling

**Try/catch patterns**:
```typescript
// For critical errors, throw with descriptive message
openFile: async (path: string, content: string) => {
  const outcome = parseYaml(content);
  if (!outcome.ok) {
    throw new Error(`Failed to parse YAML: ${outcome.error}`);
  }
  // ... continue
}

// For non-critical errors, catch silently or log
validateSpecDebounced(yaml, setValidation).catch(() => {
  // Validation failures are non-blocking
});
```

**Empty catch blocks** are acceptable for non-critical operations where failure is expected and handled elsewhere.

### Comment Style
- Use `//` for inline comments and explanations
- Use `/** */` for JSDoc comments (primarily in test files)
- NO TODO markers found in codebase — resolve todos immediately or create issues
- Use TypeScript triple-slash directives for type references: `/// <reference types="vite/client" />`

---

## Testing with Vitest

**Test file structure**:
```typescript
import { describe, it, expect } from "vitest";
import { validateSpec } from "./validator";

describe("validateSpec", () => {
  it("should return no errors for valid spec", async () => {
    const validSpec = `openapi: 3.1.0
info:
  title: Test
  version: 1.0.0
paths: {}`;

    const result = await validateSpec(validSpec);
    expect(result.counts.error).toBe(0);
  });
});
```

**Test patterns**:
- Use `describe` blocks to group related tests
- Use `it` for individual test cases with descriptive names
- Use `expect` for assertions (Vitest matchers)
- Async tests use `async/await` syntax
- Test files co-located with source: `validator.ts` → `validator.test.ts`

---

## Key Constraints

1. **Type Safety**: Never suppress TypeScript errors with `as any` or `@ts-ignore`
2. **Empty Catch**: Only use empty catch blocks for truly non-critical errors
3. **Devenv Requirement**: Always run `devenv shell` before build commands
4. **Package Manager**: Use `pnpm` (NOT npm or yarn)
5. **No TODO Comments**: Resolve immediately or create GitHub issues
6. **Frozen Lockfile**: Use `pnpm install --frozen-lockfile` in CI and fresh installs
7. **ESLint Rules**: Follow TypeScript ESLint strict config — unused vars prefixed with `_`

---

## Verification Checklist

Before completing any task:
- [ ] Run `task lint` or `pnpm run lint` — zero errors
- [ ] Run `task typecheck` or `pnpm exec tsc --noEmit` — zero errors
- [ ] Run `task test` or `pnpm test` — all tests pass
- [ ] If adding new features, write tests in co-located `.test.ts` files
- [ ] Verify changes in dev mode: `task dev`

For production builds:
- [ ] Run `devenv shell` first
- [ ] Run `task build` — successful bundle creation
- [ ] Test the built application before releasing
