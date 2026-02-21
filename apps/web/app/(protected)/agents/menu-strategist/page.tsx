"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  AlertTriangle,
  Copy,
  CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type RecommendationType = {
  menuItem: string;
  reason: string;
  marketingAngle: string;
  expectedImpact: "high" | "medium" | "low";
  confidence: number;
};

type AdjustmentType = {
  menuItem: string;
  issue: string;
  suggestion: "pricing" | "bundling" | "promotion" | "remove";
  reason: string;
  expectedImpact: "high" | "medium" | "low";
};

type AgentResponse = {
  recommendations: {
    promote: RecommendationType[];
    adjust: AdjustmentType[];
  };
  context: {
    analyticsId: number;
    locationId: number;
    locationName: string;
    period: { start: string; end: string };
    totalItems: number;
    dataQuality: string;
  };
  metadata: {
    model: string;
    generatedAt: string;
    processingTimeMs: number;
  };
};

type Location = {
  id: number;
  name: string;
};

type Analytics = {
  id: number;
  sourceFile: string;
  uploadedAt: string;
};

export default function MenuStrategistPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [locations, setLocations] = useState<Location[]>([]);
  const [analytics, setAnalytics] = useState<Analytics[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<string>("");
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AgentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load locations on mount
  useState(() => {
    loadLocations();
  });

  async function loadLocations() {
    setIsLoadingLocations(true);
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to load locations");
      const data = await res.json();
      setLocations(data.locations || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load locations",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLocations(false);
    }
  }

  async function loadAnalytics(locationId: string) {
    if (!locationId) return;

    setIsLoadingAnalytics(true);
    setSelectedAnalyticsId("");
    setAnalytics([]);
    try {
      const res = await fetch(`/api/analytics/list?locationId=${locationId}`);
      if (!res.ok) throw new Error("Failed to load analytics");
      const data = await res.json();
      setAnalytics(data.analytics || []);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to load analytics snapshots",
        variant: "destructive",
      });
    } finally {
      setIsLoadingAnalytics(false);
    }
  }

  async function analyzeMenu() {
    if (!selectedAnalyticsId) {
      toast({
        title: "Missing Selection",
        description: "Please select both location and analytics snapshot",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(
        `/api/agents/menu-strategist?analyticsId=${selectedAnalyticsId}`,
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Analysis failed");
      }

      const data: AgentResponse = await res.json();
      setResult(data);
      toast({
        title: "Analysis Complete",
        description: `Generated ${data.recommendations.promote.length} promotion recommendations`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      toast({
        title: "Analysis Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleLocationChange(value: string) {
    setSelectedLocationId(value);
    setSelectedAnalyticsId("");
    setResult(null);
    setError(null);
    loadAnalytics(value);
  }

  function handleAnalyticsChange(value: string) {
    setSelectedAnalyticsId(value);
    setResult(null);
    setError(null);
  }

  async function copyToClipboard(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Copied!",
        description: "Marketing angle copied to clipboard",
      });
    } catch {
      toast({
        title: "Copy Failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      });
    }
  }

  function getImpactColor(impact: "high" | "medium" | "low") {
    switch (impact) {
      case "high":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "low":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  }

  function getSuggestionColor(suggestion: string) {
    switch (suggestion) {
      case "pricing":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "bundling":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "promotion":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "remove":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Menu Promotion Strategist</h1>
        <p className="text-muted-foreground">
          AI-powered analysis of your menu to identify what to promote and what
          needs attention
        </p>
      </div>

      {/* Selection Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Select Data to Analyze</CardTitle>
          <CardDescription>
            Choose a location and analytics snapshot to get recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={selectedLocationId}
                onValueChange={handleLocationChange}
                disabled={isLoadingLocations}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location..." />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Analytics Snapshot</label>
              <Select
                value={selectedAnalyticsId}
                onValueChange={handleAnalyticsChange}
                disabled={!selectedLocationId || isLoadingAnalytics}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select analytics..." />
                </SelectTrigger>
                <SelectContent>
                  {analytics.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.sourceFile} (
                      {new Date(item.uploadedAt).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={analyzeMenu}
            disabled={!selectedAnalyticsId || isAnalyzing}
            className="w-full md:w-auto"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Menu...
              </>
            ) : (
              "Analyze Menu"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="mb-8 border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">
              Analysis Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results Display */}
      {result && (
        <div className="space-y-8">
          {/* Context Info */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Context</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{result.context.locationName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Period</p>
                <p className="font-medium">
                  {new Date(result.context.period.start).toLocaleDateString()} -{" "}
                  {new Date(result.context.period.end).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Items Analyzed</p>
                <p className="font-medium">{result.context.totalItems}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Processing Time</p>
                <p className="font-medium">
                  {(result.metadata.processingTimeMs / 1000).toFixed(1)}s
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Promote Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <h2 className="text-2xl font-bold">Items to Promote</h2>
              <Badge variant="secondary">
                {result.recommendations.promote.length}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.recommendations.promote.map((item, index) => (
                <Card key={index} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{item.menuItem}</CardTitle>
                      <Badge className={getImpactColor(item.expectedImpact)}>
                        {item.expectedImpact} impact
                      </Badge>
                    </div>
                    <CardDescription>{item.reason}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm font-medium mb-1">
                        Marketing Angle:
                      </p>
                      <p className="text-sm bg-muted p-3 rounded-md italic">
                        "{item.marketingAngle}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Confidence: {(item.confidence * 100).toFixed(0)}%
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(item.marketingAngle, index)
                        }
                      >
                        {copiedIndex === index ? (
                          <CheckCheck className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Adjust Section */}
          {result.recommendations.adjust.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <h2 className="text-2xl font-bold">Items Needing Attention</h2>
                <Badge variant="secondary">
                  {result.recommendations.adjust.length}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {result.recommendations.adjust.map((item, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {item.menuItem}
                        </CardTitle>
                        <Badge className={getImpactColor(item.expectedImpact)}>
                          {item.expectedImpact} impact
                        </Badge>
                      </div>
                      <CardDescription>{item.issue}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge className={getSuggestionColor(item.suggestion)}>
                          {item.suggestion}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.reason}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
