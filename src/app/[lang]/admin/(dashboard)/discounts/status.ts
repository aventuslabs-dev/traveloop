import type { discountStatus } from "@/lib/discounts-db";
import type { PillTone } from "../ui";
import type { DiscountFormValues } from "./discount-actions";

/** How each discount status reads in the console. */
export const STATUS_PILLS: Record<
  ReturnType<typeof discountStatus>,
  { label: string; tone: PillTone }
> = {
  live: { label: "Live", tone: "success" },
  off: { label: "Switched off", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
  usedUp: { label: "Used up", tone: "warn" },
};

/** A blank "new discount" form: a switched-on percentage code. */
export const EMPTY_DISCOUNT: DiscountFormValues = {
  automatic: "",
  code: "",
  label: "",
  kind: "percent",
  value: "",
  startsOn: "",
  endsOn: "",
  maxRedemptions: "",
  active: "on",
};
