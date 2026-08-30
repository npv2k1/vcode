/**
 * @name Remove Duplicate Lines
 * @description Keep the first occurrence of every line and drop the rest.
 * @category Lines
 */
function transform(input, context) {
    return [...new Set(input.split(/\r?\n/))].join('\n');
}
