// use-delete-analytics.ts
"use client";

type UseDeleteAnalyticsArgs = {
  branchId: number | null;
  onSuccess: () => void;
};

export function useDeleteAnalytics({
  branchId,
  onSuccess,
}: UseDeleteAnalyticsArgs) {
  async function deleteAnalytics(analyticsId: number) {
    if (!branchId) return;

    const confirmed = confirm(
      "Are you sure you want to delete this analytics?",
    );
    if (!confirmed) return;

    try {
      const res = await fetch("/api/analytics/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analyticsId,
          branchId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete analytics");
      }

      onSuccess();
    } catch (err) {
      console.error("Delete analytics failed:", err);
      alert("Failed to delete analytics.");
    }
  }

  return {
    deleteAnalytics,
  };
}
