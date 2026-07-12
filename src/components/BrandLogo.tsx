import logoAsset from "@/assets/fiksu_logo.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={logoAsset.url}
        alt="Fiksu Tiliratkaisut Oy"
        width={size}
        height={size}
        className="h-auto shrink-0 object-contain"
        style={{ width: size }}
      />
      {showWordmark && (
        <span className="font-display text-lg font-bold tracking-tight text-foreground">
          Fiksu
        </span>
      )}
    </span>
  );
}