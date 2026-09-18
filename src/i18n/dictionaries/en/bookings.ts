/**
 * Cultural-experience bookings made from the customer portal.
 *
 * Only the failure messages so far. The portal's own chrome — headings,
 * labels, empty states — is still hardcoded English in
 * `app/[lang]/account/**`; when that gets localized, its copy belongs in this
 * namespace next to these.
 */
const bookings = {
  /**
   * Keyed by `BookingError` in lib/booking.ts. Placeholders are filled from
   * the values that type carries, so a name or a number can be dropped into a
   * sentence whose grammar differs per language.
   */
  errors: {
    unknownExperience: "We couldn't find that experience.",
    noPassChosen: "Please choose which pass you're booking with.",
    /** `{pass}` is the tier name, `{experience}` the experience's. */
    notEntitled: "Your {pass} Pass doesn't include the {experience}.",
    /** `{days}` is the minimum lead time in days. */
    slotUnavailable:
      "That session isn't available. Sessions must be booked at least {days} days ahead.",
    /** The same, for a buyer whose order carries trip dates to stay inside. */
    slotUnavailableWithinTrip:
      "That session isn't available. Sessions must be booked at least {days} days ahead " +
      "and within your trip dates.",
    participantRange: "Please choose between {min} and {max} participants.",
    invalidChildren: "Please enter a valid number of children.",
    packageRequired: "Please choose a photo package.",
    /** `{pack}` is the group pack's own name. */
    packMinimum: "The {pack} needs at least {min} participants.",
    locationRequired: "Please choose a location.",
    locationComingSoon: "{location} isn't available yet.",

    /** Raised after validation passes, by the write itself. */
    duplicate: "You already have a booking for this experience. Check your bookings below.",
    slotFull: "That session just filled up. Please choose another date or time.",
    saveFailed: "We couldn't save your booking. Please try again in a moment.",
  },
};

export default bookings;
