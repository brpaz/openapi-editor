import { memo, useCallback } from "react";
import { useSpecStore } from "../../store/spec-store";
import { useFieldErrors } from "../../hooks/useValidation";
import FormField from "../shared/FormField";
import MarkdownEditor from "../shared/MarkdownEditor";

function InfoPanelInner() {
  const spec = useSpecStore((s) => s.spec);
  const updateField = useSpecStore((s) => s.updateField);
  const getFieldError = useFieldErrors(["info"]);
  const getContactError = useFieldErrors(["info", "contact"]);
  const getLicenseError = useFieldErrors(["info", "license"]);

  const handleChange = useCallback(
    (path: string[], value: string | number | boolean) => {
      updateField(path, value);
    },
    [updateField],
  );

  if (!spec) return null;

  const info = spec.info;
  const contact = info.contact ?? {};
  const license = info.license ?? { name: "" };

  return (
    <div className="flex h-full flex-col overflow-y-auto p-6">
      <h2 className="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">
        API Information
      </h2>

      <div className="space-y-4">
        <FormField
          label="Title"
          value={info.title ?? ""}
          onChange={(v) => handleChange(["info", "title"], v)}
          required
          placeholder="My API"
          error={getFieldError("title")}
        />

        <FormField
          label="Version"
          value={info.version ?? ""}
          onChange={(v) => handleChange(["info", "version"], v)}
          required
          placeholder="1.0.0"
          error={getFieldError("version")}
        />

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <MarkdownEditor
            value={typeof info.description === "string" ? info.description : ""}
            onChange={(v) => handleChange(["info", "description"], v)}
            placeholder="Describe your API..."
          />
        </div>

        <FormField
          label="Terms of Service"
          value={typeof info.termsOfService === "string" ? info.termsOfService : ""}
          onChange={(v) => handleChange(["info", "termsOfService"], v)}
          type="url"
          placeholder="https://example.com/terms"
          error={getFieldError("termsOfService")}
        />

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Contact
          </legend>
          <div className="space-y-3">
            <FormField
              label="Name"
              value={typeof contact.name === "string" ? contact.name : ""}
              onChange={(v) => handleChange(["info", "contact", "name"], v)}
              placeholder="API Support"
              error={getContactError("name")}
            />
            <FormField
              label="URL"
              value={typeof contact.url === "string" ? contact.url : ""}
              onChange={(v) => handleChange(["info", "contact", "url"], v)}
              type="url"
              placeholder="https://example.com/support"
              error={getContactError("url")}
            />
            <FormField
              label="Email"
              value={typeof contact.email === "string" ? contact.email : ""}
              onChange={(v) => handleChange(["info", "contact", "email"], v)}
              type="email"
              placeholder="support@example.com"
              error={getContactError("email")}
            />
          </div>
        </fieldset>

        <fieldset className="rounded border border-gray-200 p-4 dark:border-gray-700">
          <legend className="px-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
            License
          </legend>
          <div className="space-y-3">
            <FormField
              label="Name"
              value={typeof license.name === "string" ? license.name : ""}
              onChange={(v) => handleChange(["info", "license", "name"], v)}
              placeholder="MIT"
              error={getLicenseError("name")}
            />
            <FormField
              label="URL"
              value={typeof license.url === "string" ? license.url : ""}
              onChange={(v) => handleChange(["info", "license", "url"], v)}
              type="url"
              placeholder="https://opensource.org/licenses/MIT"
              error={getLicenseError("url")}
            />
            <FormField
              label="Identifier"
              value={
                "identifier" in license &&
                typeof license.identifier === "string"
                  ? license.identifier
                  : ""
              }
              onChange={(v) =>
                handleChange(["info", "license", "identifier"], v)
              }
              helpText="SPDX license identifier"
              placeholder="MIT"
              error={getLicenseError("identifier")}
            />
          </div>
        </fieldset>
      </div>
    </div>
  );
}

export default memo(InfoPanelInner);
