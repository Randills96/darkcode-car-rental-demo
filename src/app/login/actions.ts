"use server";

import { getInactiveAccountLoginMessage } from "@/lib/services/user-subscription";

export async function getInactiveLoginHint(email: string) {
  try {
    return await getInactiveAccountLoginMessage(email);
  } catch (error) {
    console.error("getInactiveLoginHint:", error);
    return null;
  }
}
