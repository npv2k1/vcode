/**
 * @name Remove Empty Lines
 * @description Drop blank and whitespace-only lines.
 * @category Lines
 */
function transform(input, context) {
    return input
        .split(/\r?\n/)
        .filter(line => line.trim().length > 0)
        .join('\n');
}
