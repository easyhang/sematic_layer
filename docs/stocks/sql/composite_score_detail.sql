-- 综合评分明细查询
-- 参数: code (可选，股票代码), date (可选，交易日期), level (可选，评级过滤)
SELECT
    code,
    date,
    total_score,
    level,
    confidence,
    layer_scores,
    dimension_scores,
    system_scores,
    risk_warnings
FROM composite_scores
WHERE 1=1
    {% if code %}AND code = '{{ code }}'{% endif %}
    {% if date %}AND date = '{{ date }}'{% endif %}
    {% if level %}AND level = '{{ level }}'{% endif %}
ORDER BY total_score DESC, code
LIMIT {{ limit|default(100) }}
