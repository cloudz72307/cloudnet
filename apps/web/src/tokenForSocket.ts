export function getTokenForSocket(): string | null {
  return localStorage.getItem("cloudnet_token");
}
