import { cn } from "@/lib/utils";
import { COMPANY_LOGO_SRC, COMPANY_NAME, COMPANY_SHORT_TAGLINE } from "@/lib/branding";

interface BrandLogoProps {
  size?: number;
  className?: string;
  alt?: string;
  priority?: boolean;
}

export function BrandLogo({
  size = 40,
  className,
  alt = COMPANY_NAME,
  priority = false,
}: BrandLogoProps) {
  return (
    // Static /public WebP — skip the image optimizer so login does not wait on a serverless resize.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={COMPANY_LOGO_SRC}
      alt={alt}
      width={size}
      height={size}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={cn("shrink-0 rounded-md object-cover", className)}
    />
  );
}

interface BrandLockupProps {
  collapsed?: boolean;
  companyName?: string;
  tagline?: string;
  className?: string;
}

export function BrandLockup({
  collapsed = false,
  companyName = COMPANY_NAME,
  tagline = COMPANY_SHORT_TAGLINE,
  className,
}: BrandLockupProps) {
  if (collapsed) {
    return <BrandLogo size={32} className="rounded-md" alt={companyName} />;
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandLogo size={36} className="rounded-md" alt={companyName} />
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-tight text-primary">{companyName}</p>
        <p className="truncate text-[11px] text-muted-foreground">{tagline}</p>
      </div>
    </div>
  );
}
