import Link from "next/link";
import {
  SLOT_CAPACITY,
  SLOT_TIMES,
  formatBookingDate,
  formatSlotTime,
  malaysiaToday,
} from "@/lib/urban-sprint/booking-config";
import type { DayAvailability } from "@/lib/urban-sprint/bookings-db";

/**
 * Teams per slot across the coming days, out of the slot's capacity. Counts
 * include teams still at checkout, because their places are held. Each day
 * links to that day's bookings.
 */
export default function SlotGrid({ days }: { days: DayAvailability[] }) {
  const today = malaysiaToday();

  return (
    <div className="ad-table-scroll">
      <table className="ad-table usc-slots">
        <thead>
          <tr>
            <th>Date</th>
            {SLOT_TIMES.map((time) => (
              <th key={time}>{formatSlotTime(time)}</th>
            ))}
            <th className="is-num">Teams</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const total = day.slots.reduce((sum, slot) => sum + (SLOT_CAPACITY - slot.remaining), 0);

            return (
              <tr key={day.date} className={day.date === today ? "is-today" : undefined}>
                <td>
                  <Link className="usc-row-link" href={`/urban-sprint/admin/bookings?date=${day.date}`}>
                    {formatBookingDate(day.date)}
                  </Link>
                  {day.date === today && <span className="usc-muted"> · today</span>}
                </td>
                {day.slots.map((slot) => {
                  const taken = SLOT_CAPACITY - slot.remaining;
                  const tone =
                    taken >= SLOT_CAPACITY
                      ? " is-full"
                      : taken > 0
                        ? " is-some"
                        : !slot.open
                          ? " is-closed"
                          : "";

                  return (
                    <td key={slot.time}>
                      <span
                        className={`usc-slot${tone}`}
                        title={`${taken} of ${SLOT_CAPACITY} places taken${slot.open ? "" : " · closed for booking"}`}
                      >
                        {taken}/{SLOT_CAPACITY}
                      </span>
                    </td>
                  );
                })}
                <td className="is-num is-strong">{total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
