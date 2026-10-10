import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { GridPanel } from "@/shared/grid-panel";
import { Logo } from "@/shared/logo";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { DEMO_PASSWORD, DEMO_USERS } from "@/data/users";
import { href } from "@/shared/lib/route";
import { cn } from "@/shared/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState("");

  function pick(id: string) {
    const user = DEMO_USERS.find((u) => u.id === id);
    if (!user) return;
    setEmail(user.email);
    setPassword(DEMO_PASSWORD);
    setPicked(id);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[2fr_1fr]">
      <main className="flex flex-col justify-between gap-10 px-4 py-3 lg:px-18 lg:py-10">
        <div className="flex items-center justify-between pl-2 lg:pl-0">
          <Logo />
          <Button asChild variant="ghost" size="lg" className="h-11">
            <a href={href("landing")}>
              <ArrowLeft /> Wstecz
            </a>
          </Button>
        </div>

        <Card className="w-full max-w-110 gap-5 rounded-2xl">
          <CardHeader className="gap-2">
            <Badge variant="outline" className="mb-1">
              Użyj w przeglądarce
            </Badge>
            <CardTitle className="font-heading text-4xl leading-tight font-extrabold tracking-tight">
              Witaj ponownie
            </CardTitle>
            <CardDescription>
              Zaloguj się, aby zaplanować kolejną tematyczną podróż, albo
              wybierz użytkownika demo poniżej.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="ty@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPicked("");
                }}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="pw">Hasło</Label>
                <a
                  href="#forgot"
                  className="inline-flex min-h-6 items-center text-[13px] text-muted-foreground underline underline-offset-4"
                >
                  Nie pamiętasz hasła?
                </a>
              </div>
              <Input
                id="pw"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button asChild size="lg" className="h-11 shadow-brand">
              <a href={href("app")}>
                Zaloguj się <ArrowRight />
              </a>
            </Button>

            <Separator className="mt-1">Użytkownicy demo</Separator>

            <div className="grid gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={picked === u.id}
                  onClick={() => pick(u.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    picked === u.id &&
                      "border-primary bg-muted ring-1 ring-primary",
                  )}
                >
                  <Avatar>{u.initials}</Avatar>
                  <span className="grid min-w-0 flex-1 leading-snug">
                    <span className="text-sm font-medium">{u.name}</span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {u.email}
                    </span>
                  </span>
                  <Badge variant="secondary">{u.role}</Badge>
                </button>
              ))}
            </div>
          </CardContent>

          <CardFooter className="text-[13px] text-muted-foreground">
            Konta testowe · brak prawdziwych danych
          </CardFooter>
        </Card>

        <p className="px-2 text-[13px] text-muted-foreground lg:px-0">
          Dane mapy © współtwórcy OpenStreetMap
        </p>
      </main>

      <GridPanel className="hidden lg:flex" />
    </div>
  );
}
