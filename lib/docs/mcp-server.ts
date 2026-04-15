import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export interface McpServerOptions {
  docsPath: string;
  kbPath: string;
}

export async function startMcpServer(opts: McpServerOptions) {
  const server = new Server(
    { name: "bridge-ds", version: "4.0.0" },
    { capabilities: { resources: {} } }
  );

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources: Array<{ uri: string; name: string; mimeType: string }> = [];
    const compsRoot = path.join(opts.docsPath, "components");
    try {
      for (const cat of await readdir(compsRoot)) {
        const catDir = path.join(compsRoot, cat);
        let files: string[] = [];
        try {
          files = await readdir(catDir);
        } catch {
          continue;
        }
        for (const f of files) {
          if (!f.endsWith(".md")) continue;
          const name = f.replace(/\.md$/, "");
          resources.push({
            uri: `ds://component/${name}`,
            name,
            mimeType: "text/markdown",
          });
        }
      }
    } catch {
      // components root missing — skip
    }

    const foundsRoot = path.join(opts.docsPath, "foundations");
    try {
      for (const f of await readdir(foundsRoot)) {
        if (!f.endsWith(".md")) continue;
        const name = f.replace(/\.md$/, "");
        resources.push({
          uri: `ds://foundation/${name}`,
          name,
          mimeType: "text/markdown",
        });
      }
    } catch {
      // foundations root missing — skip
    }

    try {
      await readFile("llms.txt");
      resources.push({
        uri: "ds://index",
        name: "llms.txt",
        mimeType: "text/plain",
      });
    } catch {
      // llms.txt missing — skip
    }

    return { resources };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const uri = req.params.uri;
    const m = uri.match(
      /^ds:\/\/(component|foundation|pattern|token|index)(?:\/(.+))?$/
    );
    if (!m) throw new Error(`Invalid URI: ${uri}`);
    const [, kind, name] = m;
    let filePath: string;
    if (kind === "index") {
      filePath = "llms.txt";
    } else if (kind === "foundation") {
      filePath = path.join(opts.docsPath, "foundations", `${name}.md`);
    } else if (kind === "component") {
      const compsRoot = path.join(opts.docsPath, "components");
      let found: string | null = null;
      try {
        for (const cat of await readdir(compsRoot)) {
          const p = path.join(compsRoot, cat, `${name}.md`);
          try {
            await readFile(p);
            found = p;
            break;
          } catch {
            // try next category
          }
        }
      } catch {
        // components root missing
      }
      if (!found) throw new Error(`Not found: ${uri}`);
      filePath = found;
    } else if (kind === "pattern") {
      filePath = path.join(opts.docsPath, "patterns", `${name}.md`);
    } else {
      throw new Error(`URI kind not yet implemented in V0.1: ${kind}`);
    }

    const content = await readFile(filePath, "utf8");
    return {
      contents: [{ uri, mimeType: "text/markdown", text: content }],
    };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
  return server;
}
