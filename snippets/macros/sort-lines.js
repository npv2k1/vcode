/**
 * @name Sort Lines
 * @description Sort lines alphabetically (case-insensitive, natural number order).
 * @category Lines
 */
function transform(input, context) {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
    return input.split(/\r?\n/).sort((a, b) => collator.compare(a, b)).join('\n');
}
