export function getTokenColors() {
  if (typeof window === "undefined") {
    return {
      primary: "#7546ed",
      primaryMuted: "#7546ed33",
      secondary: "#032c7d",
      accent: "#dc89ff",
      muted: "#b1a9e5",
      foreground: "#12173b",
      mutedForeground: "#6b7280",
      border: "#b1a9e5",
      card: "#ffffff",
      success: "#10b981",
      warning: "#f59e0b",
      danger: "#ef4444",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  const hsl = (name: string, fallback: string) => {
    const raw = styles.getPropertyValue(name).trim();
    if (!raw) return fallback;
    return `hsl(${raw})`;
  };
  return {
    primary: hsl("--primary", "#7546ed"),
    primaryMuted: hsl("--primary", "#7546ed") + "33",
    secondary: hsl("--sidebar-accent", "#032c7d"),
    secondaryMuted: hsl("--sidebar-accent", "#032c7d") + "33",
    accent: hsl("--accent", "#dc89ff"),
    muted: hsl("--border", "#b1a9e5"),
    foreground: hsl("--foreground", "#12173b"),
    mutedForeground: hsl("--muted-foreground", "#6b7280"),
    border: hsl("--border", "#b1a9e5"),
    card: hsl("--card", "#ffffff"),
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
  };
}

export type ChartColors = ReturnType<typeof getTokenColors>;
