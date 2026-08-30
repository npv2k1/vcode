/**
 * @name Wrap in console.log
 * @description Log the selected expression with the file name as a prefix.
 * @category JavaScript
 */
function transform(input, context) {
    const expression = input.trim();
    const fileName = context.filePath ? context.filePath.split(/[\\/]/).pop() : 'debug';
    return `console.log('[${fileName}] ${expression.replace(/'/g, "\\'")}:', ${expression});`;
}
