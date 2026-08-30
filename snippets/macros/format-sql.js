/**
 * @name Format SQL
 * @description Normalize whitespace and start each SQL keyword on a new line.
 * @category SQL
 */
function transform(input, context) {
    if (!input || typeof input !== 'string') {
        return '';
    }

    // Keywords ordered by specificity so composite keywords win over their parts
    const keywords = [
        'INSERT INTO',
        'DELETE FROM',
        'GROUP BY',
        'ORDER BY',
        'INNER JOIN',
        'LEFT JOIN',
        'RIGHT JOIN',
        'FULL JOIN',
        'CROSS JOIN',
        'OUTER JOIN',
        'UNION ALL',
        'VALUES',
        'UPDATE',
        'SELECT',
        'HAVING',
        'OFFSET',
        'INTERSECT',
        'EXCEPT',
        'UNION',
        'DELETE',
        'WHERE',
        'LIMIT',
        'FROM',
        'JOIN',
        'SET'
    ];

    const pattern = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');

    return input
        .replace(/\s+/g, ' ')
        .trim()
        .replace(pattern, match => '\n' + match.toUpperCase())
        .trim();
}
