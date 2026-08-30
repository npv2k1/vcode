/**
 * @name Trim Lines
 * @description Remove leading and trailing whitespace from every line.
 * @category Lines
 */
function transform(input, context) {
    return input.split(/\r?\n/).map(line => line.trim()).join('\n');
}
