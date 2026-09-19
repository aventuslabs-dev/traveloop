/**
 * The minimum length the portal enforces on a customer's chosen password.
 *
 * One constant rather than three: the server action rejects on it, the form
 * echoes it as a live rule while the customer types, and both dictionaries
 * drop it into their "at least N characters" sentence. They drifted apart
 * easily while each carried its own 8.
 */
export const MIN_PASSWORD_LENGTH = 8;
