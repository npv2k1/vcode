/**
 * @name Lines to SQL IN List
 * @description Turn each line into a quoted SQL value list: ('a', 'b').
 * @category SQL
 */
function transform(input, context) {
    const items = input
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(Boolean)
        .map(line => `'${line.replace(/'/g, "''")}'`);

    return `(${items.join(', ')})`;
}
