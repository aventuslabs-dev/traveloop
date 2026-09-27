import { getSupabase } from "@/lib/supabase";
import { countRecentFailedPayments } from "@/lib/payment-attempts-db";
import { listCustomerAccounts } from "@/lib/customer-accounts-db";
import { logout } from "../actions";
import AdminShell from "./AdminShell";

/**
 * Counts shown in the rail. They give the operator a reason to trust the nav —
 * "3 bookings" beside Bookings means three things actually need looking at —
 * which only holds if a badge counts exactly what its page lists.
 */
async function loadCounts() {
  try {
    const db = getSupabase();
    const [orders, passesAwaiting, bookings, customers, failedPayments] = await Promise.all([
      db.from("orders").select("*", { count: "exact", head: true }),
      db
        .from("pass_registrations")
        .select("*", { count: "exact", head: true })
        .is("collected_at", null),
      db
        .from("experience_bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      // Deliberately not a head count of customer_profiles, which this used to
      // be and which counted the wrong thing twice over: it included the
      // operator's own admin account (the customers page excludes it, so the
      // rail said "1" over an empty table), and it counted profiles rather than
      // accounts, hiding any customer whose profile write failed — something
      // fulfilment treats as non-fatal and therefore does happen.
      //
      // Costs a paged listUsers instead of a head count. This console is
      // low-traffic and the customers page already does exactly this work, so
      // sharing one definition is worth more than the saved round trip.
      listCustomerAccounts(),
      countRecentFailedPayments(),
    ]);

    return {
      orders: orders.count ?? 0,
      passesAwaitingCollection: passesAwaiting.count ?? 0,
      bookings: bookings.count ?? 0,
      customers: customers.length,
      failedPayments,
    };
  } catch {
    // The chrome must render even if a count query fails; the pages themselves
    // surface real errors.
    return { orders: 0, bookings: 0, customers: 0, failedPayments: 0, passesAwaitingCollection: 0 };
  }
}

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const counts = await loadCounts();

  return (
    <AdminShell
      adminEmail={process.env.ADMIN_LOGIN_EMAIL ?? "admin"}
      counts={counts}
      signOut={
        <form action={logout}>
          <button className="admin-rail-signout" type="submit">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AdminShell>
  );
}
