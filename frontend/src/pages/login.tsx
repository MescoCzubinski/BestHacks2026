import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";
import { GridPanel } from "@/shared/grid-panel";
import { Logo } from "@/shared/logo";
import { Avatar } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
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
    <div className="grid min-h-screen lg:grid-cols-[3fr_2fr]">
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-col justify-between gap-10 px-4 py-3 outline-none lg:px-18 lg:py-10"
      >
        <div className="flex items-center justify-between pl-2 lg:pl-0">
          <Logo />
          <Button asChild variant="ghost" size="lg" className="h-11">
            <a href={href("landing")}>
              <ArrowLeft /> Wstecz
            </a>
          </Button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            window.location.hash = href("plan");
          }}
          className="mx-auto my-auto flex w-full max-w-110 flex-col gap-5"
        >
          <div className="grid gap-2">
            <h1 className="font-heading text-4xl leading-tight font-extrabold tracking-tight">
              Czas na{" "}
              <span className="rounded-md bg-brand box-decoration-clone px-2 text-brand-foreground">
                zwiedzanie
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Zaloguj się, aby zaplanować kolejną tematyczną podróż, albo użyj
              konta demo poniżej.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                placeholder="np. jan.nowak@poczta.pl"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setPicked("");
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw">Hasło</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="h-11 shadow-brand">
              Zaloguj się <ArrowRight />
            </Button>

            <Separator className="mt-1">Konto demo</Separator>

            <div role="group" aria-label="Konto demo" className="grid gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  aria-pressed={picked === u.id}
                  onClick={() => pick(u.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                    picked === u.id &&
                      "border-primary bg-muted ring-1 ring-primary",
                  )}
                >
                  <Avatar aria-hidden="true">{u.initials}</Avatar>
                  <span className="grid min-w-0 flex-1 leading-snug">
                    <span className="text-sm font-medium">{u.name}</span>
                    <span className="truncate text-sm text-muted-foreground">
                      {u.email}
                    </span>
                  </span>
                  <Badge variant="secondary">{u.role}</Badge>
                </button>
              ))}
            </div>
          </div>
        </form>
      </main>

      <GridPanel className="hidden lg:flex" />
    </div>
  );
}
