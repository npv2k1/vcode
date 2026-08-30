/**
 * @name Unescape JSON String
 * @description Turn a quoted, escaped JSON string back into raw text.
 * @category JSON
 */
function transform(input, context) {
    const trimmed = input.trim();
    const parsed = JSON.parse(trimmed.startsWith('"') ? trimmed : JSON.stringify(trimmed));
    return typeof parsed === 'string' ? parsed : String(parsed);
}
