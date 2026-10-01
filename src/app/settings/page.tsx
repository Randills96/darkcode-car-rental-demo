import { DashboardShell } from "@/components/layout/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { requirePermission } from "@/lib/auth/session";
import { canManageAnnualAccountFee, hasPermission } from "@/lib/permissions";
import { hideAnnualFeeSettings } from "@/lib/services/settings";
import { getCachedSystemSettings } from "@/lib/cache/settings";

export default async function SettingsPage() {
  const session = await requirePermission("settings.view");
  const canEditSystem = hasPermission(session.user.role, "settings.edit");
  const canManageAnnualFee = canManageAnnualAccountFee(session.user.role);
  const settings = canEditSystem ? await getCachedSystemSettings() : null;
  const settingsForForm =
    settings && !canManageAnnualFee ? hideAnnualFeeSettings(settings) : settings;

  return (
    <DashboardShell title="Settings">
      <PageHeader
        title="Settings"
        description={
          canEditSystem
            ? "Change your password and configure rental rules, commissions, and business defaults"
            : "Change the password you use to sign in"
        }
      />
      <div className="space-y-6">
        <ChangePasswordForm accountName={session.user.name} />
        {settingsForForm ? (
          <SettingsForm
            defaultValues={settingsForForm}
            canEdit={canEditSystem}
            canManageAnnualFee={canManageAnnualFee}
          />
        ) : null}
      </div>
    </DashboardShell>
  );
}
