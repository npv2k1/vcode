/**
 * @name snake_case to camelCase
 * @description Convert snake_case identifiers to camelCase.
 * @category Naming
 */
function transform(input, context) {
    return input.replace(/\b[a-z0-9]+(?:_[a-z0-9]+)+\b/gi, word =>
        word.toLowerCase().replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase())
    );
}
