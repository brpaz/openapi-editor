# Validation System

OpenAPI Editor validates specs in real-time using SwaggerParser, with debounced validation to avoid blocking the UI.

## Validation Flow

```
User edits field
  ↓
spec-store.updateField(path, value)
  ↓
YAML document updated
  ↓
triggerValidation() schedules debounced validation (300ms)
  ↓
validateSpecDebounced() called after 300ms idle
  ↓
SwaggerParser.validate(spec)
  ↓
Errors mapped to tree paths and field paths
  ↓
spec-store.setValidationResult(result)
  ↓
UI updates: badges, field highlights, status bar
```

## Core Implementation

### Validator (`src/lib/validator.ts`)

```typescript
import SwaggerParser from '@apidevtools/swagger-parser';

export async function validateSpec(
  spec: OpenAPIObject
): Promise<ValidationResult> {
  try {
    // Validate against OpenAPI 3.x schema
    await SwaggerParser.validate(spec);
    
    return {
      valid: true,
      errors: [],
    };
  } catch (err) {
    // SwaggerParser throws on validation errors
    const errors = parseValidationErrors(err);
    
    return {
      valid: false,
      errors,
    };
  }
}

function parseValidationErrors(err: any): ValidationError[] {
  // SwaggerParser error format varies (single error vs array)
  const rawErrors = Array.isArray(err.details) ? err.details : [err];
  
  return rawErrors.map(error => ({
    message: error.message,
    path: error.path || [],        // JSONPath to error location
    keyword: error.keyword,         // e.g., "required", "type"
    schemaPath: error.schemaPath,   // Path in OpenAPI schema
  }));
}
```

**Validation library**: Currently uses `@apidevtools/swagger-parser`. Future migration to Redocly planned (see `thoughts/tickets/plan_openapi_visual_editor.md`).

### Debounced Validation

```typescript
import { debounce } from 'lodash-es';

// In spec-store.ts
const validateSpecDebounced = debounce(async () => {
  const { spec } = useSpecStore.getState();
  
  const result = await validateSpec(spec);
  
  useSpecStore.getState().setValidationResult(result);
}, 300);  // 300ms delay

// Triggered on every spec change
updateField: (path, value) => {
  applyEdit(document, path, value);
  set({ spec: documentToSpec(document), isDirty: true });
  validateSpecDebounced();  // Schedule validation
}
```

**Why debounce?**
- Validation can take 50-200ms on large specs
- Running on every keystroke blocks UI
- 300ms idle time ensures validation only runs when user pauses

## Error Mapping

Validation errors use JSONPath to indicate location:

```typescript
// SwaggerParser error
{
  message: "Missing required property: title",
  path: ["info"],
  keyword: "required"
}

// Mapped to tree path
"info"  // Highlights "Info" node in tree

// Mapped to field path
"info.title"  // Highlights title field in Info panel
```

### Path-to-Node Mapping

`src/lib/tree-builder.ts` marks tree nodes with errors:

```typescript
export function buildTree(
  spec: OpenAPIObject,
  validationResult?: ValidationResult
): TreeNode[] {
  const errorPaths = new Set(
    validationResult?.errors.map(err => err.path.join('.')) || []
  );
  
  const nodes = [];
  
  // Build Info node
  const infoNode: TreeNode = {
    id: 'info',
    label: 'Info',
    path: 'info',
    type: 'info',
    hasError: errorPaths.has('info'),  // Mark if errors exist
    children: [],
  };
  
  nodes.push(infoNode);
  
  // ... build other nodes
  
  return nodes;
}
```

**Tree rendering**: Nodes with `hasError: true` show error badge.

### Field-Level Errors

`src/hooks/useValidation.ts` provides hooks to access errors:

```typescript
export function useFieldError(fieldPath: string): string | null {
  const validationResult = useSpecStore(state => state.validationResult);
  
  if (!validationResult || validationResult.valid) {
    return null;
  }
  
  // Find error matching this field path
  const error = validationResult.errors.find(err => 
    err.path.join('.') === fieldPath
  );
  
  return error ? error.message : null;
}

export function usePathErrors(nodePath: string): ValidationError[] {
  const validationResult = useSpecStore(state => state.validationResult);
  
  if (!validationResult || validationResult.valid) {
    return [];
  }
  
  // Find all errors under this path (including children)
  return validationResult.errors.filter(err => 
    err.path.join('.').startsWith(nodePath)
  );
}
```

**Usage in components:**

```typescript
// In FormField
const error = useFieldError('info.title');

<FormField
  label="Title"
  value={spec.info.title}
  error={error}  // Shows red border + error message
  onChange={(value) => updateField('info.title', value)}
/>
```

## UI Components

### ValidationBadge (`src/components/shared/ValidationBadge.tsx`)

Inline error indicator with tooltip:

```typescript
interface ValidationBadgeProps {
  path: string;  // Tree node path
}

export function ValidationBadge({ path }: ValidationBadgeProps) {
  const errors = usePathErrors(path);
  
  if (errors.length === 0) return null;
  
  return (
    <Tooltip content={errors.map(e => e.message).join('\n')}>
      <span className="badge badge-error">
        {errors.length}
      </span>
    </Tooltip>
  );
}
```

**Rendered in**: TreeNode component, next to node labels.

### FormField (`src/components/shared/FormField.tsx`)

Form input with error highlighting:

