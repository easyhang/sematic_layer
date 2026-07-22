-- 数据字典查询
-- 参数: table_name (可选，表名过滤)
SELECT
    表名,
    表说明,
    字段名,
    字段说明,
    示例值
FROM _数据字典
WHERE 1=1
    {% if table_name %}AND 表名 = '{{ table_name }}'{% endif %}
ORDER BY 表名, 字段名
LIMIT {{ limit|default(100) }}
