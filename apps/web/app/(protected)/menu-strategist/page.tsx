"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { SidebarTriggerClient } from "@/components/sidebar-trigger-client";

type Recommendation = {
  recommendations: {
    promote: Array<{
      menuItem: string;
      reason: string;
      expectedImpact: "high" | "medium" | "low";
    }>;
    adjust: Array<{
      menuItem: string;
      issue: string;
      suggestion: string;
      expectedImpact: "high" | "medium" | "low";
    }>;
  };
};

export default function MenuStrategistPage() {
  const [analyticsList, setAnalyticsList] = useState<any[]>([]);
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  // Load analytics data on mount
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetch("/api/analytics");
        if (res.ok) {
          const data = await res.json();
          setAnalyticsList(data);
          if (data.length > 0) {
            setSelectedAnalyticsId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
      }
    };
    loadAnalytics();
  }, []);

  const handleAnalyze = async () => {
    if (!selectedAnalyticsId) {
      setError("Please select an analytics dataset");
      return;
    }

    setLoading(true);
    setError(null);
    setRecommendations(null);

    try {
      const res = await fetch("/api/menu-strategist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analyticsId: selectedAnalyticsId }),
      });

      if (!res.ok) throw new Error("Failed to generate recommendations");
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <SidebarTriggerClient
        title="Menu Promotion Strategist"
        breadcrumbs={[
          { label: "Agents", href: "/agents" },
          { label: "Menu Promotion Strategist" },
        ]}
      />
      <div className="space-y-6 p-8 max-w-6xl mx-auto flex-1">
        <div className="bg-white rounded-lg border shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Analyze Menu Data</h2>
            <p className="text-gray-600 text-sm mt-1">
              Select an analytics dataset to analyze
            </p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Analytics Dataset
              </label>
              <Select
                value={selectedAnalyticsId}
                onValueChange={setSelectedAnalyticsId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an analytics dataset..." />
                </SelectTrigger>
                <SelectContent>
                  {analyticsList.map((item: any) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.locationName || `Analytics ${item.id.slice(0, 8)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleAnalyze}
              disabled={loading || !selectedAnalyticsId}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Generate Recommendations
                </>
              )}
            </Button>
          </div>
        </div>

        {recommendations && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Items to Promote</h2>
                <p className="text-gray-600 text-sm mt-1">
                  High-value opportunities to highlight
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recommendations.recommendations.promote.map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{item.menuItem}</h3>
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${getImpactColor(
                            item.expectedImpact,
                          )}`}
                        >
                          {item.expectedImpact} impact
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border shadow">
              <div className="p-6 border-b">
                <h2 className="text-lg font-semibold">Items to Adjust</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Underperformers that need attention
                </p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {recommendations.recommendations.adjust.map((item, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold">{item.menuItem}</h3>
                        <span
                          className={`px-3 py-1 rounded text-xs font-medium ${getImpactColor(
                            item.expectedImpact,
                          )}`}
                        >
                          {item.expectedImpact} impact
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        <strong>Issue:</strong> {item.issue}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Suggestion:</strong> {item.suggestion}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
