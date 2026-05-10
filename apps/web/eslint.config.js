import { nextJsConfig } from "@workspace/eslint-config/next-js"
import jsxA11y from "eslint-plugin-jsx-a11y"

/** @type {import("eslint").Linter.Config} */
export default [
  ...nextJsConfig,
  {
    files: [
      "app/(protected)/analytics/sales/sales-table.tsx",
      "app/(protected)/canvas/assets-client.tsx",
      "app/(protected)/canvas/_components/assets-upload-zone.tsx",
      "app/(protected)/canvas/_components/assets-image-grid.tsx",
      "app/(protected)/workflow/_components/workflows-table.tsx",
      "components/sortable-table.tsx",
      "components/clerk/custom-login-form.tsx",
    ],
    plugins: {
      "jsx-a11y": jsxA11y,
    },
    rules: {
      "jsx-a11y/control-has-associated-label": "error",
      "jsx-a11y/no-static-element-interactions": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/transition-all/]",
          message: "Use property-scoped Tailwind transitions instead of transition-all.",
        },
      ],
    },
  },
  { ignores: [".next/**", "node_modules/**"] },
]
