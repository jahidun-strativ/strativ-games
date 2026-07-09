import { notFound } from "next/navigation";
import { accountViewPaths } from "@neondatabase/auth-ui/server";
import { AccountView } from "@/components/account-view";
import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Account" };

// Any real account sub-view is allowed so AccountView's own nav never 404s;
// only genuinely unknown paths fall through to notFound().
const ALLOWED = new Set<string>(Object.values(accountViewPaths));

export default async function AccountPage({
  params,
}: PageProps<"/account/[path]">) {
  const { path } = await params;
  if (!ALLOWED.has(path)) notFound();

  return (
    <div>
      <PageHeader kicker="Your account" title="Account settings" />
      <div className="tv-card p-4 sm:p-6">
        <AccountView path={path} />
      </div>
    </div>
  );
}
