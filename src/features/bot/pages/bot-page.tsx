import { useState, useRef } from "react";
import { runBot, type BotProgress, type BotConfig } from "../lib/bot-runner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Play, RotateCcw } from "lucide-react";

type RunState = "idle" | "running" | "done";

export function BotPage() {
  const [userCount, setUserCount] = useState(3);
  const [monthsBack, setMonthsBack] = useState(6);
  const [logs, setLogs] = useState<BotProgress[]>([]);
  const [runState, setRunState] = useState<RunState>("idle");
  const logsEndRef = useRef<HTMLDivElement>(null);

  function appendLog(p: BotProgress) {
    setLogs(prev => [...prev, p]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleRun() {
    setLogs([]);
    setRunState("running");

    const config: BotConfig = { userCount, monthsBack };
    await runBot(config, appendLog);

    setRunState("done");
  }

  function handleReset() {
    setLogs([]);
    setRunState("idle");
  }

  const isRunning = runState === "running";
  const isDone = runState === "done";

  return (
    <div className="min-h-screen bg-background flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-6">
        {/* header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Usage Bot</h1>
            <p className="text-sm text-muted-foreground">
              Generate synthetic users with randomized expense patterns
            </p>
          </div>
        </div>

        {/* config card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>
              Each user gets a random personality, currency, and spending pattern.
              All data is written directly to local IndexedDB.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userCount">Number of users</Label>
                <Input
                  id="userCount"
                  type="number"
                  min={1}
                  max={50}
                  value={userCount}
                  onChange={e => setUserCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground">1 – 50 users</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthsBack">Months of history</Label>
                <Input
                  id="monthsBack"
                  type="number"
                  min={1}
                  max={24}
                  value={monthsBack}
                  onChange={e => setMonthsBack(Math.max(1, Math.min(24, Number(e.target.value))))}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground">1 – 24 months back</p>
              </div>
            </div>

            {/* personality legend */}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Random personality pool
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["frugal", "average", "spender", "investor", "freelancer"].map(p => (
                  <Badge key={p} variant="secondary" className="text-xs font-normal">{p}</Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                onClick={handleRun}
                disabled={isRunning}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isRunning ? "Running…" : "Run Bot"}
              </Button>

              {(isDone || logs.length > 0) && (
                <Button variant="outline" onClick={handleReset} disabled={isRunning} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* log output */}
        {logs.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Output</span>
                {isRunning && (
                  <span className="text-xs font-normal text-muted-foreground animate-pulse">
                    Running…
                  </span>
                )}
                {isDone && (
                  <Badge variant="default" className="text-xs">Complete</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-md p-3 font-mono text-xs max-h-80 overflow-y-auto space-y-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={
                      log.type === "success" ? "text-green-600 dark:text-green-400" :
                      log.type === "error"   ? "text-red-600 dark:text-red-400" :
                      log.type === "done"    ? "text-primary font-semibold" :
                      "text-muted-foreground"
                    }
                  >
                    {log.type === "success" ? "✓ " : log.type === "error" ? "✗ " : log.type === "done" ? "★ " : "  "}
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
