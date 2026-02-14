# YAML Engine

The OpenAPI Editor's YAML engine preserves comments, whitespace, and formatting during spec editing using the `eemeli/yaml` library.

## Core Problem

Standard YAML parsers convert YAML → JS objects, discarding comments and formatting. When serializing back to YAML, all comments are lost:

```yaml
# This comment will be lost
info:
  title: My API  # So will this one
  version: 1.0.0
```

After parse → edit → serialize with standard parsers:

```yaml
info:
  title: My Updated API
  version: 1.0.0
```

**All comments gone.**

## Solution: Document AST

`eemeli/yaml` provides a Document AST that preserves source tokens, including comments. The editor manipulates this AST directly, then serializes it back to YAML with original formatting intact.

## Core Functions

All YAML engine functions are in `src/lib/yaml-engine.ts`.

### parseYaml

Parses YAML string into both a spec object and a Document AST.

```typescript
import { parseDocument, LineCounter } from 'yaml';

export function parseYaml(content: string): {
  spec: OpenAPIObject;
  document: Document;
  errors: YAMLError[];
} {
  const lineCounter = new LineCounter();
  
  const document = parseDocument(content, {
    keepSourceTokens: true,  // CRITICAL: Preserves comments
    lineCounter,
  });
  
  // Convert Document to plain object
  const spec = document.toJSON() as OpenAPIObject;
  
  // Collect parsing errors
  const errors = document.errors.map(err => ({
    message: err.message,
    line: lineCounter.linePos(err.pos[0]).line,
    column: lineCounter.linePos(err.pos[0]).col,
  }));
  
  return { spec, document, errors };
}
```

**Key parameter:**
- `keepSourceTokens: true` - Retains comments, whitespace, and formatting

### stringifyYaml

Serializes Document AST back to YAML string.

```typescript
export function stringifyYaml(document: Document): string {
  return document.toString();
}
```

**Why it works**: The Document AST retains all source tokens. `toString()` reconstructs the original YAML with edits applied.

### applyEdit

Modifies a value at a specific path in the Document AST.

```typescript
import { visit, isScalar, isMap, isSeq } from 'yaml';

export function applyEdit(
  document: Document,
  path: string,
  value: any
): void {
  const pathParts = path.split('.');
  
  // Navigate to the parent node
  const parentPath = pathParts.slice(0, -1);
  const key = pathParts[pathParts.length - 1];
  
  // Set value using Document's setIn method
  document.setIn(pathParts, value);
}
```

**Path format**: Dot-separated keys, e.g., `info.title`, `paths./users.get.summary`

**How it works**: `document.setIn(path, value)` navigates the AST and updates the node at the specified path, preserving surrounding comments.

### addToMap

Adds a new key to a map node in the Document AST.

```typescript
import { Pair, Scalar, YAMLMap } from 'yaml';

export function addToMap(
  document: Document,
  path: string,
  value: any
): void {
  const pathParts = path.split('.');
  const parentPath = pathParts.slice(0, -1);
  const newKey = pathParts[pathParts.length - 1];
  
  // Get parent map
  const parentMap = document.getIn(parentPath) as YAMLMap;
  
  if (!parentMap || !isMap(parentMap)) {
    throw new Error(`Parent at ${parentPath.join('.')} is not a map`);
  }
  
  // Create new Pair node
  const pair = new Pair(new Scalar(newKey), value);
  
  // Add to map
  parentMap.add(pair);
}
```

**Why not setIn?**: `setIn` overwrites existing keys. `addToMap` explicitly adds a new Pair to the map's items array, useful for user-initiated "Add" operations.

### deleteAtPath

Removes a node at a specific path in the Document AST.

```typescript
export function deleteAtPath(document: Document, path: string): void {
  const pathParts = path.split('.');
  const parentPath = pathParts.slice(0, -1);
  const key = pathParts[pathParts.length - 1];
  
  if (parentPath.length === 0) {
    // Deleting top-level key
    document.delete(key);
  } else {
    // Navigate to parent and delete child
    const parent = document.getIn(parentPath);
    
    if (isMap(parent)) {
      parent.delete(key);
    } else if (isSeq(parent)) {
      parent.delete(Number(key));
    }
  }
}
```

**Path resolution**: Handles both map keys (`paths./users`) and sequence indices (`servers.0`).

### getAtPath

Retrieves a value at a specific path in the Document AST.

```typescript
export function getAtPath(document: Document, path: string): any {
  const pathParts = path.split('.');
  return document.getIn(pathParts);
}
```

**Return value**: Returns YAML AST node (Scalar, Map, Seq), not plain JS value. Use `.toJSON()` to convert.

### documentToSpec

Converts Document AST to plain OpenAPI object.

```typescript
export function documentToSpec(document: Document): OpenAPIObject {
  return document.toJSON() as OpenAPIObject;
}
```

**Use case**: After AST manipulation, convert to plain object for validation or tree building.

## Edit Flow Example

