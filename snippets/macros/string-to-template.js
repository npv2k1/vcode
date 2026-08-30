/**
 * @name String to Template Literal
 * @description Wrap the selection in backticks, escaping existing backticks and ${.
 * @category JavaScript
 */
function transform(input, context) {
    const escaped = input
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${');

    return '`' + escaped + '`';
}
