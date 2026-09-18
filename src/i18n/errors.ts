import { fill } from "./interpolate";
import type { Dictionary } from "./dictionaries";
import type { BookingError } from "@/lib/booking";
import type { RegistrationError } from "@/lib/registration";

/**
 * Turns the validators' error keys into a sentence the buyer can read.
 *
 * The validators in `lib/registration.ts` and `lib/booking.ts` deliberately
 * return keys rather than prose, because they run on the server for forms that
 * exist in English and Chinese. This is the one place that decides the words,
 * and it is called where the locale is known — the API route or the server
 * action handling the submission.
 *
 * Both switches are exhaustive over their error union, so adding a failure
 * case to a validator is a type error here until it has copy in both
 * dictionaries. That is the point: a new way to reject a purchase cannot ship
 * with no message, or with an English-only one.
 */

export function registrationErrorMessage(
  error: RegistrationError,
  t: Dictionary["registration"]["errors"]
): string {
  switch (error.key) {
    case "detailsRequired":
      return t.detailsRequired;
    case "missingField":
      return fill(t.missingField, { field: t.fieldNames[error.field] });
    case "fieldTooLong":
      return fill(t.fieldTooLong, { field: t.fieldNames[error.field] });
    case "invalidArrivalDate":
      return t.invalidArrivalDate;
    case "invalidDepartureDate":
      return t.invalidDepartureDate;
    case "dateOrder":
      return t.dateOrder;
    case "termsNotAccepted":
      return t.termsNotAccepted;
  }
}

export function bookingErrorMessage(
  error: BookingError,
  t: Dictionary["bookings"]["errors"]
): string {
  switch (error.key) {
    case "unknownExperience":
      return t.unknownExperience;
    case "noPassChosen":
      return t.noPassChosen;
    case "notEntitled":
      return fill(t.notEntitled, {
        pass: error.passName,
        experience: error.experienceName,
      });
    case "slotUnavailable":
      return fill(error.withinTrip ? t.slotUnavailableWithinTrip : t.slotUnavailable, {
        days: error.leadDays,
      });
    case "participantRange":
      return fill(t.participantRange, { min: error.min, max: error.max });
    case "invalidChildren":
      return t.invalidChildren;
    case "packageRequired":
      return t.packageRequired;
    case "packMinimum":
      return fill(t.packMinimum, { pack: error.packLabel, min: error.min });
    case "locationRequired":
      return t.locationRequired;
    case "locationComingSoon":
      return fill(t.locationComingSoon, { location: error.location });
  }
}
