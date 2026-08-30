/**
 * @name Base64 Encode
 * @description Encode the selection as base64.
 * @category Encoding
 */
function transform(input, context) {
    return Buffer.from(input, 'utf8').toString('base64');
}
