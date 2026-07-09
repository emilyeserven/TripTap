import emilyConfig from "@emilyeserven/eslint-config";
import globals from "globals";

/**
 * Flat ESLint config for sentence-bank.
 *
 * Rules come from the shared `@emilyeserven/eslint-config` (the same config used by emstack).
 * Always run `pnpm lint:fix` from the repo root — running from a package produces import
 * ordering that CI rejects.
 */
export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/coverage/**",
      "**/*.gen.ts",
      "packages/client/src/routeTree.gen.ts",
      "packages/middleware/drizzle/**",
      ".claude/skills/fallow/**",
    ],
  },
  ...(Array.isArray(emilyConfig) ? emilyConfig : [emilyConfig]),
  {
    // Plain-Node JavaScript (gateway entrypoint + repo scripts) runs outside the TS pipeline.
    files: ["packages/gateway/**/*.js", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // The gateway and scripts are CLIs — console output is intentional.
      "no-console": "off",
    },
  },
  {
    // Node config files read `process.env` and use side-effect imports (e.g. dotenv).
    files: ["**/*.config.ts", "**/drizzle.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "import/no-unassigned-import": "off",
    },
  },
  {
    // TanStack Router file-based routes export a non-component `Route` object by design,
    // which the fast-refresh rule (dev-only HMR guidance) flags. Disable it for routes.
    files: ["packages/client/src/routes/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  {
    // Test setup registers jest-dom matchers via a side-effect import.
    files: ["packages/client/src/test-utils/**/*.ts"],
    rules: {
      "import/no-unassigned-import": "off",
    },
  },
  {
    // shadcn/ui primitives intentionally co-locate non-component exports (cva variant helpers,
    // the useSidebar hook) with their components, and the sidebar composes many primitives.
    files: ["packages/client/src/components/ui/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
      "import/max-dependencies": "off",
    },
  },
  {
    // The shared config's Tailwind entry point ("./src/index.css") is resolved from the repo
    // root, where lint runs, so it never resolves and custom @theme tokens (e.g. bg-sidebar)
    // are flagged as unknown. Point it at the client's actual CSS entry point.
    files: ["packages/client/src/**/*.{ts,tsx}"],
    settings: {
      "better-tailwindcss": {
        entryPoint: "packages/client/src/index.css",
      },
    },
  },
];
