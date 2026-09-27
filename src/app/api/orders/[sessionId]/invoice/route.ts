import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrderBySessionId } from "@/lib/orders-db";
import { getOrderItemsFromRegistrations } from "@/lib/pass-registrations-db";
import { buildInvoiceHtml, buildInvoicePdf, invoiceLineItemsFor } from "@/lib/invoice";
import { isAdminUser } from "@/lib/admin-auth";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ sessionId: string }> };

/**
 * Serves the invoice for a fulfilled order — the same document emailed to the
 * buyer. Defaults to printable HTML; `?format=pdf` downloads the PDF, which is
 * what the customer portal links to.
 *
 * The Stripe session ID doubles as a bearer token for the guest confirmation
 * flow on /passes/success, which can run before the buyer's account exists —
 * so an unauthenticated request with the right ID is still allowed, same as
 * Stripe's own hosted receipts. What's blocked is a *different* signed-in
 * customer using someone else's session ID to pull their invoice.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { sessionId } = await params;

  const order = await getOrderBySessionId(sessionId);
  if (!order) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && order.userId && order.userId !== user.id && !(await isAdminUser(supabase, user))) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const lineItems = invoiceLineItemsFor(order, await getOrderItemsFromRegistrations(sessionId));

  if (new URL(request.url).searchParams.get("format") === "pdf") {
    const pdf = await buildInvoicePdf(order, lineItems);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${order.invoiceNumber || "invoice"}.pdf"`,
      },
    });
  }

  return new NextResponse(buildInvoiceHtml(order, lineItems), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
