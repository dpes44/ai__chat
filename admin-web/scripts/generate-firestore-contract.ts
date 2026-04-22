import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type FirestoreContract = {
  schemaVersion: number;
  collections: Record<string, string>;
  subcollections: Record<string, string>;
  docs: Record<string, string>;
  bootstrap: {
    requiredCollections: string[];
    requiredDocs: string[];
  };
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");
const contractPath = path.join(repoRoot, "contracts", "firestore-structure.json");
const adminOutputPath = path.join(
  repoRoot,
  "admin-web",
  "lib",
  "generated",
  "firestore-contract.ts",
);
const dartOutputPath = path.join(
  repoRoot,
  "lib",
  "src",
  "core",
  "generated",
  "firestore_contract.dart",
);

function toTsRecord(name: string, input: Record<string, string>): string {
  const rows = Object.entries(input).map(([key, value]) => `  ${key}: "${value}",`);
  return `export const ${name} = {\n${rows.join("\n")}\n} as const;\n`;
}

function toTsArray(name: string, input: string[]): string {
  const rows = input.map((value) => `  "${value}",`);
  return `export const ${name} = [\n${rows.join("\n")}\n] as const;\n`;
}

function toDartClass(name: string, input: Record<string, string>): string {
  const rows = Object.entries(input).map(
    ([key, value]) => `  static const String ${key} = '${value}';`,
  );
  return `class ${name} {\n${rows.join("\n")}\n}\n`;
}

function toDartList(name: string, values: string[]): string {
  const rows = values.map((value) => `    '${value}',`);
  return `  static const List<String> ${name} = <String>[\n${rows.join("\n")}\n  ];\n`;
}

async function writeOutput(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function parseContract(raw: string): FirestoreContract {
  const parsed = JSON.parse(raw) as Partial<FirestoreContract>;
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid Firestore contract: expected object.");
  }
  if (!parsed.collections || !parsed.subcollections || !parsed.docs || !parsed.bootstrap) {
    throw new Error(
      "Invalid Firestore contract: missing collections/subcollections/docs/bootstrap.",
    );
  }
  if (!Array.isArray(parsed.bootstrap.requiredCollections)) {
    throw new Error("Invalid Firestore contract: bootstrap.requiredCollections must be an array.");
  }
  if (!Array.isArray(parsed.bootstrap.requiredDocs)) {
    throw new Error("Invalid Firestore contract: bootstrap.requiredDocs must be an array.");
  }

  return {
    schemaVersion:
      typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 1,
    collections: parsed.collections,
    subcollections: parsed.subcollections,
    docs: parsed.docs,
    bootstrap: {
      requiredCollections: parsed.bootstrap.requiredCollections,
      requiredDocs: parsed.bootstrap.requiredDocs,
    },
  };
}

function buildTs(contract: FirestoreContract): string {
  return `/* eslint-disable */
// GENERATED FILE. DO NOT EDIT.
// Source: contracts/firestore-structure.json

export const FIRESTORE_CONTRACT_SCHEMA_VERSION = ${contract.schemaVersion} as const;

${toTsRecord("FIRESTORE_COLLECTIONS", contract.collections)}
${toTsRecord("FIRESTORE_SUBCOLLECTIONS", contract.subcollections)}
${toTsRecord("FIRESTORE_DOCS", contract.docs)}
${toTsArray("FIRESTORE_REQUIRED_COLLECTIONS", contract.bootstrap.requiredCollections)}
${toTsArray("FIRESTORE_REQUIRED_DOCS", contract.bootstrap.requiredDocs)}
`;
}

function buildDart(contract: FirestoreContract): string {
  return `// GENERATED FILE. DO NOT EDIT.
// Source: contracts/firestore-structure.json

${toDartClass("FirestoreCollections", contract.collections)}

${toDartClass("FirestoreSubcollections", contract.subcollections)}

${toDartClass("FirestoreDocs", contract.docs)}

class FirestoreBootstrap {
${toDartList("requiredCollections", contract.bootstrap.requiredCollections)}
${toDartList("requiredDocs", contract.bootstrap.requiredDocs)}
}
`;
}

async function main() {
  const raw = await readFile(contractPath, "utf8");
  const contract = parseContract(raw);

  await writeOutput(adminOutputPath, buildTs(contract));
  await writeOutput(dartOutputPath, buildDart(contract));

  console.log(
    JSON.stringify(
      {
        script: "generate-firestore-contract",
        ok: true,
        contractPath: path.relative(repoRoot, contractPath),
        outputs: [
          path.relative(repoRoot, adminOutputPath),
          path.relative(repoRoot, dartOutputPath),
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
