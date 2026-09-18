import { getSupabase } from "@/lib/supabase";
import { countRecentFailedPayments } from "@/lib/payment-attempts-db";
import { logout } from "../actions";
import AdminShell from "./AdminShell";

/**
 * Counts shown in the rail. They're cheap head-only queries and give the
 * operator a reason to trust the nav — "3 bookings" beside Bookings means
 * three things actually need looking at.
 */
async function loadCounts() {
  try {
    const db = getSupabase();
    const [orders, bookings, customers, failedPayments] = await Promise.all([
      db.from("orders").select("*", { count: "exact", head: true }),
      db
        .from("experience_bookings")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      db.from("customer_profiles").select("*", { count: "exact", head: true }),
      countRecentFailedPayments(),
    ]);

    return {
      orders: orders.count ?? 0,
      bookings: bookings.count ?? 0,
      customers: customers.count ?? 0,
      failedPayments,
    };
  } catch {
    // The chrome must render even if a count query fails; the pages themselves
    // surface real errors.
    return { orders: 0, bookings: 0, customers: 0, failedPayments: 0 };
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
