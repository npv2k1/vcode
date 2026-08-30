/**
 * @name Dates to ISO
 * @description Convert every dd/mm/yyyy date in the selection to an ISO timestamp.
 * @category Date
 */
function transform(input, context, timeZone) {
    const offset = timeZone && /^[+-]\d{2}:\d{2}$/.test(timeZone) ? timeZone : 'Z';
    const DATE_PATTERN = /\b([0-3]?\d)\/([0-1]?\d)\/(\d{4})\b/g;

    return input.replace(DATE_PATTERN, (match, day, month, year) => {
        const d = Number(day);
        const m = Number(month) - 1;
        const y = Number(year);
        const date = new Date(Date.UTC(y, m, d));

        // Reject impossible dates such as 31/02/2026
        if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m || date.getUTCDate() !== d) {
            return match;
        }

        const iso = date.toISOString();
        return offset === 'Z' ? iso : iso.replace('Z', offset);
    });
}
