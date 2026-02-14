# Tree Navigation

The OpenAPI Editor represents the spec as a hierarchical tree for easy navigation and editing. Users click tree nodes to open corresponding editor panels.

## Tree Structure

The tree mirrors the OpenAPI spec structure:

```
My API
├── Info
│   ├── Title
│   ├── Version
│   ├── Description
│   └── Contact
├── Servers
│   ├── Server 0
│   └── Server 1
├── Paths
│   ├── /users
│   │   ├── GET
│   │   │   ├── Summary
│   │   │   ├── Parameters
│   │   │   └── Responses
│   │   │       ├── 200
│   │   │       └── 404
│   │   └── POST
│   └── /users/{id}
│       ├── GET
│       └── DELETE
└── Components
    ├── Schemas
    │   ├── User
    │   └── Error
    ├── Parameters
    └── Responses
```

## Core Implementation

### Tree Builder (`src/lib/tree-builder.ts`)

Converts OpenAPI spec to tree structure:

```typescript
export function buildTree(
  spec: OpenAPIObject,
  validationResult?: ValidationResult
): TreeNode[] {
  const errorPaths = new Set(
    validationResult?.errors.map(err => err.path.join('.')) || []
  );
  
  const nodes: TreeNode[] = [];
  
  // Info section
  if (spec.info) {
    nodes.push({
      id: 'info',
      label: 'Info',
      path: 'info',
      type: 'info',
      hasError: errorPaths.has('info'),
      children: buildInfoChildren(spec.info),
    });
  }
  
  // Servers section
  if (spec.servers && spec.servers.length > 0) {
    nodes.push({
      id: 'servers',
      label: 'Servers',
      path: 'servers',
      type: 'servers',
      hasError: errorPaths.has('servers'),
      children: spec.servers.map((server, i) => ({
        id: `servers.${i}`,
        label: server.description || `Server ${i}`,
        path: `servers.${i}`,
        type: 'server',
        hasError: errorPaths.has(`servers.${i}`),
        children: [],
      })),
    });
  }
  
  // Paths section
  if (spec.paths) {
    nodes.push({
      id: 'paths',
      label: 'Paths',
      path: 'paths',
      type: 'paths',
      hasError: hasErrorsUnder('paths', errorPaths),
      children: buildPathsChildren(spec.paths, errorPaths),
    });
  }
  
  // Components section
  if (spec.components) {
    nodes.push({
      id: 'components',
      label: 'Components',
      path: 'components',
      type: 'components',
      hasError: hasErrorsUnder('components', errorPaths),
      children: buildComponentsChildren(spec.components, errorPaths),
    });
  }
  
  return nodes;
}
```

### TreeNode Type (`src/types/tree.ts`)

```typescript
export interface TreeNode {
  id: string;                    // Unique identifier (matches path)
  label: string;                 // Display name
  path: string;                  // Dot-separated path in spec
  type: TreeNodeType;            // Node type (for icons/colors)
  hasError: boolean;             // Validation error flag
  children: TreeNode[];          // Child nodes
  isExpanded?: boolean;          // Expansion state
  metadata?: Record<string, any>; // Additional data (HTTP method, etc.)
}

export enum TreeNodeType {
  INFO = 'info',
  SERVERS = 'servers',
  SERVER = 'server',
  PATHS = 'paths',
  PATH = 'path',
  OPERATION = 'operation',
  COMPONENTS = 'components',
  SCHEMAS = 'schemas',
  SCHEMA = 'schema',
  PARAMETERS = 'parameters',
  PARAMETER = 'parameter',
  RESPONSES = 'responses',
  RESPONSE = 'response',
  // ... more types
}
```

### HTTP Method Metadata

Operation nodes include HTTP method metadata for color-coding:

```typescript
// In buildPathsChildren
const operation: TreeNode = {
  id: `paths.${pathKey}.${method}`,
  label: method.toUpperCase(),
  path: `paths.${pathKey}.${method}`,
  type: 'operation',
  hasError: errorPaths.has(`paths.${pathKey}.${method}`),
  metadata: { method },  // Used for icon color
  children: buildOperationChildren(operationObj),
};
```

**Method colors** (defined in `src/types/tree.ts`):

```typescript
export const METHOD_COLORS: Record<string, string> = {
  get: 'text-blue-500',
  post: 'text-green-500',
  put: 'text-yellow-500',
  patch: 'text-orange-500',
  delete: 'text-red-500',
  options: 'text-purple-500',
  head: 'text-gray-500',
  trace: 'text-pink-500',
};
```

## UI Components

### SpecTree (`src/components/tree/SpecTree.tsx`)

Main tree container with search and rendering:

