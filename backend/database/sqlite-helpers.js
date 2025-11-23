// SQLite helper functions to replace PostgreSQL-specific features

// Replace FILTER (WHERE condition) with SUM(CASE WHEN ...)
function replaceFilter(sql) {
  return sql.replace(/COUNT\(\)\s+FILTER\s+\(WHERE\s+([^)]+)\)/gi, (match, condition) => {
    return `SUM(CASE WHEN ${condition} THEN 1 ELSE 0 END)`;
  });
}

// Replace parameter placeholders from $1, $2 to ? for SQLite
function replaceParams(sql, params) {
  let paramIndex = 1;
  const newParams = [];
  const newSql = sql.replace(/\$\d+/g, () => {
    newParams.push(params[paramIndex - 1]);
    paramIndex++;
    return '?';
  });
  return { sql: newSql, params: newParams };
}

// Calculate correlation manually (SQLite doesn't have CORR function)
function calculateCorrelation(xValues, yValues) {
  if (xValues.length !== yValues.length || xValues.length === 0) return null;
  
  const n = xValues.length;
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return null;
  return numerator / denominator;
}

module.exports = {
  replaceFilter,
  replaceParams,
  calculateCorrelation
};


