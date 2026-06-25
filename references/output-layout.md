# 输出目录结构

默认生成的语义层文件保存到：

```text
semantic-layer/{domain}/
```

此外，最终必须在项目根目录生成：

```text
semantic-layer-entities.html
```

如果项目中已经存在 `semantic-layer/`、`sematic-layer/`、`config/`、`metadata/` 或 `knowledge/` 等既有约定，应优先遵循项目约定。

## 推荐文件结构

```text
./
├── semantic-layer-entities.html
└── semantic-layer/{domain}/
    ├── README.md
    ├── semantic-layer.yaml
    ├── entities/
    │   ├── atomic.yaml
    │   └── concepts.yaml
    ├── sql/
    │   └── *.sql
    ├── mappings/
    │   └── query-examples.yaml
    ├── tests/
    │   └── semantic-layer-tests.yaml
    └── dist/
        └── semantic-layer.json
```

## 文件职责

- `semantic-layer-entities.html`：项目根目录中的实体信息汇总页，面向开发者和业务评审展示 L0 原子实体、L1 概念、L2 概念、依赖关系、SQL 模板原文、假设和风险。

- `README.md`：记录准备度评分、业务场景、指标口径、假设、缺失信息和风险。
- `semantic-layer.yaml`：人工维护的主清单，引用实体文件、SQL 文件、映射文件和测试文件。
- `entities/atomic.yaml`：L0 原子实体和 SQL 引用。
- `entities/concepts.yaml`：L1 / L2 概念定义。
- `sql/*.sql`：较长或复杂的 SQL 模板。
- `mappings/query-examples.yaml`：典型用户问题和预期映射链路。
- `tests/semantic-layer-tests.yaml`：结构测试和行为测试。
- `dist/semantic-layer.json`：编译后的运行时产物，供智能体或服务端使用。

## 根目录实体 HTML 必备内容

`semantic-layer-entities.html` 必须从实体定义文件整理生成，而不是只写说明文字。至少包含：

1. 页面标题、业务域、生成时间、准备度评分。
2. L0 原子实体总览：id、名称、业务含义、来源表、粒度、SQL 引用、SQL 模板原文、参数、输出字段、假设。
3. L1 业务概念总览：id、名称、依赖 L0 原子实体、组合规则、关键词、示例问法、回答模板。
4. L2 决策概念总览：id、名称、依赖 L1 / L0 原子实体、组合规则、关键词、示例问法、回答模板。
5. 依赖关系树：展示 `L2 → L1 → L0 原子实体`。
6. SQL 模板原文：每个 L0 原子实体都必须展示完整 SQL 模板原文；如果实体使用 `sql_template_ref` 指向 `.sql` 文件，生成 HTML 时必须读取该 SQL 文件全文并嵌入页面，不能只展示文件路径或摘要。
7. 风险与假设：展示缺失口径、draft SQL、权限边界状态和 assumptions。

HTML 应使用内联 CSS，避免依赖外部 CDN、字体或脚本。

## 最小主清单

```yaml
domain: sales
version: 1
readiness:
  score: 78
  level: draft_with_confirmations
permission_boundary_status: not_provided
files:
  atomic_entities: entities/atomic.yaml
  concept_entities: entities/concepts.yaml
  query_examples: mappings/query-examples.yaml
  tests: tests/semantic-layer-tests.yaml
```
