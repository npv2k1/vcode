/**
 * @name camelCase to snake_case
 * @description Convert camelCase and PascalCase identifiers to snake_case.
 * @category Naming
 */
function transform(input, context) {
    return input.replace(/\b[A-Za-z_$][\w$]*\b/g, word => {
        if (!/[a-z]/.test(word) || !/[A-Z]/.test(word)) {
            return word;
        }
        return word
            .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .toLowerCase();
    });
}