```typescript
export function SpecTree() {
  const spec = useSpecStore(state => state.spec);
  const validationResult = useSpecStore(state => state.validationResult);
  const selectedPath = useSpecStore(state => state.selectedPath);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Build tree from spec
  const tree = useMemo(
    () => buildTree(spec, validationResult),
    [spec, validationResult]
  );
  
  // Filter tree by search query
  const filteredTree = useMemo(
    () => searchQuery ? filterTree(tree, searchQuery) : tree,
    [tree, searchQuery]
  );
  
  // Handle node selection
  const handleSelect = (path: string) => {
    useSpecStore.getState().setSelectedPath(path);
  };
  
  // Handle node expand/collapse
  const handleToggle = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  return (
    <div className="spec-tree">
      <TreeSearch query={searchQuery} onChange={setSearchQuery} />
      
      <div className="tree-nodes">
        {filteredTree.map(node => (
          <TreeNode
            key={node.id}
            node={node}
            selectedPath={selectedPath}
            expandedNodes={expandedNodes}
            onSelect={handleSelect}
            onToggle={handleToggle}
          />
        ))}
      </div>
    </div>
  );
}
```

### TreeNode (`src/components/tree/TreeNode.tsx`)

Individual tree node with expand/collapse, selection, and actions:

```typescript
interface TreeNodeProps {
  node: TreeNode;
  selectedPath: string | null;
  expandedNodes: Set<string>;
  onSelect: (path: string) => void;
  onToggle: (nodeId: string) => void;
  depth?: number;
}

export function TreeNode({
  node,
  selectedPath,
  expandedNodes,
  onSelect,
  onToggle,
  depth = 0,
}: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedPath === node.path;
  const hasChildren = node.children.length > 0;
  
  const [isHovered, setIsHovered] = useState(false);
  
  // Icon based on node type
  const icon = getIconForNodeType(node.type, node.metadata);
  
  return (
    <div className="tree-node">
      <div
        className={cn(
          'tree-node-content',
          isSelected && 'selected',
          node.hasError && 'error'
        )}
        style={{ paddingLeft: `${depth * 16}px` }}
        onClick={() => onSelect(node.path)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Expand/collapse button */}
        {hasChildren && (
          <button
            className="expand-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        )}
        
        {/* Icon */}
        <span className={cn('node-icon', icon.color)}>
          {icon.symbol}
        </span>
        
        {/* Label with search highlighting */}
        <span className="node-label">
          {highlightSearchMatch(node.label, searchQuery)}
        </span>
        
        {/* Validation badge */}
        {node.hasError && <ValidationBadge path={node.path} />}
        
        {/* Hover actions */}
        {isHovered && (
          <div className="node-actions">
            <button onClick={(e) => handleAdd(e, node)}>+</button>
            <button onClick={(e) => handleDelete(e, node)}>×</button>
          </div>
        )}
      </div>
      
      {/* Render children if expanded */}
      {isExpanded && hasChildren && (
        <div className="tree-node-children">
          {node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              selectedPath={selectedPath}
              expandedNodes={expandedNodes}
              onSelect={onSelect}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

### TreeSearch (`src/components/tree/TreeSearch.tsx`)

Simple search input:

```typescript
interface TreeSearchProps {
  query: string;
  onChange: (query: string) => void;
}

export function TreeSearch({ query, onChange }: TreeSearchProps) {
  return (
    <div className="tree-search">
      <input
        type="text"
        placeholder="Search..."
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
      {query && (
        <button onClick={() => onChange('')} className="clear-button">
          ✕
        </button>
      )}
    </div>
  );
}
```

## Search and Filtering

### Filter Algorithm

```typescript
function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  const lowerQuery = query.toLowerCase();
  
  return nodes.reduce<TreeNode[]>((acc, node) => {
    // Check if node label matches
    const labelMatches = node.label.toLowerCase().includes(lowerQuery);
    
    // Recursively filter children
    const filteredChildren = node.children.length > 0
      ? filterTree(node.children, query)
      : [];
    
    // Include node if:
    // 1. Label matches, OR
    // 2. Any child matches (preserve parent for context)
    if (labelMatches || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren,
        isExpanded: true,  // Auto-expand matching nodes
      });
    }
    
    return acc;
  }, []);
}
```

**Behavior**:
- Case-insensitive substring match
- Preserves parent nodes if children match (provides context)
- Auto-expands matching nodes
- Hides non-matching branches entirely

### Search Highlighting

```typescript
function highlightSearchMatch(label: string, query: string): React.ReactNode {
  if (!query) return label;
  
  const lowerLabel = label.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerLabel.indexOf(lowerQuery);
  
  if (index === -1) return label;
  
  return (
    <>
      {label.substring(0, index)}
      <mark className="search-highlight">
        {label.substring(index, index + query.length)}
      </mark>
      {label.substring(index + query.length)}
    </>
  );
}
```

**CSS**: `.search-highlight` applies yellow background.

## Node Selection

### Selection State

```typescript
// In spec-store.ts
interface SpecStore {
  selectedPath: string | null;
  setSelectedPath: (path: string | null) => void;
}

// Usage
const selectedPath = useSpecStore(state => state.selectedPath);
const setSelectedPath = useSpecStore(state => state.setSelectedPath);

// Select node
setSelectedPath('paths./users.get');

