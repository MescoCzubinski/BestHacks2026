/**
 * The public demo account (password "demo1234", also offered by the login page).
 * Only the scrypt hash is kept here, never the password itself. DEMO_USER_PASSWORD, when set,
 * replaces it with a hash of the configured password.
 */
export const DEMO_USER = {
  email: "anna@atlas.pl",
  name: "Anna Kowalska",
  passwordHash:
    "scrypt:Mmtgrr41ZLIDp66ASpMcTw==:rogPNIF9xl4Vl3PS+8uyDCoPOwssGRLbK4PULOSlPpax712NSB8BlPOuJEYmqStbxnrFIl3Gvj0HB7A2cOHAvA==",
};
