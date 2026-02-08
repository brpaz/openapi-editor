import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import ArrayEditor from "../shared/ArrayEditor";
import type { oas31 } from "openapi3-ts";

function getTags(spec: oas31.OpenAPIObject): oas31.TagObject[] {
  return Array.isArray(spec.tags) ? spec.tags : [];
}

function TagPanelInner({ index }: { index: number }) {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["tags", index.toString()]);
  const getExternalDocsError = useFieldErrors(["tags", index.toString(), "externalDocs"]);

  const handleFieldChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField(["tags", index.toString(), field], value);
    },
    [updateField, index],
  );

  const handleExternalDocsChange = useCallback(
    (field: string, value: string | number | boolean) => {
      updateField(["tags", index.toString(), "externalDocs", field], value);
    },
    [updateField, index],
  );

  if (!spec) return null;

  const tags = getTags(spec);
  const tag = tags[index];
  if (!tag) return null;

  const externalDocs: { url?: string; description?: string } =
    tag.externalDocs ?? {};

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Tag: {tag.name}
      </h2>

      <div className="space-y-4">
        <FormField
          label="Name"
          value={tag.name ?? ""}
          onChange={(v) => handleFieldChange("name", v)}
          required
          placeholder="Tag name"
          error={getFieldError("name")}
        />

        <FormField
          label="Description"
          value={typeof tag.description === "string" ? tag.description : ""}
          onChange={(v) => handleFieldChange("description", v)}
          type="textarea"
          placeholder="Tag description"
          error={getFieldError("description")}
        />

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            External Documentation
          </legend>
          <div className="space-y-3">
            <FormField
              label="URL"
              value={typeof externalDocs.url === "string" ? externalDocs.url : ""}
              onChange={(v) => handleExternalDocsChange("url", v)}
              type="url"
              placeholder="https://example.com/docs"
              error={getExternalDocsError("url")}
            />
            <FormField
              label="Description"
              value={
                typeof externalDocs.description === "string"
                  ? externalDocs.description
                  : ""
              }
              onChange={(v) => handleExternalDocsChange("description", v)}
              type="textarea"
              placeholder="External docs description"
              error={getExternalDocsError("description")}
            />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export default memo(TagPanelInner);

export function TagsListPanel() {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const removeElement = useSpecStore((s) => s.removeElement);
  const setSelectedPath = useSpecStore((s) => s.setSelectedPath);

  const handleAdd = useCallback(() => {
    if (!spec) return;
    const name = window.prompt("Tag name:");
    if (!name) return;
    const tags = getTags(spec);
    const index = tags.length;
    updateField(["tags"], [...tags, { name }]);
    setSelectedPath(["tags", index.toString()]);
  }, [spec, updateField, setSelectedPath]);

  const handleRemove = useCallback(
    (index: number) => {
      removeElement(["tags", index.toString()]);
    },
    [removeElement],
  );

  if (!spec) return null;

  const tags = getTags(spec);

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Tags
      </h2>

      <ArrayEditor
        items={tags}
        onAdd={handleAdd}
        onRemove={handleRemove}
        addLabel="Add tag"
        emptyLabel="No tags defined"
        renderItem={(tag, i) => (
          <button
            type="button"
            onClick={() => setSelectedPath(["tags", i.toString()])}
            className="w-full text-left text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            {tag.name || "(unnamed)"}
          </button>
        )}
      />
    </div>
  );
}