User edits `info.title` from "My API" to "Updated API":

```typescript
// 1. Load file
const content = await fs.readTextFile(filePath);
const { document, spec } = parseYaml(content);

// 2. User edits field in UI
const newTitle = "Updated API";

// 3. Apply edit to Document AST
applyEdit(document, 'info.title', newTitle);

// 4. Convert Document to spec object for state
const updatedSpec = documentToSpec(document);

// 5. Update store
useSpecStore.getState().setSpec(updatedSpec, document);

// 6. Mark dirty
useSpecStore.getState().setDirty(true);

// 7. Save file
const updatedYaml = stringifyYaml(document);
await fs.writeTextFile(filePath, updatedYaml);
```

**Result**: Title updated, all comments preserved.

## Comment Preservation Example

**Before edit:**
```yaml
# My OpenAPI Spec
openapi: 3.0.0
info:
  title: My API  # Production API
  version: 1.0.0  # Semantic versioning
  description: |
    Multi-line description
    with formatting preserved
```

**After editing title to "Updated API":**
```yaml
# My OpenAPI Spec
openapi: 3.0.0
info:
  title: Updated API  # Production API
  version: 1.0.0  # Semantic versioning
  description: |
    Multi-line description
    with formatting preserved
```

**All comments and formatting preserved.**

## AST Node Types

`eemeli/yaml` provides these AST node types:

| Type | Description | Example |
|------|-------------|---------|
| `Scalar` | Primitive value | `"My API"`, `1.0.0`, `true` |
| `YAMLMap` | Object/map | `{ info: { title: "..." } }` |
| `YAMLSeq` | Array/sequence | `["tag1", "tag2"]` |
| `Pair` | Key-value pair in map | `title: "My API"` |
| `Alias` | Anchor reference | `*anchor` |
| `Document` | Top-level container | Full YAML document |

**Manipulation**: Use `document.setIn()`, `map.add()`, `map.delete()`, `seq.add()`, `seq.delete()`.

## Path Syntax

Paths use dot notation to navigate nested structures:

| Path | Target |
|------|--------|
| `info.title` | `spec.info.title` |
| `paths./users.get.summary` | `spec.paths["/users"].get.summary` |
| `servers.0.url` | `spec.servers[0].url` |
| `components.schemas.User.properties.id` | `spec.components.schemas.User.properties.id` |

**Special handling**: Paths starting with `/` (OpenAPI path items) require escaping when used as object keys.

## Limitations

### JSON Specs

The YAML engine only handles YAML files. JSON OpenAPI specs are parsed with `JSON.parse()` and lose all formatting on save (no comments in JSON anyway).

### Structural Changes

Large structural refactors (e.g., renaming all `$ref` targets) may lose some formatting due to node replacement. The editor prefers granular edits to minimize this.

### Array Indices

Array edits use numeric indices in paths (`servers.0`, `tags.1`). Inserting/removing items shifts indices, potentially confusing undo/redo. The editor limits array manipulation to avoid this.

## Performance Considerations

### Document Cloning

Each edit creates a new Document reference for undo/redo:

```typescript
// In spec-store.ts
updateField: (path, value) => {
  const { yamlDocument } = get();
  const newDocument = yamlDocument.clone();  // Deep clone
  applyEdit(newDocument, path, value);
  set({ yamlDocument: newDocument, isDirty: true });
}
```

**Why clone?**: Zundo's undo history stores state snapshots. Mutating the same Document instance would break undo.

**Performance**: Cloning is fast (<10ms for typical specs). Avoid cloning on every keystroke—debounce edits.

### Validation Trigger

Parsing/validating the Document on every edit is expensive:

```typescript
// DON'T: Validate on every keystroke
onChange={(e) => {
  updateField(path, e.target.value);  // Triggers validation
}}

// DO: Debounce validation
const debouncedUpdate = useMemo(
  () => debounce((path, value) => {
    updateField(path, value);
  }, 300),
  []
);

onChange={(e) => debouncedUpdate(path, e.target.value)}
```

**Implemented**: The spec-store already debounces validation at 300ms.

## Testing

The YAML engine includes unit tests in `src/lib/yaml-engine.test.ts`:

```typescript
import { parseYaml, stringifyYaml, applyEdit } from './yaml-engine';

test('preserves comments on edit', () => {
  const yaml = `
# Comment
info:
  title: Original  # Inline comment
`;
  
  const { document } = parseYaml(yaml);
  applyEdit(document, 'info.title', 'Updated');
  const result = stringifyYaml(document);
  
  expect(result).toContain('# Comment');
  expect(result).toContain('# Inline comment');
  expect(result).toContain('title: Updated');
});
```

## Related Documentation

- [State Management](state-management.md) - How Document AST is stored
- [Undo/Redo](../features/undo-redo.md) - Document cloning for undo history
- [File I/O](../features/file-io.md) - Loading/saving YAML files
- [Validation](../features/validation.md) - Validating after edits
