import { readFileSync, writeFileSync } from "fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const targetVersion = process.env.VERSION ?? process.env.npm_package_version ?? packageJson.version;

if (!targetVersion) {
	throw new Error("Unable to determine target version. Set VERSION or run via npm version.");
}

// read minAppVersion from manifest.json and bump version to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// update versions.json with target version and minAppVersion from manifest.json
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
