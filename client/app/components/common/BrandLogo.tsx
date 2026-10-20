import type { ComponentPropsWithoutRef } from "react";
import { resolveIconPath } from "~/lib/iconUtils";

/**
 * The single source of truth for the product logo.
 * Change this path (or replace the public asset) to update every brand mark.
 */
export const BRAND_LOGO_PATH = "logo.png";

type BrandLogoProps = Omit<ComponentPropsWithoutRef<"img">, "src">;

export function BrandLogo({ alt = "", ...props }: BrandLogoProps) {
  return <img src={resolveIconPath(BRAND_LOGO_PATH)} alt={alt} {...props} />;
}
