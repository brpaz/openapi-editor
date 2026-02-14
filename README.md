<div align="center">
  <img src="src-tauri/icons/icon.png" alt="OpenAPI Editor" width="128" height="128">
  
  # OpenAPI Editor
  
  A cross-platform desktop application for visually editing OpenAPI 3.1 specifications. Edit your API specs using form-based panels instead of writing raw YAML.
  
  Built with [Tauri 2](https://v2.tauri.app/), React 19, and Tailwind CSS v4.
</div>

[!WARNING]
This software was vibe coded in a weekend to solve a personal itch. Use at your own risk.

## Features

- Form-based editing for all OpenAPI 3.1 elements (paths, operations, schemas, responses, parameters, request bodies)
- Tree sidebar navigation with search and filtering
- YAML file I/O with comment preservation
- Clipboard paste and copy support
- Real-time inline validation via Redocly
- Full undo/redo
- Dark mode with system theme detection
- Create new specs from scratch
- Recent files list
- Keyboard shortcuts (Ctrl+S, Ctrl+O, Ctrl+N, Ctrl+Z, etc.)

## Prerequisites

- [Devenv](https://devenv.sh/) (recommended) or manually install:
  - Node.js 24+
  - [pnpm](https://pnpm.io/)
  - Rust stable
  - [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/)
- [Task](https://taskfile.dev/) (optional, for development commands)

## Getting Started

```bash
# Enter the dev environment (required for pkg-config and system libraries)
devenv shell

# Install dependencies
task install
# or: pnpm install --frozen-lockfile

# Start development server
task dev
# or: pnpm run tauri dev
```

**Important**: Always run `devenv shell` before any build commands. This sets up `PKG_CONFIG_PATH` and other environment variables needed for Tauri's WebKit2GTK dependencies.

## Development Tasks

Run `task --list` to see all available tasks. Key ones:

| Task | Description |
|------|-------------|
| `task dev` | Start Tauri dev server with hot reload |
| `task dev:web` | Start Vite dev server only (no Tauri window) |
| `task check` | Run lint + type-check + tests |
| `task lint` | Run ESLint |
| `task typecheck` | Run TypeScript type checking |
| `task test` | Run tests once |
| `task test:watch` | Run tests in watch mode |
| `task build` | Build for current platform |
| `task build:flatpak` | Build Flatpak bundle |
| `task icons` | Regenerate app icons from SVG |
| `task clean` | Remove build artifacts |

## Building

```bash
# Production build for current platform
task build

# Debug build
task build:debug
```

Build artifacts are output to `src-tauri/target/release/bundle/`.

## Releasing

Push a version tag to trigger the CI release workflow:

```bash
task release:tag -- v0.1.0
```

This creates GitHub releases with binaries for Linux (.deb, AppImage), macOS (.dmg), and Windows (.msi, .exe). A Flatpak bundle is also built automatically from the Linux binary.

Release notes are drafted automatically via [release-drafter](https://github.com/release-drafter/release-drafter), and a [CHANGELOG.md](CHANGELOG.md) is updated on each published release.

## Documentation

See the [docs/](docs/) folder for comprehensive architecture and feature documentation:

- [Architecture Overview](docs/architecture/overview.md) - High-level system design
- [State Management](docs/architecture/state-management.md) - Zustand + Zundo patterns
- [YAML Engine](docs/architecture/yaml-engine.md) - Comment-preserving parser
- [Validation System](docs/features/validation.md) - Real-time spec validation
- [Tree Navigation](docs/features/tree-navigation.md) - Hierarchical spec browser
- [Undo/Redo](docs/features/undo-redo.md) - Temporal state management
- [File I/O](docs/features/file-io.md) - Open/save/recent files

## Project Structure

```
src/                    React frontend
  components/           UI components (layout, tree, panels, schema, shared)
  store/                Zustand stores + actions
  lib/                  Core logic (YAML engine, validator, ref-resolver, tree-builder)
  hooks/                React hooks (theme, validation, keyboard shortcuts)
  types/                TypeScript type definitions
src-tauri/              Tauri Rust backend
flatpak/                Flatpak manifest, desktop entry, metainfo
docs/                   Architecture and feature documentation
.github/workflows/      CI, release, Flatpak build, and changelog workflows
```

## Tech Stack

| Concern | Library |
|---------|---------|
| Desktop runtime | Tauri 2 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v4 |
| State management | Zustand 5 + Zundo (undo/redo) |
| YAML | eemeli/yaml (comment-preserving) |
| Validation | @redocly/openapi-core |
| OpenAPI types | openapi3-ts |
| $ref resolution | @apidevtools/swagger-parser |

## License

This project is licensed under the MIT License. Check [LICENSE.md](LICENSE) for details.
