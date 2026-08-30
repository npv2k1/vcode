/**
 * @name Wrap in Try/Catch
 * @description Wrap the selection in a try/catch block, keeping its indentation.
 * @category JavaScript
 */
function transform(input, context) {
    const lines = input.split(/\r?\n/);
    const baseIndent = lines
        .filter(line => line.trim().length > 0)
        .reduce((indent, line) => {
            const current = line.match(/^[ \t]*/)[0];
            return indent === null || current.length < indent.length ? current : indent;
        }, null) ?? '';

    const body = lines
        .map(line => (line.trim().length > 0 ? baseIndent + '    ' + line.slice(baseIndent.length) : line))
        .join('\n');

    return [
        `${baseIndent}try {`,
        body,
        `${baseIndent}} catch (error) {`,
        `${baseIndent}    console.error(error);`,
        `${baseIndent}}`
    ].join('\n');
}
