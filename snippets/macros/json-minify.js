/**
 * @name Minify JSON
 * @description Collapse JSON to a single line.
 * @category JSON
 */
function transform(input, context) {
    return JSON.stringify(JSON.parse(input));
}