// Clear selection
setSelectedPath(null);
```

### Selection Effects

When a node is selected:

1. **Tree highlighting**: Node shows selected state (background color)
2. **Panel rendering**: Main content area renders editor panel for selected path
3. **Scroll into view**: Tree scrolls to ensure selected node is visible

```typescript
// In EditorPanel component
const selectedPath = useSpecStore(state => state.selectedPath);

// Render panel based on selected path
if (!selectedPath) {
  return <WelcomePanel />;
}

if (selectedPath === 'info') {
  return <InfoPanel />;
}

if (selectedPath.startsWith('paths.')) {
  return <PathPanel path={selectedPath} />;
}

// ... more panel routing
```

## CRUD Operations

### Add Node

Triggered by clicking "+" button on tree nodes:

```typescript
function handleAdd(e: React.MouseEvent, node: TreeNode) {
  e.stopPropagation();
  
  // Show prompt for new item name
  const name = prompt(`Enter name for new ${node.type}:`);
  
  if (!name) return;
  
  // Call appropriate action based on node type
  switch (node.type) {
    case 'paths':
      addPath(node.path, name);
      break;
    case 'path':
      addOperation(node.path, name);
      break;
    case 'schemas':
      addSchema(node.path, name);
      break;
    // ... more cases
  }
}
```

**Actions** (from `src/store/actions/tree-actions.ts`):

```typescript
export function addPath(parentPath: string, pathName: string) {
  const store = useSpecStore.getState();
  const { yamlDocument } = store;
  
  const fullPath = `${parentPath}.${pathName}`;
  addToMap(yamlDocument, fullPath, {});
  
  store.updateField(fullPath, {});
  store.setSelectedPath(fullPath);
}

export function addOperation(pathPath: string, method: string) {
  const store = useSpecStore.getState();
  const fullPath = `${pathPath}.${method.toLowerCase()}`;
  
  store.updateField(fullPath, {
    summary: '',
    responses: {
      '200': {
        description: 'Successful response',
      },
    },
  });
  
  store.setSelectedPath(fullPath);
}
```

### Delete Node

Triggered by clicking "×" button on tree nodes:

```typescript
function handleDelete(e: React.MouseEvent, node: TreeNode) {
  e.stopPropagation();
  
  // Confirm deletion
  const confirmed = confirm(`Delete ${node.label}?`);
  
  if (!confirmed) return;
  
  // Delete from spec
  deletePath(node.path);
}
```

**Action**:

```typescript
export function deletePath(pathToDelete: string) {
  const store = useSpecStore.getState();
  const { yamlDocument } = store;
  
  deleteAtPath(yamlDocument, pathToDelete);
  
  // Clear selection if deleted node was selected
  if (store.selectedPath?.startsWith(pathToDelete)) {
    store.setSelectedPath(null);
  }
}
```

## State Persistence

### Expansion State

Expansion state is component-local (not persisted):

```typescript
// In SpecTree
const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
```

**On app reload**: All nodes collapse by default. Future enhancement could persist to localStorage.

### Selection State

Selection is stored globally but cleared on file open:

```typescript
// In file-actions.ts
export async function openFile() {
  // ... load file
  useSpecStore.getState().setSpec(spec, document, filePath);
  useSpecStore.getState().setSelectedPath(null);  // Clear selection
}
```

## Performance Optimizations

### Memoized Tree Building

```typescript
const tree = useMemo(
  () => buildTree(spec, validationResult),
  [spec, validationResult]
);
```

**Why**: Tree building traverses entire spec. Memoization prevents rebuilding on every render.

### Memoized Filtering

```typescript
const filteredTree = useMemo(
  () => searchQuery ? filterTree(tree, query) : tree,
  [tree, searchQuery]
);
```

**Why**: Filtering is recursive and expensive. Only re-filter when query or tree changes.

### Virtual Scrolling (Future)

For specs with 100+ paths, rendering all nodes is slow. Future enhancement: react-window for virtual scrolling.

## Testing

Tree builder is extensively tested (`src/lib/tree-builder.test.ts`):

```typescript
import { buildTree } from './tree-builder';

test('builds tree from spec', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'My API', version: '1.0.0' },
    paths: {
      '/users': {
        get: { summary: 'List users' },
      },
    },
  };
  
  const tree = buildTree(spec);
  
  expect(tree).toHaveLength(2);  // Info + Paths
  expect(tree[0].type).toBe('info');
  expect(tree[1].type).toBe('paths');
  expect(tree[1].children).toHaveLength(1);  // /users
  expect(tree[1].children[0].children).toHaveLength(1);  // GET
});

test('marks nodes with errors', () => {
  const spec = { /* ... */ };
  const validationResult = {
    valid: false,
    errors: [{ path: ['info'], message: 'Missing title' }],
  };
  
  const tree = buildTree(spec, validationResult);
  
  expect(tree[0].hasError).toBe(true);
});
```

## Related Documentation

- [State Management](../architecture/state-management.md) - selectedPath state
- [Validation](validation.md) - Error badges on nodes
- [YAML Engine](../architecture/yaml-engine.md) - CRUD operations on spec
- [File I/O](file-io.md) - Tree resets on file open
