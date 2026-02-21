"use client";

import { useState, useEffect } from "react";
import { Loader2, TrendingUp } from "lucide-react";

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
    <div className="space-y-6 p-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Menu Promotion Strategist</h1>
        <p className="text-gray-600 mt-2">
          Analyze menu performance and get AI-powered recommendations
        </p>
      </div>

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
            <select
              value={selectedAnalyticsId}
              onChange={(e) => setSelectedAnalyticsId(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select an analytics dataset...</option>
              {analyticsList.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.locationName || `Analytics ${item.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={loading || !selectedAnalyticsId}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4" />
                Generate Recommendations
              </>
            )}
          </button>
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
  );
}
