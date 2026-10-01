import { unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { getSystemSettings } from "@/lib/services/settings";

export const getCachedSystemSettings = unstable_cache(getSystemSettings, ["system-settings"], {
  revalidate: 120,
  tags: [CACHE_TAGS.settings],
});
