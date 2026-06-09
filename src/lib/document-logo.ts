// Shape of the `templates.logo` JSONB column. Document-level "behind the
// text" logo. The image is stored inline as a base64 dataURL so the PDF can
// paint it directly without any storage bucket call.

export type LogoPosition = "left" | "right";

export interface TemplateLogo {
  dataUrl: string | null;
  position: LogoPosition;
  size: number; // width in px on the page (height auto)
}

export const DEFAULT_LOGO: TemplateLogo = {
  dataUrl: null,
  position: "right",
  size: 96,
};

export const LOGO_SIZE_MIN = 40;
export const LOGO_SIZE_MAX = 240;

// Three friendly presets that the UI exposes next to the slider.
export const LOGO_PRESETS: { label: string; size: number }[] = [
  { label: "Small", size: 64 },
  { label: "Medium", size: 96 },
  { label: "Large", size: 140 },
];

export function normalizeLogo(value: unknown): TemplateLogo {
  if (!value || typeof value !== "object") return { ...DEFAULT_LOGO };
  const v = value as Partial<TemplateLogo>;
  return {
    dataUrl: typeof v.dataUrl === "string" ? v.dataUrl : null,
    position: v.position === "left" ? "left" : "right",
    size:
      typeof v.size === "number" && v.size >= LOGO_SIZE_MIN && v.size <= LOGO_SIZE_MAX
        ? Math.round(v.size)
        : DEFAULT_LOGO.size,
  };
}

export function hasLogo(logo: TemplateLogo | null | undefined): boolean {
  return Boolean(logo && logo.dataUrl);
}
