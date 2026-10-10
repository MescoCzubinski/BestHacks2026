export type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
};

/** Mock account for the login screen. No real authentication yet. */
export const DEMO_USERS: DemoUser[] = [
  {
    id: "anna",
    name: "Anna Kowalska",
    email: "anna@atlas.pl",
    role: "Odkrywca",
    initials: "AK",
  },
];

export const DEMO_PASSWORD = "demo1234";
