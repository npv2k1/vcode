/**
 * @name Format JSON
 * @description Pretty-print JSON with two-space indentation.
 * @category JSON
 */
function transform(input, context) {
    return JSON.stringify(JSON.parse(input), null, 2);
}