```typescript
interface FormFieldProps {
  label: string;
  value: string;
  error?: string | null;
  onChange: (value: string) => void;
}

export function FormField({ label, value, error, onChange }: FormFieldProps) {
  return (
    <div className="form-field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={error ? 'input-error' : ''}  // Red border if error
      />
      {error && <span className="error-message">{error}</span>}
    </div>
  );
}
```

**CSS**: `.input-error` applies red border and error text color.

### StatusBar (`src/components/layout/StatusBar.tsx`)

Shows validation summary with clickable error list:

```typescript
export function StatusBar() {
  const validationResult = useSpecStore(state => state.validationResult);
  const setSelectedPath = useSpecStore(state => state.setSelectedPath);
  
  if (!validationResult) {
    return <div className="status-bar">Validating...</div>;
  }
  
  if (validationResult.valid) {
    return <div className="status-bar status-success">✓ Valid OpenAPI spec</div>;
  }
  
  return (
    <div className="status-bar status-error">
      <span>{validationResult.errors.length} errors</span>
      <ul>
        {validationResult.errors.map((error, i) => (
          <li key={i} onClick={() => setSelectedPath(error.path.join('.'))}>
            {error.path.join('.')} - {error.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

**Interaction**: Clicking an error navigates to the relevant tree node and opens the editor panel.

### ErrorBanner (`src/components/layout/ErrorBanner.tsx`)

App-level error display (not validation errors):

```typescript
export function ErrorBanner() {
  const error = useAppStore(state => state.error);
  const setError = useAppStore(state => state.setError);
  
  if (!error) return null;
  
  return (
    <div className="error-banner">
      <span>{error}</span>
      <button onClick={() => setError(null)}>✕</button>
    </div>
  );
}
```

**Use case**: File I/O errors, Tauri API errors, not OpenAPI validation errors.

## Validation Types

SwaggerParser checks:

| Type | Example |
|------|---------|
| **Schema compliance** | `info.title` is required |
| **Type errors** | `info.version` must be string |
| **$ref resolution** | `$ref: '#/components/schemas/User'` must exist |
| **Format validation** | `email` format, `uri` format |
| **Enum validation** | `type` must be one of: string, number, boolean, etc. |
| **Required properties** | Required fields in OpenAPI objects |

## Performance Optimizations

### Debounce Strategy

```typescript
// 300ms idle time before validation runs
const validateSpecDebounced = debounce(validateSpec, 300);

// User types "My API Title" (13 keystrokes)
// Validation only runs ONCE, 300ms after last keystroke
```

**Why 300ms?**
- Too short (< 100ms): Still validates while user typing
- Too long (> 500ms): Feels laggy
- 300ms: Sweet spot for most users

### Async Validation

```typescript
// Validation runs in background, doesn't block UI
const result = await validateSpec(spec);
useSpecStore.getState().setValidationResult(result);
```

**React update**: After validation completes, store update triggers re-render with new errors.

### Partial Validation (Future)

Currently validates entire spec on every change. Future optimization:

```typescript
// Only validate affected paths
validatePath('info.title', spec.info.title);  // Faster than full spec validation
```

**Limitation**: $ref resolution requires full spec context, limiting partial validation effectiveness.

## Error Handling

### Parsing Errors vs Validation Errors

**YAML parsing errors** (from `parseYaml`):
```typescript
const { errors } = parseYaml(content);
// Syntax errors, invalid YAML structure
```

**OpenAPI validation errors** (from `validateSpec`):
```typescript
const { errors } = await validateSpec(spec);
// Schema violations, missing required fields
```

**Parsing errors** prevent spec loading. **Validation errors** allow editing but show warnings.

### Error Recovery

```typescript
// In file-actions.ts
try {
  const content = await fs.readTextFile(filePath);
  const { document, spec, errors } = parseYaml(content);
  
  if (errors.length > 0) {
    // Parsing failed - show error banner
    useAppStore.getState().setError(
      `YAML parsing errors:\n${errors.map(e => e.message).join('\n')}`
    );
    return;
  }
  
  // Parsing succeeded - load spec and validate
  useSpecStore.getState().setSpec(spec, document, filePath);
  validateSpecDebounced();
} catch (err) {
  // File I/O error
  useAppStore.getState().setError(`Failed to open file: ${err.message}`);
}
```

## Future: Redocly Integration

Planned migration from SwaggerParser to Redocly (see `thoughts/tickets/plan_openapi_visual_editor.md`):

```typescript
import { bundle, lint } from '@redocly/openapi-core';

// Redocly provides:
// - Faster validation
// - More detailed error messages
// - Linting rules (beyond spec compliance)
// - Better $ref resolution
```

**Status**: Not implemented yet. Current code uses SwaggerParser.

## Testing

Validation is tested via spec-store tests:

```typescript
import { useSpecStore } from './spec-store';
import { validateSpec } from '../lib/validator';

test('validation marks invalid spec', async () => {
  const store = useSpecStore.getState();
  
  const invalidSpec = {
    openapi: '3.0.0',
    info: {},  // Missing required 'title'
  };
  
  const result = await validateSpec(invalidSpec);
  
  expect(result.valid).toBe(false);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0].path).toEqual(['info']);
  expect(result.errors[0].keyword).toBe('required');
});
```

## Related Documentation

- [State Management](../architecture/state-management.md) - ValidationResult storage
- [Tree Navigation](tree-navigation.md) - Error badges on nodes
- [YAML Engine](../architecture/yaml-engine.md) - Parsing errors vs validation errors
- [File I/O](file-io.md) - Error handling on load/save
