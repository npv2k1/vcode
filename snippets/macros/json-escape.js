/**
 * @name Escape as JSON String
 * @description Wrap the selection in a quoted, escaped JSON string.
 * @category JSON
 */
function transform(input, context) {
    return JSON.stringify(input);
}
