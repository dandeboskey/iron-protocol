/**
 * Generate `docs/openapi.json` from the api-contract endpoint registry.
 *
 * Single-source-of-truth: every entry in `endpoints` becomes one OpenAPI
 * Path-Item / Operation pair. Request bodies and responses are converted
 * from Zod schemas via `zod-to-json-schema` (zero runtime deps).
 *
 * This is a documentation export, not a codegen step. The web/mobile/watch
 * apps still consume the Zod schemas directly via `@iron-protocol/api-contract`
 * — the OpenAPI file exists for external tools (Postman, Swagger UI, future
 * third-party API consumers, mobile QA dashboards).
 *
 * Run: `npm run docs:openapi`
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ZodSchema } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { endpoints } from "../packages/api-contract/src/endpoints";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface OpenApiOperation {
  operationId: string;
  summary?: string;
  parameters?: Array<{
    name: string;
    in: "path";
    required: true;
    schema: { type: "string" };
  }>;
  requestBody?: {
    required: true;
    content: { "application/json": { schema: unknown } };
  };
  responses: {
    [code: string]: {
      description: string;
      content?: { "application/json": { schema: unknown } };
    };
  };
}

type OpenApiPathItem = Partial<Record<"get" | "post" | "put" | "patch" | "delete", OpenApiOperation>>;

/**
 * Convert a path template like `/api/records/:id` to OpenAPI's `{id}` form
 * and collect the param names so we can emit `parameters` entries.
 */
function templateToOpenApiPath(template: string): { path: string; params: string[] } {
  const params: string[] = [];
  const path = template.replace(/:([a-zA-Z]+)/g, (_, name) => {
    params.push(name);
    return `{${name}}`;
  });
  return { path, params };
}

function jsonSchema(schema: ZodSchema | null) {
  if (!schema) return null;
  // `target: "openApi3"` strips `$schema`, `$ref` style draft-4 wrappers,
  // and resolves nullable using `nullable: true` instead of `oneOf`.
  return zodToJsonSchema(schema, { target: "openApi3", $refStrategy: "none" });
}

function buildSpec() {
  const paths: Record<string, OpenApiPathItem> = {};

  for (const [name, ep] of Object.entries(endpoints)) {
    const { path, params } = templateToOpenApiPath(ep.path);
    if (!paths[path]) paths[path] = {};

    const operation: OpenApiOperation = {
      operationId: name,
      summary: `${ep.method} ${ep.path}`,
      responses: {
        "200": {
          description: "Success",
          content: { "application/json": { schema: jsonSchema(ep.response) } },
        },
        "401": { description: "Unauthenticated" },
        "404": { description: "Not found" },
      },
    };

    if (params.length > 0) {
      operation.parameters = params.map((name) => ({
        name,
        in: "path",
        required: true,
        schema: { type: "string" },
      }));
    }

    if (ep.request) {
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: jsonSchema(ep.request) } },
      };
    }

    const method = ep.method.toLowerCase() as keyof OpenApiPathItem;
    paths[path][method] = operation;
  }

  return {
    openapi: "3.0.3",
    info: {
      title: "Iron Protocol API",
      version: "0.1.0",
      description:
        "Generated from `packages/api-contract/src/endpoints.ts`. Do not " +
        "edit by hand — run `npm run docs:openapi` to regenerate.",
    },
    paths,
  };
}

function main() {
  const spec = buildSpec();
  const outPath = resolve(__dirname, "..", "docs", "openapi.json");
  writeFileSync(outPath, JSON.stringify(spec, null, 2) + "\n", "utf8");
  // eslint-disable-next-line no-console
  console.log(`wrote ${outPath} — ${Object.keys(spec.paths).length} paths`);
}

main();
