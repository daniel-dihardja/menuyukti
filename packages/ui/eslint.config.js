import { config } from "@workspace/eslint-config/react-internal"
import jsxA11y from "eslint-plugin-jsx-a11y"

/** @type {import("eslint").Linter.Config} */
export default [
  ...config,
  {
    files: [
      "src/components/ai-elements/code-block.tsx",
      "src/components/ai-elements/commit.tsx",
      "src/components/ai-elements/conversation.tsx",
      "src/components/ai-elements/environment-variables.tsx",
      "src/components/ai-elements/stack-trace.tsx",
      "src/components/ai-elements/terminal.tsx",
      "src/components/button.tsx",
      "src/components/switch.tsx",
      "src/components/accordion.tsx",
      "src/components/sidebar.tsx",
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
]
