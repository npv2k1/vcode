/**
 * @name Join Lines
 * @description Join all non-empty lines with a separator (defaults to ", ").
 * @category Lines
 */
function transform(input, context, separator) {
    const glue = separator && separator.length > 0 ? separator : ', ';
    return input
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .join(glue);
}
