/**
 * @name Decode URL
 * @description Percent-decode a URL or query string.
 * @category Encoding
 */
function transform(input, context) {
    try {
        return decodeURIComponent(input.trim());
    } catch (error) {
        // Fall back to a lenient decode when the input has stray "%" characters
        return input.replace(/%[0-9a-f]{2}/gi, match => {
            try {
                return decodeURIComponent(match);
            } catch {
                return match;
            }
        });
    }
}
