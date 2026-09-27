/**
 * The customer portal at /account — the signed-in half of the site.
 *
 * A buyer who bought in Chinese lands here straight from the confirmation
 * email, so every string a customer can reach is in this namespace. The
 * operator console at /admin deliberately is not: it has one audience, who
 * reads English.
 *
 * Experience names, schedules, quote lines and prices are *not* here. Those
 * come from `app/data/experiences.ts`, which is already locale-aware, and must
 * stay there — a translation must never be able to move money or change who
 * can book what.
 */
const account = {
  /* --------------------------------------------------------------- */
  /* Chrome                                                           */
  /* --------------------------------------------------------------- */
  nav: {
    /** Labelled "sections" rather than "navigation": screen readers already say "navigation". */
    aria: "Account sections",
    overview: "Overview",
    experiences: "Experiences",
    bookings: "My bookings",
    details: "My details",
  },

  header: {
    signOut: "Sign out",
  },

  loading: "Loading…",

  /**
   * How a pass is named wherever a customer reads one.
   *
   * `orders.pass_name` holds what the tier was called in English at purchase —
   * and, for a multi-pass order, the literal string "3 passes". Neither is
   * shown: the tier is re-looked-up from `passKey` and the count is rebuilt
   * here, so a Chinese buyer reads 金卡通行证 rather than "Gold Pass".
   */
  pass: {
    /** `{pass}` is the localized tier name. */
    label: "{pass} Pass",
    count: { one: "{n} pass", other: "{n} passes" },
  },

  /* --------------------------------------------------------------- */
  /* Sign in                                                          */
  /* --------------------------------------------------------------- */
  login: {
    title: "Sign in to your account",
    sub: "Use the email and password we sent you after your purchase.",
    failed: "Incorrect email or password.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    /** `{link}` is rendered as the contact link, so the sentence wraps around it. */
    helpBefore: "Can't get in? ",
    helpLink: "Contact our team",
    helpAfter: " and we'll sort it out.",
    back: "Back to traveloop.my",
  },

  /* --------------------------------------------------------------- */
  /* Overview                                                         */
  /* --------------------------------------------------------------- */
  overview: {
    title: "My account",
    eyebrow: "Traveloop portal",
    welcome: "Welcome back.",
    /** `{name}` is the customer's first name. */
    welcomeNamed: "Welcome back, {name}.",
    lede: "Your pass, your bookings and your details — all in one place.",

    prompt: {
      empty: "Finish your registration details",
      /** `{n}` is how many fields are still blank. */
      missing: { one: "{n} detail still missing", other: "{n} details still missing" },
      body: "Your pass and travel insurance cover rely on these being complete and accurate.",
    },

    currentPass: {
      heading: "Your current pass",
      purchases: { one: "{n} purchase", other: "{n} purchases" },
      badge: "Active",
      /** `{names}` is a comma-separated list of who each pass in the order is for. */
      registered: "Registered: {names}",
      purchased: "Purchased",
      totalPaid: "Total paid",
      tripDates: "Trip dates",
      downloadInvoice: "Download invoice",
      emptyTitle: "You don't have any passes yet.",
      browsePasses: "Browse passes",
    },

    /** The three at-a-glance tiles under the pass card. */
    stats: {
      tripStarts: "Trip starts",
      tripStartsToday: "Today",
      tripStartsTomorrow: "Tomorrow",
      /** `{n}` is the number of days until arrival. */
      tripStartsIn: { one: "In {n} day", other: "In {n} days" },
      tripRunning: "Your trip",
      tripLastDay: "Last day",
      /** `{n}` is the number of days left before departure. */
      tripDaysLeft: { one: "{n} day left", other: "{n} days left" },
      tripEnded: "Trip ended",
      upcoming: { one: "Upcoming session", other: "Upcoming sessions" },
      included: { one: "Experience included", other: "Experiences included" },
    },

    experiences: {
      heading: "Cultural experiences",
      seeAll: "See all",
      nextSession: "Your next session",
      confirmed: "Confirmed",
      awaiting: "Awaiting confirmation",
      lede: "Included with your pass — book a session and pay at the venue on the day.",
    },

    history: {
      heading: "Purchase history",
      /** `{dates}` is the formatted trip range. */
      trip: "Trip {dates}",
      /** `{number}` is the invoice number. */
      downloadInvoice: "Download invoice {number}",
      /** `{numbers}` is a comma-separated list of the order's pass numbers. */
      passNumbers: "Pass No. {numbers}",
    },

    manage: {
      heading: "Manage your account",
      detailsTitle: "My details",
      detailsBody: "Registration details, emergency contact and the password you sign in with.",
      detailsCue: "Open",
      helpTitle: "Need a hand?",
      helpBody: "Questions about your pass, a booking or your insurance cover — just ask.",
      helpCue: "Contact us",
    },
  },

  /* --------------------------------------------------------------- */
  /* My bookings                                                      */
  /* --------------------------------------------------------------- */
  bookings: {
    title: "My bookings",
    eyebrow: "Cultural experiences",
    lede: "Your booked sessions. Payment is made at the venue on the day.",

    /** Keyed by `StoredBooking["status"]`. */
    status: {
      pending: "Awaiting confirmation",
      confirmed: "Confirmed",
      cancelled: "Cancelled",
      completed: "Completed",
    },

    /** `{reference}` is the booking reference in every flash below. */
    flashBooked:
      "Booking {reference} received — we've emailed you the details and will confirm the session shortly.",
    flashCancelled: "Booking {reference} was cancelled.",
    /** `{hours}` is CANCELLATION_CUTOFF_HOURS. */
    flashTooLate:
      "That session is less than {hours} hours away, so it can't be cancelled online. Please contact us and we'll sort it out.",
    flashCancelFailed: "We couldn't cancel that booking. Please try again.",

    upcoming: "Upcoming",
    pastAndCancelled: "Past & cancelled",
    emptyTitle: "No sessions booked yet.",
    browseExperiences: "Browse experiences",

    card: {
      date: "Date",
      time: "Time",
      venue: "Venue",
      venueTbc: "Confirmed by our team",
      participants: "Participants",
      /** Appended after the adult headcount. `{n}` is the number of under-age children. */
      plusChildren: { one: " + {n} child (free)", other: " + {n} children (free)" },
      wasQuoted: "Was quoted",
      payAtVenue: "Pay at the venue",
      bookedWith: "Booked with",
      /** `{pass}` is the tier key, e.g. "gold". */
      pass: "{pass} Pass",
      addToCalendar: "Add to calendar",
      cancel: "Cancel booking",
    },
  },

  /* --------------------------------------------------------------- */
  /* Experiences browse                                               */
  /* --------------------------------------------------------------- */
  experiences: {
    title: "Cultural experiences",
    eyebrow: "Included with your pass",
    /** Shown before the customer owns a pass, so it promises nothing about theirs. */
    ledeNoPass: "Hands-on sessions across Penang, included with your Traveloop pass.",
    /** `{unlocked}` of `{total}`, booked `{days}` days ahead. */
    lede:
      "{unlocked} of {total} experiences are included with your pass. Book at least {days} days ahead — your pass discount is applied at booking, and you pay at the venue on the day.",
    emptyTitle: "You'll be able to book experiences once you have a pass.",
    browsePasses: "Browse passes",

    card: {
      /** `{pass}` is the tier the customer actually holds. */
      included: "Included with {pass}",
      /** `{tiers}` is the list of tiers that unlock it, e.g. "Gold & Platinum". */
      tiersOnly: "{tiers} only",
      /** `{date}` is wrapped in <strong>, so this is split around it. */
      nextSessionBefore: "Next session ",
      noSessions: "No sessions in your travel window",
      cta: "Check dates & price",
      lockedNote: "Not included with your pass — upgrade to unlock it.",
      comparePasses: "Compare passes",
    },
  },

  /* --------------------------------------------------------------- */
  /* One experience: the booking page                                 */
  /* --------------------------------------------------------------- */
  book: {
    /** `{experience}` is the experience name. */
    title: "Book the {experience}",
    titleFallback: "Book an experience",
    back: "All experiences",

    alreadyBooked: "You already have an upcoming booking for the {experience}.",
    viewBookings: "View your bookings",

    /** `{experience}` is the name, `{tiers}` the passes that unlock it. */
    notIncluded: "The {experience} is included with the {tiers} pass.",
    /** The same, for someone who holds a pass that simply isn't one of them. */
    notIncludedWithYours:
      "The {experience} is included with the {tiers} pass, which isn't the pass you hold.",
    comparePasses: "Compare passes",

    runs: "Runs",
    duration: "Duration",
    venue: "Venue",
    whatsIncluded: "What's included",
    knowBefore: "Know before you go",
  },

  /* --------------------------------------------------------------- */
  /* The booking form itself                                          */
  /* --------------------------------------------------------------- */
  bookingForm: {
    /** `{experience}` is the name; `{trip}` the customer's trip dates. */
    noSessions: "There are no {experience} sessions we can offer you right now.",
    noSessionsInTrip:
      "There are no {experience} sessions we can offer you right now between {trip} — bookings need {days} days' notice.",
    talkToUs: "Talk to our team",

    bookWith: "Book with",
    /** `{pass}` is the tier name. */
    passChip: "{pass} Pass",
    /** `{percent}` is already formatted by `phrases.discount` — "25% off" / "7.5折". */
    passDiscount: "{discount}",

    pickDate: "Pick a date",
    onlyAvailable: "Only dates with a session are selectable.",
    /** `{trip}` is the formatted trip range. */
    limitedToTrip: " Limited to your trip: {trip}.",
    previousMonth: "Previous month",
    nextMonth: "Next month",
    /** Monday-first, one letter each. Chinese uses 一二三四五六日. */
    weekdayInitials: ["M", "T", "W", "T", "F", "S", "S"],

    pickTime: "Pick a time",
    full: "Full",
    spotsLeft: { one: "{n} spot left", other: "{n} spots left" },

    location: "Location",
    comingSoon: " — coming soon",

    whosComing: "Who's coming",
    /** `{n}` is the headcount the group package covers. */
    groupCovers: "Group package covers up to {n}",
    /** `{age}` is the age under which children come free. */
    childrenUnder: "Children under {age}",
    childrenFree: "Join free — not counted above",
    /** `{label}` is the stepper's own label, e.g. "Participants". */
    fewer: "Fewer — {label}",
    more: "More — {label}",

    choosePackage: "Choose your package",
    perPerson: "Per person",
    /** `{pass}` is the tier name, `{n}` the headcount. */
    perPersonNote: "Your {pass} Pass rate for each of the {n}",

    notes: "Anything we should know? (optional)",
    notesPlaceholder: "Dietary needs, mobility requirements, a birthday to mark…",

    summary: "Your booking",
    payableAtVenue: "Payable at the venue",
    /** `{pass}` is the tier name, `{amount}` the formatted saving. */
    saving: "Your {pass} Pass saves you {amount} on this booking.",

    /** `{amount}` is the total, `{hours}` the free-cancellation cutoff. */
    consent:
      "I understand nothing is charged now — {amount} is payable at the venue on the day — and that I can cancel free of charge up to {hours} hours before the session.",

    submit: "Confirm booking",
    submitting: "Booking…",
  },

  /* --------------------------------------------------------------- */
  /* My details                                                       */
  /* --------------------------------------------------------------- */
  details: {
    title: "My details",
    eyebrow: "Your account",
    lede: "The information we hold for you, and the password you use to sign in to this portal.",

    savedFlash: "Your details were saved.",
    saveFailedFlash: "We couldn't save your details. Please try again.",

    registrationHeading: "Registration details",
    /** `{filled}` of `{total}` fields completed. */
    filledCount: "{filled} of {total} filled in",
    registrationLede:
      "Collected when you bought your pass. Keep them accurate — your pass and travel insurance cover rely on them.",

    meterAria: "Registration details completeness",
    complete: "Everything we need is on file.",
    /** `{fields}` is a comma-separated list of the blank field labels. */
    stillMissing: "Still missing: {fields}.",

    /** `{date}` is when the customer accepted at checkout. */
    termsAccepted: "You accepted the Traveloop terms and insurance conditions on {date}.",

    securityHeading: "Sign-in & security",
    securityLede: "Your email is the username for this portal. Get in touch if you need it changed.",
    emailLabel: "Email address",
    changePassword: "Change password",

    passwordUpdatedFlash: "Your password was updated.",
    /** `{n}` is the minimum length the server enforces. */
    passwordTooShortFlash: "Password must be at least {n} characters.",
    passwordMismatchFlash: "Those passwords don't match.",
    passwordFailedFlash: "We couldn't update your password. Please try again.",
  },

  /* --------------------------------------------------------------- */
  /* The stored registration details                                  */
  /* --------------------------------------------------------------- */
  profile: {
    /**
     * Labels for the eight registration fields, in the order they are asked
     * for at checkout. Shared by the read-only summary, the completeness
     * meter and the "what's missing" prompt, so they cannot disagree.
     */
    rows: {
      fullName: "Full name",
      nationality: "Nationality",
      travelDocument: "Travel document",
      documentNumber: "Document number",
      address: "Address",
      emergencyContact: "Emergency contact",
      emergencyPhone: "Emergency phone",
      relationship: "Relationship",
    },

    notProvided: "Not provided",
    edit: "Edit details",
    emptyBody:
      "We don't have your registration details yet. It takes about a minute, and your pass and insurance cover need them.",
    addDetails: "Add your details",

    form: {
      aboutYou: "About you",
      fullName: "Full name",
      fullNamePlaceholder: "As printed on your travel document",
      nationality: "Nationality",
      notSet: "Not set",
      otherNationality: "Please specify your nationality",
      documentType: "Type of travel document",
      documentNumber: "Document number",
      address: "Home address",
      addressPlaceholder: "Street, city, postcode, country",

      emergencyHeading: "Emergency contact",
      emergencyHint: "Who we'd call on your behalf if something happened during your trip.",
      contactName: "Contact name",
      contactPhone: "Contact phone number",
      contactPhonePlaceholder: "Include the country code",
      relationship: "Relationship to you",
      otherRelationship: "Please specify the relationship",

      cancel: "Cancel",
      save: "Save details",
    },
  },

  /* --------------------------------------------------------------- */
  /* Change password                                                  */
  /* --------------------------------------------------------------- */
  password: {
    newPassword: "New password",
    confirmPassword: "Confirm new password",
    show: "Show password",
    hide: "Hide password",
    /** `{n}` is the minimum length. */
    ruleLength: "At least {n} characters",
    ruleMatch: "Both entries match",
    submit: "Update password",
  },
};

export default account;
