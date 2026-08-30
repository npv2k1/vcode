/**
 * @name Encode URL
 * @description Percent-encode the selection for use in a URL.
 * @category Encoding
 */
function transform(input, context) {
    return encodeURIComponent(input.trim());
}
