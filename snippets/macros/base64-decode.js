/**
 * @name Base64 Decode
 * @description Decode a base64 string back to text.
 * @category Encoding
 */
function transform(input, context) {
    return Buffer.from(input.trim(), 'base64').toString('utf8');
}
