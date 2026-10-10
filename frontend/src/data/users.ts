export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
};

/** Mock accounts for the login screen. No real authentication yet. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "anna",
    name: "Anna Kowalska",
    email: "anna@atlas.pl",
    role: "Odkrywca",
    initials: "AK",
  },
  {
    id: "piotr",
    name: "Piotr Nowak",
    email: "piotr@atlas.pl",
    role: "Lokalny przewodnik",
    initials: "PN",
  },
  {
    id: "guest",
    name: "Gość",
    email: "guest@atlas.pl",
    role: "Gość",
    initials: "G",
  },
];

export const DEMO_PASSWORD = "demo1234";
