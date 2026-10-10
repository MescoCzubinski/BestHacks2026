import { Activity, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { API_URL } from "@/lib/api";

type Status = "checking" | "up" | "down";

export default function App() {
  const [status, setStatus] = useState<Status>("checking");

  function check() {
    setStatus("checking");
    fetch(`${API_URL}/health`)
      .then((res) => setStatus(res.ok ? "up" : "down"))
      .catch(() => setStatus("down"));
  }

  useEffect(check, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>BestHacks 2026</CardTitle>
            <Badge variant={status === "up" ? "default" : "secondary"}>
              <Activity className="mr-1 size-3" />
              API {status}
            </Badge>
          </div>
          <CardDescription>
            Vite, React, shadcn/ui and Tailwind, talking to NestJS.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={check}
            disabled={status === "checking"}
          >
            <RefreshCw /> Check API
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
