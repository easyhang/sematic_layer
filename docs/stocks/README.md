# sematic_WS 股票技术分析语义层

## 准备度评估

| 维度 | 得分 | 说明 |
| --- | ---: | --- |
| 业务目标清晰度 | 18/20 | 业务域（A股技术分析）、使用者（交易员/分析师）、决策目标（买卖/风控/选股）清晰 |
| 数据表结构完整度 | 20/20 | 9张表的完整字段、类型、主键、样例数据均已提供 |
| 字段业务含义完整度 | 15/15 | 所有字段均有中文注释和示例值 |
| 表关系明确度 | 15/15 | Join Key、基数关系、粒度和重复风险均已说明 |
| 指标口径明确度 | 10/15 | 信号评分机制明确，但精确计算口径和权重方案待数据填充后确认 |
| 典型 Query 覆盖度 | 10/10 | 每表 2+ 条 SQL 示例，共约 18 个参考查询 |
| 权限边界说明 | 0/5 | 未提供（本地 SQLite，单用户环境） |
| **总分** | **88/100** | **可构建正式初版语义层** |

## 业务场景

本语义层服务于 **A股技术分析决策系统**，支持以下场景：

1. **行情查询**：查看个股/行业/市场的K线走势和涨跌表现。
2. **技术信号分析**：查询四层技术信号（L1基础→L2复合→L3交易体系→L4市场环境），判断买卖时机。
3. **投资评级**：综合趋势、信号和指标给出买入/持有/卖出建议。
4. **风险监控**：评估市场整体风险，检测个股异动和量价背离。
5. **选股推荐**：基于多维度筛选生成优选股票池。
6. **板块轮动**：识别行业动量变化和资金流向。
7. **运维监控**：检查数据更新管道健康度。

## 数据资产

| 表名 | 中文名 | 数据量 | 状态 | 用途 |
| --- | --- | --- | --- | --- |
| stocks | 股票基本信息表 | 5,208行 | ✅ 有数据 | 主数据基座，全局代码→名称→行业映射 |
| kline_daily | 日K线行情表 | 379,748行 | ✅ 有数据 | 核心技术分析数据源（90%查询依赖） |
| kline_weekly | 周K线行情表 | 77,339行 | ✅ 有数据 | 中周期趋势分析 |
| kline_monthly | 月K线行情表 | 18,511行 | ✅ 有数据 | 长周期趋势分析 |
| indicators | 技术指标表 | 空表 | ⚠️ 设计阶段 | RSI/MACD/KDJ等指标值 |
| signals | 交易信号表 | 空表 | ⚠️ 设计阶段 | 四层交易信号 |
| composite_scores | 综合评分表 | 空表 | ⚠️ 设计阶段 | 综合评分和买卖评级 |
| market_regime | 市场环境状态表 | 空表 | ⚠️ 设计阶段 | 牛熊判断和市场环境 |
| update_log | 数据更新日志表 | 空表 | ⚠️ 设计阶段 | 管道运维监控 |
| _数据字典 | 数据字典表 | 19行 | ✅ 有数据 | 字段元数据速查 |

## 指标口径（核心）

- **信号评分 (score)**：范围 -2（强卖）到 +2（强买），0=中性。六字段复合主键唯一确定一条信号。
- **综合评分 (total_score)**：L1~L4 各层信号的加权汇总，具体权重待数据填充后确认。
- **评级 (level)**：strong_buy > buy > neutral > sell > strong_sell，五档制。
- **信号可信度 (confidence)**：0~1，市场异常时降低。出现在 market_regime 和 composite_scores 两张表中，前者是全局乘数，后者是个股综合可信度。
- **市场状态 (regime)**：strong_bull > bull > sideways > bear > extreme_bear，每日一条记录。
- **市场宽度 (market_breadth)**：0~1，上涨股票占所有交易股票的比例。
- **涨跌幅 (pct_change)**：已做复权处理，可直接使用。
- **成交量 (volume)**：单位为股。成交额 (amount)：单位为元。
- **换手率 (turnover)**：百分比值，仅日K线包含此字段。

## 假设与风险

### 关键假设
1. `industry` 和 `sector` 字段当前值相同，均存储申万三级行业编码+名称组合文本，非标准化编码。
2. `pct_change` 已做复权处理，可直接用于涨跌幅分析。
3. 信号评分、综合评分的精确计算公式和权重方案由上游任务决定，本语义层只做读取和聚合。
4. 四层信号架构（L1→L2→L3→L4→L5综合评分）为设计约定，概念模型遵循此分层。

### 数据风险（⚠️ 5张表无数据）
- `indicators`、`signals`、`composite_scores`、`market_regime`、`update_log` 五张表当前无数据。
- 依赖这些表的L0 原子实体（stock_indicator_value、stock_signal、composite_score_detail、market_environment、data_update_status）**当前查询将返回空结果**。
- 依赖这些实体的概念（stock_signal_summary、stock_indicator_profile、market_trend_status、stock_composite_score_overview 及所有5个L2决策概念）**当前评估结果不完整或无意义**。
- **建议**：优先填充 `indicators` 和 `signals` 表数据，它们是评分链路的起���。

### 安全风险
- 权限边界未提供（本地 SQLite 单用户环境，暂无多角色访问需求）。
- 如需生产化，建议补充：角色权限、敏感字段脱敏规则、查询频率限制。

## 待确认问题

1. 综合评分的各层权重（L1/L2/L3/L4）和维度的具体权重分配是怎样的？
2. `indicator_name` 的完整枚举值列表是什么？
3. `signals.indicator` 和 `indicators.indicator_name` 的枚举值是否完全一致？
4. 行业分类是否需要从申万三级向上聚合？用户查询时使用什么行业名称？
5. 信号评分（-2到+2）映射为买卖建议的具体规则是什么？
6. 是否需要支持盘前/盘中/盘后不同时间点的数据状态？

## 文件清单

| 文件 | 说明 |
| --- | --- |
| [semantic-layer.yaml](semantic-layer.yaml) | 主清单，引用所有子文件 |
| [entities/atomic.yaml](entities/atomic.yaml) | 10个L0 原子实体定义 |
| [entities/concepts.yaml](entities/concepts.yaml) | 8个L1业务概念 + 5个L2决策概念 |
| [sql/*.sql](sql/) | 10个SQL模板文件 |
| [mappings/query-examples.yaml](mappings/query-examples.yaml) | 13条Query映射示例 |
| [tests/semantic-layer-tests.yaml](tests/semantic-layer-tests.yaml) | 结构校验 + 行为测试用例 |
| [dist/semantic-layer.json](dist/semantic-layer.json) | 运行时JSON分发文件 |
