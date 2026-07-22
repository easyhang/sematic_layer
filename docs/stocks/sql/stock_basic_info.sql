-- 股票基本信息
-- 参数: code (可选，6位数字字符串), is_active (可选，1=在市/0=退市)
SELECT
    code,
    name,
    industry,
    sector,
    list_date,
    is_active,
    updated_at
FROM stocks
WHERE 1=1
    {% if code %}AND code = '{{ code }}'{% endif %}
    {% if is_active is not none %}AND is_active = {{ is_active }}{% endif %}
ORDER BY code
LIMIT {{ limit|default(100) }}
