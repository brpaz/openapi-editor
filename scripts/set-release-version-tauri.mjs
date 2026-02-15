import fs from "node:fs";

const tag = process.env.GITHUB_REF_NAME;
if (!tag) throw new Error("GITHUB_REF_NAME is not set");
const version = tag.startsWith("v") ? tag.slice(1) : tag;

// Update src-tauri/Cargo.toml
{
  const file = "src-tauri/Cargo.toml";
  const content = fs.readFileSync(file, "utf8");
  const updated = content.replace(
    /^version\s*=\s*"[^"]*"/m,
    `version = "${version}"`,
  );
  fs.writeFileSync(file, updated);
}

// Update src-tauri/tauri.conf.json
{
  const file = "src-tauri/tauri.conf.json";
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.version = version;
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + "\n");
}

console.log(`Set Tauri version to ${version}`);
