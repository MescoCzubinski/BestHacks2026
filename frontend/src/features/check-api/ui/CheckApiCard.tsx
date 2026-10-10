import { Activity, RefreshCw } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { useApiStatus } from "../model/useApiStatus";

export function CheckApiCard() {
  const { status, check } = useApiStatus();

  return (
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
  );
}
