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
import { AuthError, login, register } from "@/features/auth";
import { setSession } from "@/shared/auth";
import { href } from "@/shared/lib/route";
import { cn } from "@/shared/lib/utils";

const DEMO_ACCOUNT = {
  name: "Anna Kowalska",
  email: "anna@atlas.pl",
  password: "demo1234",
  initials: "AK",
  role: "Konto demo",
};

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [picked, setPicked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  function pickDemo() {
    setMode("login");
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    setPicked(true);
  }

  async function submit() {
    setPending(true);
    setError("");
    try {
      const session =
        mode === "login"
          ? await login(email.trim(), password)
          : await register(name.trim(), email.trim(), password);
      setSession(session);
      window.location.hash = href("plan");
    } catch (e) {
      setError(e instanceof AuthError ? e.message : "Nie udało się zalogować.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid h-dvh overflow-hidden lg:h-auto lg:min-h-screen lg:grid-cols-[3fr_2fr] lg:overflow-visible">
      <main
        id="main"
        tabIndex={-1}
        className="flex flex-col justify-between gap-10 bg-grid px-4 py-3 outline-none lg:bg-background lg:bg-none lg:px-18 lg:py-10"
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
            void submit();
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
              {mode === "login"
                ? "Zaloguj się, aby zaplanować kolejną tematyczną podróż, albo użyj konta demo poniżej."
                : "Utwórz konto, aby planować trasy i wracać do poprzednich."}
            </p>
          </div>

          <div className="grid gap-4">
            {mode === "register" && (
              <div className="grid gap-2">
                <Label htmlFor="name">Imię</Label>
                <Input
                  id="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="np. Jan Nowak"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}
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
                  setPicked(false);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pw">Hasło</Label>
              <Input
                id="pw"
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "register" ? 8 : undefined}
                maxLength={128}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="h-11 shadow-brand"
              disabled={pending}
            >
              {mode === "login" ? "Zaloguj się" : "Utwórz konto"} <ArrowRight />
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login"
                ? "Nie masz konta? Utwórz je"
                : "Masz już konto? Zaloguj się"}
            </Button>

            <Separator className="mt-1">Konto demo</Separator>

            <button
              type="button"
              aria-pressed={picked}
              onClick={pickDemo}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left outline-none focus-visible:ring-[3px] focus-visible:ring-ring",
                picked && "border-primary bg-muted ring-1 ring-primary",
              )}
            >
              <Avatar aria-hidden="true">{DEMO_ACCOUNT.initials}</Avatar>
              <span className="grid min-w-0 flex-1 leading-snug">
                <span className="text-sm font-medium">{DEMO_ACCOUNT.name}</span>
                <span className="truncate text-sm text-muted-foreground">
                  {DEMO_ACCOUNT.email}
                </span>
              </span>
              <Badge variant="secondary">{DEMO_ACCOUNT.role}</Badge>
            </button>
          </div>
        </form>
      </main>

      <GridPanel className="hidden lg:flex" />
    </div>
  );
}
