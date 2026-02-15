import fs from "node:fs";

const tag = process.env.GITHUB_REF_NAME;
if (!tag) throw new Error("GITHUB_REF_NAME is not set");
const version = tag.startsWith("v") ? tag.slice(1) : tag;
const today = new Date().toISOString().slice(0, 10);

// Get release notes from environment variable (passed from workflow)
const releaseNotes = process.env.RELEASE_NOTES || "";

const file = "flatpak/dev.brunopaz.openapi-editor.metainfo.xml";
let xml = fs.readFileSync(file, "utf8");

if (!/<releases>/.test(xml) || !/<\/releases>/.test(xml)) {
  throw new Error("Missing <releases> section");
}

// Build release block with or without description
let releaseBlock;
if (releaseNotes.trim()) {
  // Convert markdown-style release notes to simple paragraphs
  const paragraphs = releaseNotes
    .trim()
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `        <p>${p.replace(/\n/g, " ")}</p>`)
    .join("\n");

  releaseBlock = `    <release version="${version}" date="${today}">
      <description>
${paragraphs}
      </description>
    </release>
`;
} else {
  releaseBlock = `    <release version="${version}" date="${today}" />\n`;
}

xml = xml.replace(/<releases>\s*\n/, (m) => `${m}${releaseBlock}`);

fs.writeFileSync(file, xml);

console.log(`Appended Flatpak release ${version} (${today})`);
