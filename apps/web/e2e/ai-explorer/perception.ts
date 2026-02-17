import type { Page } from "playwright";
import type { PlannerContext } from "./planner-contracts";
import type { RuntimeSignal } from "./adapter";

export async function buildPerceptionPayload(params: {
  page: Page;
  runtimeSignals: RuntimeSignal;
  screenshotPath: string | null;
  maxInteractiveElements?: number;
  maxFormControls?: number;
}): Promise<PlannerContext> {
  const maxInteractiveElements = params.maxInteractiveElements ?? 80;
  const maxFormControls = params.maxFormControls ?? 40;

  const pageData = await params.page.evaluate(
    ({ maxInteractiveElements, maxFormControls }) => {
      const visible = (el: Element): boolean => {
        const style = window.getComputedStyle(el as HTMLElement);
        const rect = (el as HTMLElement).getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const getSelectorHint = (el: Element): string => {
        const id = (el as HTMLElement).id;
        if (id) return `#${id}`;
        const name = (el as HTMLElement).getAttribute("name");
        if (name) return `[name="${name}"]`;
        const testId = (el as HTMLElement).getAttribute("data-testid");
        if (testId) return `[data-testid="${testId}"]`;
        const role = (el as HTMLElement).getAttribute("role");
        if (role) return `[role="${role}"]`;
        return el.tagName.toLowerCase();
      };

      const interactiveCandidates = Array.from(
        document.querySelectorAll(
          'button, a, [role="button"], [role="link"], input, select, textarea, summary',
        ),
      );

      const interactiveElements = interactiveCandidates
        .filter((el) => visible(el))
        .slice(0, maxInteractiveElements)
        .map((el) => {
          const tag = el.tagName.toLowerCase();
          const role = (el as HTMLElement).getAttribute("role") ?? tag;
          const label =
            (el as HTMLElement).getAttribute("aria-label")?.trim() ||
            (el as HTMLElement).textContent?.trim() ||
            (el as HTMLElement).getAttribute("name") ||
            tag;
          const enabled = !(el as HTMLInputElement | HTMLButtonElement).disabled;
          return {
            role,
            label: label?.slice(0, 120) ?? tag,
            selectorHint: getSelectorHint(el),
            visible: true,
            enabled,
          };
        });

      const formCandidates = Array.from(
        document.querySelectorAll("input, select, textarea"),
      );

      const formControls = formCandidates
        .filter((el) => visible(el))
        .slice(0, maxFormControls)
        .map((el) => {
          const htmlEl = el as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
          return {
            name: htmlEl.name || htmlEl.id || htmlEl.tagName.toLowerCase(),
            selectorHint: getSelectorHint(el),
            type: htmlEl instanceof HTMLInputElement ? htmlEl.type : htmlEl.tagName.toLowerCase(),
            valuePreview: (htmlEl.value || "").slice(0, 120) || null,
            required: Boolean(htmlEl.required),
          };
        });

      return {
        title: document.title || "",
        interactiveElements,
        formControls,
      };
    },
    { maxInteractiveElements, maxFormControls },
  );

  return {
    url: params.page.url(),
    title: pageData.title,
    screenshotPath: params.screenshotPath,
    interactiveElements: pageData.interactiveElements,
    formControls: pageData.formControls,
    runtimeSignals: {
      consoleErrors: params.runtimeSignals.consoleErrors.slice(-50),
      networkErrors: params.runtimeSignals.networkErrors.slice(-50),
    },
  };
}
