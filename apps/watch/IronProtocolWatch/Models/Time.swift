import Foundation

/// Time / date helpers shared across watch views.
///
/// Lives in `Models/` rather than a standalone `Util/` group because the
/// watch app is small enough that a dedicated utilities folder would be
/// over-engineering. If we add more than ~3 helpers, split this out.

/// Format an ISO-8601 wire-format string (the format every API contract
/// schema serializes dates as) into a human-relative phrase like
/// "3h ago", "2d ago", "just now". Returns `nil` if the string is not a
/// valid ISO-8601 date.
///
/// Uses the system `RelativeDateTimeFormatter` which is locale-aware and
/// handles plurals + abbreviations correctly across regions.
func relativeTimeString(fromIso iso: String) -> String? {
    let f = ISO8601DateFormatter()
    f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = f.date(from: iso) {
        return relativeTimeString(from: date)
    }
    // Try without fractional seconds — Prisma+Next.js sometimes serializes
    // either with or without ms depending on `Date#toISOString` rounding.
    f.formatOptions = [.withInternetDateTime]
    if let date = f.date(from: iso) {
        return relativeTimeString(from: date)
    }
    return nil
}

/// Format an absolute `Date` into a relative phrase (see
/// `relativeTimeString(fromIso:)`). Useful when we already have a
/// non-string date (e.g. local clock for "just submitted").
func relativeTimeString(from date: Date) -> String {
    let formatter = RelativeDateTimeFormatter()
    formatter.unitsStyle = .abbreviated // "3h ago", "2d ago"
    return formatter.localizedString(for: date, relativeTo: Date())
}
