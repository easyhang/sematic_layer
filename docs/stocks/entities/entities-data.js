var DATA = {
  "atomic": [
    {
      "id": "stock_basic_info",
      "name": "股票基本信息",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取A股股票的基本属性，包括代码、名称、行业分类、上市日期和在市状态。stocks 表是所有业务表的全局主数据基座。",
      "business_meaning": "确定一只股票的身份、行业归属和交易资格。",
      "source_tables": ["stocks"],
      "grain": "stock",
      "sql_template_ref": "sql/stock_basic_info.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": false, "description": "股票代码，6位数字字符串（如 600519）。不传则查询全部。"},
        {"name": "is_active", "type": "integer", "required": false, "description": "是否在市过滤。1=在市，0=退市/暂停。默认传 1 仅查在市股票。"}
      ],
      "filters": {"optional": ["industry", "sector", "list_date"]},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "name", "type": "text", "description": "股票简称"},
        {"name": "industry", "type": "text", "description": "申万三级行业分类，如 J66货币金融服务"},
        {"name": "sector", "type": "text", "description": "板块分类，当前与 industry 相同"},
        {"name": "list_date", "type": "text", "description": "上市日期，格式 YYYY-MM-DD"},
        {"name": "is_active", "type": "integer", "description": "是否在市：1=在市，0=退市/暂停"},
        {"name": "updated_at", "type": "text", "description": "记录最后更新时间"}
      ],
      "fact_interpretation_template": "{{name}}（{{code}}）属于{{industry}}行业，于{{list_date}}上市，当前{{#is_active}}在市{{/is_active}}{{^is_active}}已退市{{/is_active}}。",
      "assumptions": ["industry 和 sector 字段目前值相同，均存储申万三级行业编码+名称组合文本，非标准化编码。"],
      "validation_queries": ["SELECT COUNT(*) FROM stocks WHERE is_active = 1", "SELECT COUNT(DISTINCT industry) FROM stocks"],
      "business_keywords": ["股票信息", "基本信息", "股票代码", "行业分类", "上市日期", "简称", "股票查询"]
    },
    {
      "id": "table_field_dictionary",
      "name": "数据字典",
      "entity_type": "atomic",
      "version": 1,
      "description": "通过数据字典表查询任意表的字段名称、中文说明和示例值，用于快速理解表结构。",
      "business_meaning": "提供数据库字段级别的元数据速查。",
      "source_tables": ["_数据字典"],
      "grain": "table, field",
      "sql_template_ref": "sql/table_field_dictionary.sql",
      "parameters": [
        {"name": "table_name", "type": "text", "required": false, "description": "要查询的表名（如 stocks）。不传则列出所有已覆盖的表。"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "表名", "type": "text", "description": "数据库表名"},
        {"name": "表说明", "type": "text", "description": "表的中文业务说明"},
        {"name": "字段名", "type": "text", "description": "字段名称"},
        {"name": "字段说明", "type": "text", "description": "字段的中文注释"},
        {"name": "示例值", "type": "text", "description": "该字段的示例数据"}
      ],
      "fact_interpretation_template": "{{表名}} 表的 {{字段名}} 字段含义为：{{字段说明}}，示例值：{{示例值}}。",
      "assumptions": ["数据字典目前只覆盖 stocks、kline_daily、kline_weekly、kline_monthly 四张有数据的表（共19条记录），新增表后需手动补充。"],
      "validation_queries": ["SELECT DISTINCT 表名, 表说明 FROM _数据字典"],
      "business_keywords": ["数据字典", "字段说明", "表结构", "元数据", "字段含义"]
    },
    {
      "id": "daily_market_snapshot",
      "name": "日度市场快照",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取指定交易日全市场个股的关键指标截面数据，包括涨跌幅、成交量、换手率、振幅等，支持按行业过滤和按任意指标排序。用于每日涨幅榜、跌幅榜、放量榜等截面排名查询。",
      "business_meaning": "反映某一交易日全市场个股的表现分布和排名，是选股和异动筛查的基础。",
      "source_tables": ["kline_daily", "stocks"],
      "grain": "stock, day",
      "sql_template_ref": "sql/daily_market_snapshot.sql",
      "parameters": [
        {"name": "date", "type": "text", "required": true, "description": "交易日期，格式 YYYY-MM-DD"},
        {"name": "industry", "type": "text", "required": false, "description": "行业过滤，模糊匹配 stocks.industry 字段"},
        {"name": "sort_by", "type": "text", "required": false, "description": "排序方式：pct_change_desc(涨幅榜)/pct_change_asc(跌幅榜)/volume_desc(成交量)/turnover_desc(换手率)/amount_desc(成交额)/amplitude_desc(振幅)。默认 pct_change_desc。"},
        {"name": "limit_count", "type": "integer", "required": false, "description": "返回条数，默认 100"}
      ],
      "filters": {"optional": ["industry", "sort_by", "limit_count"]},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "name", "type": "text", "description": "股票简称"},
        {"name": "industry", "type": "text", "description": "申万三级行业分类"},
        {"name": "close", "type": "number", "description": "收盘价（元）"},
        {"name": "pct_change", "type": "number", "description": "涨跌幅（%），已复权"},
        {"name": "volume", "type": "number", "description": "成交量（股）"},
        {"name": "amount", "type": "number", "description": "成交额（元）"},
        {"name": "turnover", "type": "number", "description": "换手率（%）"},
        {"name": "high", "type": "number", "description": "最高价（元）"},
        {"name": "low", "type": "number", "description": "最低价（元）"},
        {"name": "open", "type": "number", "description": "开盘价（元）"},
        {"name": "amplitude", "type": "number", "description": "振幅（%），(高-低)/收盘价*100"}
      ],
      "fact_interpretation_template": "{{date}}，{{name}}（{{code}}）收盘{{close}}元，涨跌幅{{pct_change}}%，成交量{{volume}}股，换手率{{turnover}}%，振幅{{amplitude}}%。",
      "assumptions": ["仅聚合 is_active=1 的在市股票。", "date 参数为必填，默认不做日期推断，需从用户问题或数据库最新交易日中确认。"],
      "validation_queries": ["SELECT COUNT(*) FROM kline_daily WHERE date = (SELECT MAX(date) FROM kline_daily)"],
      "business_keywords": ["市场快照", "涨跌幅", "涨幅榜", "跌幅榜", "换手率", "振幅", "截面数据", "全市场"]
    },
    {
      "id": "daily_kline",
      "name": "日K线行情",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取A股股票的每日K线数据，包括开高低收、成交量额、换手率和涨跌幅。是技术分析最核心的数据源（90%查询依赖此表）。",
      "business_meaning": "反映个股每日的价格运动、成交活跃度和涨跌幅度。",
      "source_tables": ["kline_daily"],
      "grain": "stock, day",
      "sql_template_ref": "sql/daily_kline.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 600519"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期，格式 YYYY-MM-DD。不传则默认最近20个交易日。"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期，格式 YYYY-MM-DD。不传则默认今天。"}
      ],
      "filters": {"optional": ["pct_change (涨跌幅阈值过滤)", "volume (成交量阈值过滤)"]},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "open", "type": "number", "description": "开盘价（元）"},
        {"name": "high", "type": "number", "description": "最高价（元）"},
        {"name": "low", "type": "number", "description": "最低价（元）"},
        {"name": "close", "type": "number", "description": "收盘价（元）"},
        {"name": "volume", "type": "number", "description": "成交量（股）"},
        {"name": "amount", "type": "number", "description": "成交额（元）"},
        {"name": "turnover", "type": "number", "description": "换手率（%）"},
        {"name": "pct_change", "type": "number", "description": "涨跌幅（%），已做复权处理"}
      ],
      "fact_interpretation_template": "{{date}}，{{code}} 开盘{{open}}元，收盘{{close}}元，涨跌幅{{pct_change}}%，成交量{{volume}}股，换手率{{turnover}}%。",
      "assumptions": ["pct_change 已做复权处理，可直接使用。", "volume 单位为股，amount 单位为元。", "数据覆盖 1992-03-27 至 2026-06-02，约38万行，覆盖约5208只股票。"],
      "validation_queries": ["SELECT COUNT(*) FROM kline_daily WHERE code = '600519'", "SELECT MIN(date), MAX(date), COUNT(DISTINCT code) FROM kline_daily"],
      "business_keywords": ["日K线", "日线", "K线", "行情", "OHLCV", "收盘价", "涨跌幅", "换手率", "成交量", "走势"]
    },
    {
      "id": "weekly_kline",
      "name": "周K线行情",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取A股股票的周级别K线数据，用于中周期趋势分析和周线级别策略回测。date 字段为每周最后一个交易日的日期。",
      "business_meaning": "过滤日线噪音，反映个股中周期价格趋势。",
      "source_tables": ["kline_weekly"],
      "grain": "stock, week",
      "sql_template_ref": "sql/weekly_kline.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 600519"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期。不传则默认最近52周。"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期。不传则默认今天。"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "周结束日期"},
        {"name": "open", "type": "number", "description": "周开盘价（元）"},
        {"name": "high", "type": "number", "description": "周最高价（元）"},
        {"name": "low", "type": "number", "description": "周最低价（元）"},
        {"name": "close", "type": "number", "description": "周收盘价（元）"},
        {"name": "volume", "type": "number", "description": "周成交量（股）"},
        {"name": "amount", "type": "number", "description": "周成交额（元）"}
      ],
      "fact_interpretation_template": "{{date}} 当周，{{code}} 开盘{{open}}元，收盘{{close}}元，周成交量{{volume}}股。",
      "assumptions": ["周K线不包含换手率和涨跌幅字段，如需这些指标需从日K线聚合计算。", "数据约7.7万行，覆盖1992年至今。"],
      "validation_queries": ["SELECT COUNT(*) FROM kline_weekly WHERE code = '000001'", "SELECT MIN(date), MAX(date), COUNT(DISTINCT code) FROM kline_weekly"],
      "business_keywords": ["周K线", "周线", "中周期", "周趋势", "周行情"]
    },
    {
      "id": "monthly_kline",
      "name": "月K线行情",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取A股股票的月级别K线数据，用于长周期趋势分析和月线级别策略回测。date 字段为每月最后一个交易日的日期。",
      "business_meaning": "反映个股长周期价格趋势和大级别支撑压力位。",
      "source_tables": ["kline_monthly"],
      "grain": "stock, month",
      "sql_template_ref": "sql/monthly_kline.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 600519"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期。不传则默认最近24个月。"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期。不传则默认今天。"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "月结束日期"},
        {"name": "open", "type": "number", "description": "月开盘价（元）"},
        {"name": "high", "type": "number", "description": "月最高价（元）"},
        {"name": "low", "type": "number", "description": "月最低价（元）"},
        {"name": "close", "type": "number", "description": "月收盘价（元）"},
        {"name": "volume", "type": "number", "description": "月成交量（股）"},
        {"name": "amount", "type": "number", "description": "月成交额（元）"}
      ],
      "fact_interpretation_template": "{{date}} 当月，{{code}} 开盘{{open}}元，收盘{{close}}元，月成交量{{volume}}股。",
      "assumptions": ["月K线不包含换手率和涨跌幅字段。", "数据约1.85万行，数据量最小，查询效率高。"],
      "validation_queries": ["SELECT COUNT(*) FROM kline_monthly WHERE code = '000001'", "SELECT MIN(date), MAX(date), COUNT(DISTINCT code) FROM kline_monthly"],
      "business_keywords": ["月K线", "月线", "长周期", "月趋势", "月行情", "大周期"]
    },
    {
      "id": "stock_full_kline_history",
      "name": "个股全量历史日K线",
      "entity_type": "atomic",
      "version": 1,
      "description": "获取某只股票从上市至今的全部日K线数据（按日期升序），不设默认时间范围限制。专用于历史回测、事件研究和深度统计分析场景，与 daily_kline（默认近20日）互补。",
      "business_meaning": "提供个股全生命周期日线数据，支撑需要长历史窗口的量化分析（如滚动回撤、牛熊周期识别）。",
      "source_tables": ["kline_daily"],
      "grain": "stock, day",
      "sql_template_ref": "sql/stock_full_kline_history.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 603993"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期。不传则从上市首日开始。"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期。不传则到最新交易日。"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "open", "type": "number", "description": "开盘价（元）"},
        {"name": "high", "type": "number", "description": "最高价（元）"},
        {"name": "low", "type": "number", "description": "最低价（元）"},
        {"name": "close", "type": "number", "description": "收盘价（元）"},
        {"name": "volume", "type": "number", "description": "成交量（股）"},
        {"name": "amount", "type": "number", "description": "成交额（元）"},
        {"name": "turnover", "type": "number", "description": "换手率（%）"},
        {"name": "pct_change", "type": "number", "description": "涨跌幅（%），已复权"}
      ],
      "fact_interpretation_template": "{{code}} 从{{first_date}}至{{last_date}}共{{row_count}}个交易日，历史最高收盘价{{max_close}}元，最低收盘价{{min_close}}元。",
      "assumptions": [
        "默认 LIMIT 5000，上市超过 20 年的股票可能被截断（A股交易日在 250*20=5000 以内，实际够用）。",
        "与 daily_kline 的区别：无默认时间范围限制，默认按日期升序（便于窗口计算），默认 LIMIT 更大。",
        "返回数据可能较多，仅用于需要全量历史的分析场景，日常趋势查询请用 daily_kline。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM kline_daily WHERE code = '603993'", "SELECT MIN(date), MAX(date), COUNT(*) FROM kline_daily WHERE code = '603993'"],
      "business_keywords": ["全量历史", "日K线历史", "全生命周期", "回测", "事件研究", "深度分析", "滚动回撤"]
    },
    {
      "id": "stock_indicator_value",
      "name": "技术指标值",
      "entity_type": "atomic",
      "version": 1,
      "description": "查询某只股票在某个交易日某个技术指标的计算结果，如 RSI、MACD、KDJ 等。支持按指标名称和日期过滤。",
      "business_meaning": "提供量化技术指标的数值结果，是信号生成的前置数据。",
      "source_tables": ["indicators"],
      "grain": "stock, day, indicator",
      "sql_template_ref": "sql/stock_indicator_value.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 600519"},
        {"name": "indicator_name", "type": "text", "required": false, "description": "指标名称，如 rsi_14, macd, kdj_k。不传则返回所有指标。"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期。不传则默认最近20个交易日。"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期。不传则默认今天。"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "indicator_name", "type": "text", "description": "指标名称"},
        {"name": "value", "type": "number", "description": "指标数值"}
      ],
      "fact_interpretation_template": "{{date}}，{{code}} 的 {{indicator_name}} 指标值为 {{value}}。",
      "assumptions": [
        "当前 indicators 表无数据，处于设计阶段。指标计算任务上线后才会填充数据。",
        "复合主键为 (code, date, indicator_name)。",
        "indicator_name 为指标英文标识，如 rsi_14, macd, kdj_k 等。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM indicators", "SELECT DISTINCT indicator_name FROM indicators"],
      "business_keywords": ["技术指标", "RSI", "MACD", "KDJ", "技术指标值", "指标计算", "量化指标"]
    },
    {
      "id": "stock_signal",
      "name": "交易信号",
      "entity_type": "atomic",
      "version": 1,
      "description": "查询股票的四层交易信号（L1基础→L2复合→L3交易体系→L4市场环境），每条信号包含评分（-2到+2）、原始指标值和通俗中文解释。",
      "business_meaning": "提供多维度的买卖信号评分，是综合评分的基础输入。",
      "source_tables": ["signals"],
      "grain": "stock, day, layer, dimension, indicator, period",
      "sql_template_ref": "sql/stock_signal.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": true, "description": "股票代码，如 600519"},
        {"name": "layer", "type": "text", "required": false, "description": "信号层级过滤：L1=基础, L2=复合模式, L3=交易体系, L4=市场环境"},
        {"name": "dimension", "type": "text", "required": false, "description": "维度过滤：trend, momentum, volume_price 等"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期"}
      ],
      "filters": {"optional": ["indicator", "period"]},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "layer", "type": "text", "description": "信号层级"},
        {"name": "dimension", "type": "text", "description": "信号维度"},
        {"name": "indicator", "type": "text", "description": "指标来源"},
        {"name": "period", "type": "text", "description": "周期：daily, weekly, monthly"},
        {"name": "score", "type": "integer", "description": "信号评分：-2, -1, 0, +1, +2"},
        {"name": "value", "type": "number", "description": "原始指标值"},
        {"name": "reason", "type": "text", "description": "信号的通俗中文解释"}
      ],
      "fact_interpretation_template": "{{date}}，{{code}} 的{{layer}}-{{dimension}}维度（{{indicator}}, {{period}}）信号评分为{{score}}，原因：{{reason}}。",
      "assumptions": [
        "当前 signals 表无数据，处于设计阶段。信号计算任务上线后才会填充数据。",
        "六字段复合主键：(code, date, layer, dimension, indicator, period)。",
        "score 取值 -2（强卖）到 +2（强买）。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM signals", "SELECT DISTINCT layer, dimension FROM signals ORDER BY layer, dimension"],
      "business_keywords": ["交易信号", "买卖信号", "L1/L2/L3/L4", "信号评分", "评分", "多维度", "信号查询"]
    },
    {
      "id": "market_environment",
      "name": "市场环境状态",
      "entity_type": "atomic",
      "version": 1,
      "description": "查询每日大盘的市场状态（牛市/熊市/震荡），包含信号可信度、异常类型和大盘指标。每天仅一条记录。",
      "business_meaning": "判断整体市场牛熊状态，用于调整个股信号可信度和风控。",
      "source_tables": ["market_regime"],
      "grain": "day",
      "sql_template_ref": "sql/market_environment.sql",
      "parameters": [
        {"name": "date", "type": "text", "required": false, "description": "交易日期，格式 YYYY-MM-DD。不传则返回最近30天。"},
        {"name": "start_date", "type": "text", "required": false, "description": "起始日期"},
        {"name": "end_date", "type": "text", "required": false, "description": "结束日期"}
      ],
      "filters": {"optional": ["regime", "anomaly_type"]},
      "output_schema": [
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "regime", "type": "text", "description": "市场状态：strong_bull, bull, sideways, bear, extreme_bear"},
        {"name": "confidence", "type": "number", "description": "信号可信度 0~1"},
        {"name": "anomaly_type", "type": "text", "description": "异常类型：none, macro_event, volume_spike, volatility_spike"},
        {"name": "index_close", "type": "number", "description": "大盘指数收盘价"},
        {"name": "index_pct_change", "type": "number", "description": "大盘涨跌幅（%）"},
        {"name": "market_breadth", "type": "number", "description": "上涨股票占比（0~1）"},
        {"name": "notes", "type": "text", "description": "备注说明"}
      ],
      "fact_interpretation_template": "{{date}} 市场状态为{{regime}}，大盘指数{{index_close}}（{{index_pct_change}}%），上涨股票占比{{market_breadth}}，异常类型：{{anomaly_type}}。",
      "assumptions": [
        "当前 market_regime 表无数据，处于设计阶段。",
        "date 为单字段主键，每天只有一条记录。",
        "regime 五档状态：strong_bull > bull > sideways > bear > extreme_bear。",
        "market_breadth 为上涨股票占比，0~1之间。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM market_regime", "SELECT DISTINCT regime FROM market_regime"],
      "business_keywords": ["市场环境", "大盘", "牛熊市", "市场状态", "市场宽度", "涨跌比", "市场异常"]
    },
    {
      "id": "composite_score_detail",
      "name": "综合评分明细",
      "entity_type": "atomic",
      "version": 1,
      "description": "查询股票的综合评级结果，汇总 L1~L4 所有信号得到最终评分（total_score）和买卖等级（level），包含各层/维度/体系得分明细和风险提示。",
      "business_meaning": "提供个股的综合技术面评分和最终买卖建议，是投资决策的核心参考。",
      "source_tables": ["composite_scores"],
      "grain": "stock, day",
      "sql_template_ref": "sql/composite_score_detail.sql",
      "parameters": [
        {"name": "code", "type": "text", "required": false, "description": "股票代码。不传则查询全部股票。"},
        {"name": "date", "type": "text", "required": false, "description": "交易日期。不传则默认最近一个交易日。"},
        {"name": "level", "type": "text", "required": false, "description": "评级过滤：strong_buy, buy, neutral, sell, strong_sell"}
      ],
      "filters": {"optional": ["total_score (范围过滤)", "confidence (阈值过滤)"]},
      "output_schema": [
        {"name": "code", "type": "text", "description": "股票代码"},
        {"name": "date", "type": "text", "description": "交易日期"},
        {"name": "total_score", "type": "number", "description": "综合评分（加权汇总）"},
        {"name": "level", "type": "text", "description": "评级：strong_buy, buy, neutral, sell, strong_sell"},
        {"name": "confidence", "type": "number", "description": "信号可信度，0~1，市场异常时降低"},
        {"name": "layer_scores", "type": "text", "description": "JSON：各层得分明细，如 {\"L1\": 0.8, \"L2\": 0.7, \"L3\": 1.0, \"L4\": 0.75}"},
        {"name": "dimension_scores", "type": "text", "description": "JSON：各维度得分，如 {\"trend\": 0.9, \"momentum\": 0.8, \"volume_price\": 0.7}"},
        {"name": "system_scores", "type": "text", "description": "JSON：各交易体系得分，如 {\"turtle\": 0.8, \"chanlun\": 0.7, \"wave\": 0.9}"},
        {"name": "risk_warnings", "type": "text", "description": "JSON：风险提示列表"}
      ],
      "fact_interpretation_template": "{{date}}，{{code}} 综合评分{{total_score}}，评级{{level}}，可信度{{confidence}}。风险提示：{{risk_warnings}}。",
      "assumptions": [
        "当前 composite_scores 表无数据，处于设计阶段。",
        "level 五档评级：strong_buy > buy > neutral > sell > strong_sell。",
        "confidence 在市场异常时降低。",
        "layer_scores/dimension_scores/system_scores/risk_warnings 为 JSON 字符串格式，使用时需反序列化。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM composite_scores", "SELECT DISTINCT level FROM composite_scores"],
      "business_keywords": ["综合评分", "评级", "买卖评级", "得分明细", "风险提示", "综合评估", "总分"]
    },
    {
      "id": "data_update_status",
      "name": "数据更新状态",
      "entity_type": "atomic",
      "version": 1,
      "description": "查询数据更新任务的执行记录，包括任务类型、执行状态、更新数量和耗时，用于监控数据管道健康度。",
      "business_meaning": "确认数据是否正常更新，排查数据缺失或延迟问题。",
      "source_tables": ["update_log"],
      "grain": "task_execution",
      "sql_template_ref": "sql/data_update_status.sql",
      "parameters": [
        {"name": "task", "type": "text", "required": false, "description": "任务类型：daily_update, full_download, indicator_calc。不传则查询全部。"},
        {"name": "status", "type": "text", "required": false, "description": "执行状态：running, completed, failed"},
        {"name": "limit_count", "type": "integer", "required": false, "description": "返回条数，默认20"}
      ],
      "filters": {"optional": []},
      "output_schema": [
        {"name": "id", "type": "integer", "description": "自增主键"},
        {"name": "task", "type": "text", "description": "任务类型"},
        {"name": "status", "type": "text", "description": "执行状态：running, completed, failed"},
        {"name": "stocks_updated", "type": "integer", "description": "本次更新股票数量"},
        {"name": "started_at", "type": "text", "description": "任务开始时间"},
        {"name": "completed_at", "type": "text", "description": "任务完成时间"},
        {"name": "error_message", "type": "text", "description": "错误信息（仅失败时有效）"}
      ],
      "fact_interpretation_template": "第{{id}}次 {{task}} 任务状态为{{status}}，更新了{{stocks_updated}}只股票，耗时从{{started_at}}到{{completed_at}}。",
      "assumptions": [
        "当前 update_log 表无数据，处于设计阶段。",
        "error_message 仅在 status=failed 时有值。"
      ],
      "validation_queries": ["SELECT COUNT(*) FROM update_log", "SELECT task, status, COUNT(*) FROM update_log GROUP BY task, status"],
      "business_keywords": ["数据更新", "任务状态", "管道", "数据同步", "更新日志"]
    }
  ],
  "l1": [
    {
      "id": "stock_price_trend",
      "name": "股价趋势",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "描述个股在一段时间内的价格走势方向、强度和关键价位变化。基于日K线的开高低收数据，判断上涨、下跌或横盘趋势。",
      "depends_on": ["daily_kline"],
      "composition_type": "trend",
      "composition_rule": {
        "logic": "1. 计算指定时间段内的价格变化方向和幅度（(close_end - close_start) / close_start）。\n2. 识别趋势类型：上升趋势（连续高点和低点上移）、下降趋势（连续高点和低点下移）、横盘震荡（高低点在一定范围内波动）。\n3. 计算区间振幅（(high_max - low_min) / close_start）和波动率。\n4. 标注近期关键支撑位和压力位。",
        "explanation": "通过日K线的收盘价序列判断方向，结合高低点结构识别趋势状态，量化振幅和波动程度。"
      },
      "business_keywords": ["股价趋势", "涨跌走势", "价格方向", "趋势判断", "技术面走势", "行情走势"],
      "example_queries": ["贵州茅台最近一周走势怎么样？", "最近一个月股价是涨了还是跌了？", "哪些股票处于上升趋势？", "这只股票最近波动大吗？"],
      "interpretation_rule": "结合涨跌幅、趋势方向和波动率综合描述价格表现。趋势方向使用\"上升/下降/横盘\"，强度使用\"强势/温和/弱势\"。",
      "answer_template": "{{date_range}}内，{{code}} {{name}} 股价呈{{trend_direction}}趋势，从{{start_price}}元变动至{{end_price}}元（{{pct_change}}%），区间振幅{{amplitude}}%。{{#key_levels}}关键支撑位{{support}}，压力位{{resistance}}。{{/key_levels}}",
      "assumptions": ["趋势判断基于收盘价序列的连续比较，未使用均线系统。如需均线趋势，需额外定义。", "支撑位和压力位基于区间最高价和最低价，非严格的技术分析定义。"],
      "validation_cases": [
        {"input": {"code": "600519", "date_range": "last_7_days"}, "expected": "trend_direction in (\"上升\", \"下降\", \"横盘\")"},
        {"input": {"code": "000001", "date_range": "last_30_days"}, "expected": "pct_change is number, amplitude is number"}
      ]
    },
    {
      "id": "stock_volume_analysis",
      "name": "成交量分析",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "分析个股的成交量变化、换手率水平和量价配合关系，判断资金进出活跃度和量价背离风险。",
      "depends_on": ["daily_kline"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 计算指定时间段内的日均成交量、日均成交额和日均换手率。\n2. 对比前一周期的成交量变化（放量/缩量/持平）。\n3. 判断量价配合关系：价涨量增（健康）、价涨量缩（背离）、价跌量增（恐慌/承接）、价跌量缩（冷清）。\n4. 计算换手率分位：相比历史水平的活跃度位置。",
        "explanation": "将价格变动和成交量/换手率组合分析，判断资金行为和量价关系是否健康。"
      },
      "business_keywords": ["成交量", "换手率", "放量", "缩量", "量价关系", "资金流向", "成交活跃度"],
      "example_queries": ["最近这只股票成交量有没有放大？", "换手率最近什么水平？", "今天哪些股票放量上涨？", "有没有量价背离的股票？"],
      "interpretation_rule": "从成交绝对量、相对变化和量价配合三个维度描述。放量/缩量以1.5倍/0.67倍为阈值。量价关系分为\"量价配合/量价背离/量价正常\"。",
      "answer_template": "{{date_range}}内，{{code}} 日均成交量{{avg_volume}}股（较前期{{volume_change_desc}}），日均换手率{{avg_turnover}}%，量价关系：{{volume_price_relation}}。",
      "assumptions": ["放量/缩量的阈值设定为成交量变化超过1.5倍/不足0.67倍，可能需要根据个股历史波动调整。", "量价关系判断基于价格和成交量同向/反向的简化规则，不考虑主力资金对倒等复杂情况。"],
      "validation_cases": [
        {"input": {"code": "600519", "date_range": "last_7_days"}, "expected": "avg_volume > 0, avg_turnover >= 0"},
        {"input": {"code": "000001", "date_range": "last_30_days"}, "expected": "volume_change_desc in (\"放量\", \"缩量\", \"持平\")"}
      ]
    },
    {
      "id": "multi_period_alignment",
      "name": "多周期共振",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "对比日线、周线、月线三个时间周期的价格趋势方向，判断多周期是否形成共振（同向）或背离（反向），用于确认趋势的可靠性。",
      "depends_on": ["daily_kline", "weekly_kline", "monthly_kline"],
      "composition_type": "trend",
      "composition_rule": {
        "logic": "1. 分别计算日线（近20日）、周线（近10周）、月线（近6月）的收盘价趋势方向和变化幅度。\n2. 判断三周期方向一致性：三线共振向上（强信号）、二上一下（偏强）、三线共振向下（弱信号）、二下一上（偏弱）。\n3. 如果大周期（月线）向上而小周期（日线）回调，识别为\"大趋势中的正常回调\"。\n4. 如果大周期向下而小周期反弹，识别为\"熊市反弹，追高风险大\"。",
        "explanation": "多周期分析是技术分析中确认趋势可靠性的核心方法，大周期定方向，小周期找买卖点。"
      },
      "business_keywords": ["多周期", "日线周线月线", "共振", "趋势确认", "大周期", "小周期", "周期背离"],
      "example_queries": ["日线周线月线趋势一致吗？", "哪些股票日周月三线共振向上？", "日线回调但周线还是上升趋势吗？"],
      "interpretation_rule": "三周期全部向上为\"强势共振\"，全部向下为\"弱势共振\"，混合情况根据大级别方向给出判断。",
      "answer_template": "{{code}} 多周期趋势：日线{{daily_trend}}、周线{{weekly_trend}}、月线{{monthly_trend}}。{{alignment_judgment}}。",
      "assumptions": ["日线趋势基于近20个交易日，周线基于近10周，月线基于近6个月。周期长度可根据分析需要调整。", "趋势判断基于收盘价序列，不涉及均线交叉等技术指标。"],
      "validation_cases": [
        {"input": {"code": "600519"}, "expected": "daily_trend in (\"上升\", \"下降\", \"横盘\"), monthly_trend in (\"上升\", \"下降\", \"横盘\")"},
        {"input": {"code": "000001"}, "expected": "alignment_judgment is string and length > 0"}
      ]
    },
    {
      "id": "stock_signal_summary",
      "name": "信号汇总",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "将个股的四层交易信号（L1基础→L2复合→L3交易体系→L4市场环境）按维度和层级进行聚合汇总，提供信号强弱分布和方向判断。",
      "depends_on": ["stock_signal"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 按 layer 分组统计各层的信号总数、正信号数（score>0）、负信号数（score<0）、中性信号数（score=0）。\n2. 按 dimension 分组统计各维度的总得分（SUM(score)）和信号数量。\n3. 计算信号一致率：同一层内正/负信号的比例，判断是否存在矛盾信号。\n4. 提取得分最高（+2）和最低（-2）的信号及原因。",
        "explanation": "将分散的原子信号聚合成层次化视图，从层级和维度两个角度理解信号的强度和一致性。"
      },
      "business_keywords": ["交易信号", "买卖信号", "信号强度", "L1信号", "L2信号", "L3信号", "信号一致", "信号矛盾"],
      "example_queries": ["这只股票最近有什么交易信号？", "哪些信号在提示买入？", "信号之间有矛盾吗？", "哪一层信号最强？"],
      "interpretation_rule": "各层正信号占比>60%为偏多，负信号占比>60%为偏空，否则为中性分歧。维度得分>该维度信号数*50%为偏强。",
      "answer_template": "{{date_range}}内，{{code}} 共产生{{total_signals}}条信号。L1层{{l1_positive}}正/{{l1_total}}总，L2层{{l2_positive}}正/{{l2_total}}总。综合信号偏向：{{signal_bias}}。最强信号：{{top_signals}}。",
      "assumptions": ["signals 表当前无数据，处于设计阶段。此概念的数据可用性依赖于信号计算任务上线。", "信号评分范围为 -2 到 +2，0 表示中性无方向信号。"],
      "validation_cases": [
        {"input": {"code": "600519", "date_range": "last_7_days"}, "expected": "total_signals >= 0, signal_bias in (\"偏多\", \"偏空\", \"中性分歧\")"},
        {"input": {"code": "000001"}, "expected": "l1_total >= 0"}
      ]
    },
    {
      "id": "stock_indicator_profile",
      "name": "技术指标画像",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "综合个股的多个技术指标计算结果，形成技术指标画像，判断各指标当前处于超买/超卖/中性区间，以及指标间的相互印证或背离。",
      "depends_on": ["stock_indicator_value"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 对 RSI 类指标：>70 超买，<30 超卖，30-70 中性。\n2. 对 MACD 类指标：DIF>DEA 且 MACD柱>0 为多头，反之为空头。\n3. 对 KDJ 类指标：K>80 超买，K<20 超卖。\n4. 统计超买指标数、超卖指标数、多头指标数、空头指标数。\n5. 判断指标间共振或背离：多个趋势指标同时指向同一方向为共振；价格新高但指标未新高为顶背离。",
        "explanation": "将多个技术指标的读数映射到统一的判断区间，形成指标维度的综合画像。"
      },
      "business_keywords": ["技术指标", "RSI", "MACD", "KDJ", "超买超卖", "指标背离", "指标共振"],
      "example_queries": ["这只股票的RSI现在多少？超买了吗？", "MACD现在是多头还是空头？", "技术指标整体偏多还是偏空？", "有没有顶背离的信号？"],
      "interpretation_rule": "多数指标指向同一方向为强信号，指标分歧为弱信号。超买/超卖需要结合趋势方向判断（趋势中可持续超买/超卖）。",
      "answer_template": "{{code}} 技术指标画像：RSI {{rsi_value}}（{{rsi_status}}），MACD {{macd_status}}。整体偏{{indicator_bias}}，{{divergence_warning}}。",
      "assumptions": ["indicators 表当前无数据，处于设计阶段。此概念的数据可用性依赖于指标计算任务上线。", "超买/超卖/多空区间的阈值使用通用标准值，可能因个股特性和市场环境需要调整。", "indicator_name 的实际枚举值需要待数据填充后确认。"],
      "validation_cases": [
        {"input": {"code": "600519", "indicator_names": ["rsi_14", "macd"]}, "expected": "indicator_bias in (\"偏多\", \"偏空\", \"中性\")"},
        {"input": {"code": "000001"}, "expected": "rsi_status in (\"超买\", \"超卖\", \"中性\", \"未知\")"}
      ]
    },
    {
      "id": "market_trend_status",
      "name": "市场趋势状态",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "描述整体市场的运行状态，包括牛熊判断、市场宽度（上涨股票占比）、指数涨跌、异常事件和信号可信度调整。",
      "depends_on": ["market_environment"],
      "composition_type": "trend",
      "composition_rule": {
        "logic": "1. 读取当前市场 regime 状态（strong_bull/bull/sideways/bear/extreme_bear）。\n2. 结合 market_breadth（上涨占比）验证 regime 判断：bull环境下上涨占比应>50%。\n3. 检测 anomaly_type 是否为异常事件（macro_event/volume_spike/volatility_spike）。\n4. 输出信号可信度乘数：confidence 值直接影响个股信号的权重。",
        "explanation": "市场环境是技术分析的风控维度，帮助判断当前是否适合交易以及信号可信度。"
      },
      "business_keywords": ["市场环境", "大盘", "牛熊市", "市场状态", "市场宽度", "涨跌比", "市场异常"],
      "example_queries": ["现在市场是牛市还是熊市？", "今天大盘涨了多少？", "最近市场有异常吗？", "上涨的股票多还是下跌的多？"],
      "interpretation_rule": "regime 映射为中文描述（strong_bull→强势牛市，bull→牛市，sideways→震荡，bear→熊市，extreme_bear→极端熊市）。confidence<0.5 提示信号可信度降低。",
      "answer_template": "当前市场处于{{regime_cn}}状态，大盘指数{{index_close}}（{{index_pct_change}}%），上涨股票占比{{market_breadth_pct}}%。{{#anomaly}}异常事件：{{anomaly_type}}。{{/anomaly}}信号可信度：{{confidence_level}}。",
      "assumptions": ["market_regime 表当前无数据，处于设计阶段。", "regime 的分类阈值和计算逻辑由上游任务决定。", "confidence 降低的机制（在市场异常时降低）在设计文档中有说明，但具体降幅未定义。"],
      "validation_cases": [
        {"input": {"date": "2026-06-02"}, "expected": "regime_cn in (\"强势牛市\", \"牛市\", \"震荡\", \"熊市\", \"极端熊市\")"},
        {"input": {}, "expected": "market_breadth >= 0 and market_breadth <= 1"}
      ]
    },
    {
      "id": "industry_performance",
      "name": "行业表现",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "按行业（申万三级分类）聚合个股的涨跌幅、成交量等数据，对比各行业的相对强弱，识别领涨/领跌行业。",
      "depends_on": ["daily_kline", "stock_basic_info"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. JOIN stocks 和 kline_daily，按 industry 分组聚合。\n2. 计算每个行业的平均涨跌幅、涨跌比（上涨股票数/总股票数）、总成交额。\n3. 按平均涨跌幅排序，识别 Top N 领涨行业和 Bottom N 领跌行业。\n4. 对比当前行业表现与上一周期的变化，判断行业动量。",
        "explanation": "行业维度的聚合分析，帮助判断资金在行业间的流动方向。"
      },
      "business_keywords": ["行业", "板块", "申万行业", "领涨", "领跌", "行业轮动", "板块表现"],
      "example_queries": ["今天哪些行业涨得最好？", "食品饮料行业最近表现怎么样？", "最近资金在往哪些行业流？", "各行业的涨跌比如何？"],
      "interpretation_rule": "行业平均涨幅>2%为强势，<-2%为弱势。行业上涨股票占比>70%为普涨，<30%为普跌。",
      "answer_template": "{{date}}，表现最好的行业是{{top_industries}}，领跌行业是{{bottom_industries}}。{{#query_industry}}{{industry_name}}行业平均涨跌幅{{avg_pct}}%，上涨{{up_count}}家/共{{total_count}}家。{{/query_industry}}",
      "assumptions": ["industry/sector 字段存储的是申万三级行业编码+名称组合文本（如 J66货币金融服务），非标准化编码，聚合时需注意空格和编码格式。", "行业分类以 stocks 表的 industry 字段为准，当前与 sector 字段值相同。", "仅聚合 is_active=1 的在市股票。"],
      "validation_cases": [
        {"input": {"date": "2024-01-02"}, "expected": "industry count > 0, each industry has avg_pct"},
        {"input": {"industry": "J66货币金融服务", "date": "2024-01-02"}, "expected": "avg_pct is number, total_count > 0"}
      ]
    },
    {
      "id": "stock_ranking",
      "name": "个股截面排名",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "对指定交易日全市场个股按涨跌幅、成交量、换手率、成交额或振幅进行截面排名，返回 Top N 或 Bottom N 股票列表。用于每日强势股/弱势股筛选、活跃股识别和高振幅异动排查。",
      "depends_on": ["daily_market_snapshot"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 使用 daily_market_snapshot 获取指定日期的全市场个股截面数据。\n2. 按用户指定的排序指标（涨跌幅/成交量/换手率/成交额/振幅）升序或降序排列。\n3. 可选按行业过滤，仅看某个行业内的排名。\n4. 返回 Top N（默认 20），附代码、名称、行业和排序指标值。\n5. 对排名结果按分位打标签：前 5% 为\"极度强势\"，后 5% 为\"极度弱势\"。",
        "explanation": "个股截面排名是最基础的选股筛选器，通过单一指标排序快速定位目标股票池。"
      },
      "business_keywords": ["排名", "涨幅榜", "跌幅榜", "放量", "换手率排名", "振幅排名", "强势股", "弱势股", "Top N", "涨幅最大", "跌得最多", "成交最大"],
      "example_queries": ["今天涨得最好的 20 只股票有哪些？", "今天跌得最多的 10 只股票？", "最近一个交易日换手率最高的股票？", "食品饮料行业今天涨幅排名前 10？", "今天哪些股票振幅最大？"],
      "interpretation_rule": "涨幅榜标注\"强势\"，跌幅榜标注\"弱势\"。结合 rank 位置给出排名解读。如查询含行业过滤，标注\"在{{industry}}行业内\"。",
      "answer_template": "{{date}}，{{#industry}}在{{industry}}行业中，{{/industry}}表现{{rank_direction}}的{{limit_count}}只股票：{{#stocks}}{{rank}}. {{name}}（{{code}}）— {{metric_label}} {{metric_value}}。{{/stocks}}",
      "assumptions": ["排名基于单一交易日的截面数据，不反映趋势和持续性。", "日期参数为必填，需从用户问题中确认（如'今天'→查最新交易日）。", "振幅超过 15% 为异常波动，需结合 stock_anomaly_alert 做综合判断。"],
      "validation_cases": [
        {"input": {"date": "2026-06-02", "sort_by": "pct_change_desc", "limit_count": 20}, "expected": "stocks is list, length = 20, sorted by pct_change descending"},
        {"input": {"date": "2026-06-02", "sort_by": "pct_change_asc", "limit_count": 10}, "expected": "first stock has most negative pct_change"}
      ]
    },
    {
      "id": "stock_composite_score_overview",
      "name": "综合评分概览",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "查看个股的综合评分全貌，包括总分、评级、各层/各维度/各体系得分分解和风险提示，是综合评分明细的语义化包装。",
      "depends_on": ["composite_score_detail"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 读取 total_score 和 level，给出总体评价。\n2. 解析 layer_scores JSON，展示 L1-L4 各层的得分贡献。\n3. 解析 dimension_scores JSON，展示 trend/momentum/volume_price 等维度的强弱。\n4. 解析 system_scores JSON，展示 turtle/chanlun/wave 等交易体系的信号一致性。\n5. 解析 risk_warnings JSON，列出需要关注的风险点。",
        "explanation": "将综合评分的 JSON 明细字段展开为结构化的多维度分析报告。"
      },
      "business_keywords": ["综合评分", "评级", "买卖评级", "得分明细", "风险提示", "综合评估"],
      "example_queries": ["贵州茅台的综合评分是多少？", "哪些股票评级是强烈买入？", "得分最高的股票是哪些？", "综合评分的构成是怎样的？"],
      "interpretation_rule": "level 映射为中文：strong_buy→强烈买入，buy→买入，neutral→中性，sell→卖出，strong_sell→强烈卖出。total_score 范围取决于上游权重，目前假设 0-5 分制。",
      "answer_template": "{{code}} {{name}} 综合评分{{total_score}}，评级：{{level_cn}}，可信度{{confidence}}。各层得分：{{layer_breakdown}}。最强维度：{{strongest_dimension}}。{{#risk_warnings}}风险提示：{{risk_list}}。{{/risk_warnings}}",
      "assumptions": ["composite_scores 表当前无数据，处于设计阶段。", "total_score 的取值范围和评级阈值由上游评分模型决定，目前假设为 0-5 分制。", "layer_scores/dimension_scores/system_scores JSON 的 key 枚举值需要待数据填充后确认。", "各交易体系的权重分配方案未在数据库文档中说明。"],
      "validation_cases": [
        {"input": {"code": "600519"}, "expected": "level_cn in (\"强烈买入\", \"买入\", \"中性\", \"卖出\", \"强烈卖出\")"},
        {"input": {}, "expected": "total_score is number"}
      ]
    },
    {
      "id": "stock_comparison",
      "name": "个股对比分析",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "对 2-5 只指定股票在选定时间段内的价格走势、成交量变化和波动特征进行并列对比，帮助判断相对强弱和差异性。",
      "depends_on": ["daily_kline"],
      "composition_type": "metric_group",
      "composition_rule": {
        "logic": "1. 对每只目标股票分别调用 daily_kline 获取指定时间段的日K线数据。\n2. 计算每只股票的区间涨跌幅、日均成交量、日均换手率和振幅。\n3. 并排对比各股票的上述指标，识别表现最优和最差的股票。\n4. 计算价格走势的同步性（如果两只股票走势高度相似，可能受同一板块/因子驱动）。",
        "explanation": "多股票并排对比是投资者选股决策前的常见需求，通过量化对比替代主观感受。"
      },
      "business_keywords": ["对比", "比较", "VS", "孰强孰弱", "选哪个", "并列比较", "横向对比"],
      "example_queries": ["茅台和五粮液最近一周走势对比？", "洛阳钼业和紫金矿业谁最近更强？", "对比一下工商银行和建设银行近一个月的表现？"],
      "interpretation_rule": "区间涨幅高且波动小的股票标记为\"相对强势\"。若两只股票走势方向高度一致（相关系数>0.8），提示\"可能受同一板块驱动\"。",
      "answer_template": "{{date_range}}内，对比{{stock_count}}只股票：{{#stocks}}{{name}}（{{code}}）涨跌幅{{pct_change}}%，日均换手率{{avg_turnover}}%，振幅{{amplitude}}%。{{/stocks}}{{#verdict}}综合来看，{{verdict}}。{{/verdict}}",
      "assumptions": ["对比股票数量限制为 2-5 只，过多则回答冗长且难以形成清晰结论。", "走势同步性判断基于涨跌幅序列的简化相关分析，非严格的统计检验。"],
      "validation_cases": [
        {"input": {"codes": ["600519", "000858"], "date_range": "last_7_days"}, "expected": "stocks is list, length = 2, each has pct_change and avg_turnover"},
        {"input": {"codes": ["603993", "601899"]}, "expected": "stocks is list, verdict is string"}
      ]
    },
    {
      "id": "stock_drawdown_events",
      "name": "历史回撤事件",
      "entity_type": "concept",
      "concept_layer": "L1_business_concept",
      "version": 1,
      "description": "识别个股历史上每一次\"股价从近 250 个交易日最高点回撤达到或超过指定阈值\"的事件，返回每次回撤的触发日期、触发价格、峰值价格、回撤幅度和持续天数。用于量化个股深度回撤的历史频率和严重程度。",
      "depends_on": ["stock_full_kline_history"],
      "composition_type": "exception_detection",
      "composition_rule": {
        "logic": "1. 获取该股全部历史日K线数据（按日期升序）。\n2. 使用窗口函数计算每个交易日的 250 日滚动最高收盘价：MAX(close) OVER (ROWS BETWEEN 249 PRECEDING AND CURRENT ROW)。\n3. 识别触发日：收盘价 ≤ 滚动最高价 × (1 - 回撤阈值)，默认阈值 25%。\n4. 将连续的触发日合并为同一事件，每个事件取第一个触发日作为事件起点。\n5. 对每个事件，记录：触发日期、触发价、250日峰值价、回撤幅度%、至今持续天数。\n6. 排除仍在进行中的最后一个事件（或标记为\"当前事件\"）。\n7. 参考 SQL 实现：\nWITH rolling AS (\n  SELECT date, close,\n    MAX(close) OVER (ORDER BY date ROWS BETWEEN 249 PRECEDING AND CURRENT ROW) AS peak_250d\n  FROM kline_daily WHERE code = 'XXXXXX'\n),\ntriggers AS (\n  SELECT *, close / peak_250d - 1 AS drawdown_pct,\n    LAG(close / peak_250d - 1) OVER (ORDER BY date) AS prev_drawdown_pct\n  FROM rolling\n)\nSELECT date, close AS trigger_price, peak_250d AS peak_price,\n  ROUND(drawdown_pct * 100, 2) AS drawdown_pct\nFROM triggers\nWHERE drawdown_pct <= -0.25 AND (prev_drawdown_pct > -0.25 OR prev_drawdown_pct IS NULL)\nORDER BY date",
        "explanation": "回撤事件识别是风险管理和持仓决策的量化基础，帮助投资者了解一只股票在极端不利情况下的历史表现模式。"
      },
      "business_keywords": ["回撤", "回调", "历史最大回撤", "深度调整", "高位回落", "被套", "浮亏", "抄底"],
      "example_queries": ["这只股票历史上从高点回撤超过25%出现过几次？", "每次深度回撤之后一般怎么走？", "现在这次回撤在历史上属于什么水平？", "历史上最大回撤是多少？"],
      "interpretation_rule": "回撤超过 25% 为\"深度回撤\"，超过 40% 为\"极端回撤\"。统计回撤发生的频率（年均次数）和平均回撤幅度，帮助判断当前回撤是否异常。",
      "answer_template": "{{code}} {{name}} 自上市以来共触发{{event_count}}次深度回撤事件（回撤≥{{threshold}}%）。最近一次：{{last_event_date}}，回撤{{last_drawdown_pct}}%。历史最大回撤：{{max_drawdown_pct}}%（{{max_drawdown_date}}）。{{#current_event}}当前正处于一次回撤事件中（触发于{{current_trigger_date}}）。{{/current_event}}",
      "assumptions": ["回撤阈值默认 25%，可通过参数调整。", "滚动窗口长度默认 250 个交易日（约一年），适合 A 股年度周期。", "连续触发日合并为同一事件，避免同一波下跌被重复计数。", "该概念需要 SQLite 窗口函数支持（SQLite 3.25+），本地环境已验证可用。"],
      "validation_cases": [
        {"input": {"code": "603993", "threshold": 0.25}, "expected": "event_count > 0, each event has trigger_date and drawdown_pct"},
        {"input": {"code": "600519"}, "expected": "max_drawdown_pct <= -25"}
      ]
    }
  ],
  "l2": [
    {
      "id": "stock_investment_rating",
      "name": "股票投资评级",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "综合股价趋势、技术信号和技术指标，对个股给出买入/持有/卖出的投资建议。适用于需要明确买卖方向的投资决策场景。",
      "depends_on": ["stock_price_trend", "stock_signal_summary", "stock_indicator_profile"],
      "source_atomic_entities": ["daily_kline", "stock_signal", "stock_indicator_value"],
      "composition_type": "health_score",
      "composition_rule": {
        "logic": "1. 趋势维度（weight 40%）：上升趋势 +2，横盘 0，下降趋势 -2。\n2. 信号维度（weight 35%）：信号偏多 +2，中性 0，偏空 -2。如有矛盾降低权重。\n3. 指标维度（weight 25%）：指标偏多 +2，中性 0，偏空 -2。如有超买/超卖叠加判断。\n4. 加权汇总：score >= 1.2 → 买入，0.4~1.2 → 持有，-0.4~0.4 → 观望，-1.2~-0.4 → 减仓，< -1.2 → 卖出。",
        "explanation": "多维度加权打分模型，趋势定方向，信号定时机，指标验强度。"
      },
      "business_keywords": ["投资评级", "买卖建议", "买入", "卖出", "持有", "加仓", "减仓", "操作建议"],
      "example_queries": ["贵州茅台现在可以买吗？", "哪些股票建议买入？", "这股票该不该卖？", "推荐几只可以持有的股票？"],
      "answer_template": "{{code}} {{name}} 投资评级：{{rating}}（加权得分{{weighted_score}}）。趋势{{trend_score_desc}}，信号{{signal_score_desc}}，指标{{indicator_score_desc}}。建议：{{recommendation}}。",
      "assumptions": ["三因子权重（40/35/25）为初始设定，需根据回测效果调整。", "评级阈值需要在实盘数据上校准。", "当前 signals 和 indicators 表无数据，此概念的完整评估需待数据填充后验证。"],
      "validation_cases": [
        {"input": {"code": "600519"}, "expected": "rating in (\"买入\", \"持有\", \"观望\", \"减仓\", \"卖出\")"},
        {"input": {"code": "000001"}, "expected": "weighted_score is number"}
      ]
    },
    {
      "id": "market_risk_assessment",
      "name": "市场风险评估",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "结合市场趋势状态和行业表现，评估当前整体市场的风险等级，判断是否适合积极交易、应降低仓位或避险。适用于风控和仓位管理决策。",
      "depends_on": ["market_trend_status", "industry_performance"],
      "source_atomic_entities": ["market_environment", "daily_kline", "stock_basic_info"],
      "composition_type": "health_score",
      "composition_rule": {
        "logic": "1. 市场状态风险系数：strong_bull→低风险(0.2)，bull→中低风险(0.4)，sideways→中风险(0.6)，bear→中高风险(0.8)，extreme_bear→高风险(1.0)。\n2. 市场宽度风险调整：上涨占比<30% 增加0.15，上涨占比>70% 减少0.1。\n3. 异常事件风险加成：macro_event +0.3，volatility_spike +0.2，volume_spike +0.1。\n4. 行业表现恶化风险：如领跌行业平均跌幅>5%，增加0.1。\n5. 最终风险等级：0-0.25→低风险，0.25-0.5→中低风险，0.5-0.65→中风险，0.65-0.8→中高风险，0.8-1.0→高风险。",
        "explanation": "层次化风险评估模型，从市场整体状态、宽度、异常事件和行业表现四个维度综合量化风险。"
      },
      "business_keywords": ["市场风险", "风控", "仓位管理", "风险等级", "避险", "可交易性", "市场环境评估"],
      "example_queries": ["现在市场风险大吗？", "当前适合买入吗？", "需要减仓避险吗？", "市场有没有系统性风险？"],
      "answer_template": "当前市场风险等级：{{risk_level}}（风险系数{{risk_score}}）。{{risk_factors}}。建议：{{risk_recommendation}}。",
      "assumptions": ["风险系数的量化模型为初始设计，各因子权重和阈值需要根据历史回撤数据校准。", "macro_event 的具体触发条件（如央行政策、地缘事件）未在数据库层定义，依赖上游 market_regime 计算。"],
      "validation_cases": [
        {"input": {}, "expected": "risk_level in (\"低风险\", \"中低风险\", \"中风险\", \"中高风险\", \"高风险\")"},
        {"input": {"date": "2026-06-02"}, "expected": "risk_score >= 0 and risk_score <= 1"}
      ]
    },
    {
      "id": "stock_anomaly_alert",
      "name": "股票异动预警",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "检测个股的异常价格波动和成交量异动，包括急涨急跌、巨量成交、量价背离等异常模式，生成预警信号。适用于风险监控和及时止损。",
      "depends_on": ["stock_price_trend", "stock_volume_analysis"],
      "source_atomic_entities": ["daily_kline"],
      "composition_type": "exception_detection",
      "composition_rule": {
        "logic": "1. 价格异常检测：当日涨跌幅>9%（急涨）或<-9%（急跌），或连续3日同向涨跌>15%。\n2. 成交量异常检测：当日成交量>20日均量的3倍（巨量），或<20日均量的0.3倍（地量）。\n3. 量价背离检测：价格新高但成交量萎缩（顶背离风险），或价格新低但成交量放大（底部放量机会/风险）。\n4. 振幅异常检测：当日振幅>15%（极端波动）。\n5. 综合判断：触发任一条即生成预警，多条触发为强预警。",
        "explanation": "基于统计学阈值的异常检测，识别需要关注的极端事件。"
      },
      "business_keywords": ["异动", "预警", "急涨", "急跌", "巨量", "天量", "地量", "量价背离", "异常波动", "风险提醒"],
      "example_queries": ["今天有哪些股票出现异动？", "有没有突然暴跌的股票？", "哪些股票成交量突然放大？", "有什么需要警惕的风险信号？"],
      "interpretation_rule": "触发异常类型和数量决定预警级别：1条为\"关注\"，2条为\"警惕\"，3条及以上为\"强预警\"。",
      "answer_template": "{{code}} {{name}} 触发异动预警（{{alert_level}}）：{{alert_reasons}}。最后一次异常发生在{{last_alert_date}}。",
      "assumptions": ["涨跌幅阈值（±9%）、成交量倍数（3x/0.3x）、振幅阈值（15%）为经验设定值，科创板/北交所等不同板块可能需要调整阈值。", "异常检测仅基于日K线数据，不涉及基本面信息。"],
      "validation_cases": [
        {"input": {"code": "600519", "date_range": "last_5_days"}, "expected": "alert_level in (\"无预警\", \"关注\", \"警惕\", \"强预警\")"},
        {"input": {"date": "2026-06-02"}, "expected": "alerts is list"}
      ]
    },
    {
      "id": "sector_rotation_signal",
      "name": "板块轮动信号",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "通过比较各行业近期和更早期的表现排名变化，识别行业动量的变化方向，判断资金在行业间的流动趋势，给出板块轮动方向建议。",
      "depends_on": ["industry_performance"],
      "source_atomic_entities": ["daily_kline", "stock_basic_info"],
      "composition_type": "trend",
      "composition_rule": {
        "logic": "1. 计算各行业近5日和近20日的平均涨跌幅排名。\n2. 比较两个排名：排名上升显著的行业为\"资金流入/转强\"，排名下降显著的为\"资金流出/转弱\"。\n3. 识别持续走强（近5日和近20日均为Top 5）和持续走弱（均为Bottom 5）的行业。\n4. 识别拐点行业：近5日排名较近20日提升超过10位（启动信号）或下降超过10位（见顶信号）。\n5. 输出：建议关注行业、建议回避行业、拐点行业。",
        "explanation": "基于行业排名的动量变化识别板块轮动，比单纯看当日涨跌更能反映趋势性资金流动。"
      },
      "business_keywords": ["板块轮动", "行业切换", "资金流向", "行业趋势", "转强", "转弱", "热点板块", "行业配置"],
      "example_queries": ["最近哪些板块在走强？", "资金在从哪个行业流向哪个行业？", "有没有行业启动信号？", "应该回避哪些行业？"],
      "answer_template": "板块轮动分析：持续强势行业{{strong_sectors}}，持续弱势行业{{weak_sectors}}，启动拐点行业{{turning_up_sectors}}，见顶拐点行业{{turning_down_sectors}}。建议关注：{{recommendation}}。",
      "assumptions": ["排名提升/下降的显著性阈值（10位）为经验值，行业总数约几十个，10位变化约对应四分位跨度的变动。", "行业分类使用申万三级分类，粒度较细，可能需要向上聚合到一级或二级行业做更宏观的判断。", "近5日和近20日的对比周期为常见设定，可根据投资周期调整。"],
      "validation_cases": [
        {"input": {}, "expected": "strong_sectors is list, weak_sectors is list"},
        {"input": {"lookback_short": "5d", "lookback_long": "20d"}, "expected": "turning_up_sectors is list"}
      ]
    },
    {
      "id": "top_stock_selection",
      "name": "优选股票推荐",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "综合多周期趋势确认、信号强度和综合评分，从全市场筛选出最具投资价值的股票列表。适用于构建选股池和投资组合决策。",
      "depends_on": ["stock_price_trend", "multi_period_alignment", "stock_signal_summary", "stock_composite_score_overview"],
      "source_atomic_entities": ["daily_kline", "weekly_kline", "monthly_kline", "stock_signal", "composite_score_detail"],
      "composition_type": "segment",
      "composition_rule": {
        "logic": "1. 初筛：日线趋势为上升，且 is_active=1（在市股票）。\n2. 周期确认：多周期共振方向至少\"偏强\"（三线共振向上或二上一下），淘汰日周月三级全部向下的股票。\n3. 信号过滤：信号偏多或中性，淘汰信号偏空的股票。\n4. 评分排序：按综合评分 total_score 从高到低排序。\n5. 二次过滤：confidence < 0.5 的股票标记为\"低可信度\"并降权。\n6. 输出：Top 20 推荐列表，附评分、趋势、关键信号和可信度。",
        "explanation": "多维度漏斗筛选模型，从全市场逐步过滤到高确信度的候选股票池。"
      },
      "business_keywords": ["选股", "股票推荐", "股票池", "优选", "精选", "强势股", "投资组合", "选股策略"],
      "example_queries": ["推荐几只好股票？", "最近哪些股票最值得买？", "帮我选20只强势股？", "按照综合评分最高的股票有哪些？"],
      "interpretation_rule": "排名1-5为\"强烈推荐\"，6-10为\"推荐\"，11-20为\"关注\"。每只股票附一句话推荐理由。",
      "answer_template": "基于多维度筛选，为您推荐以下股票：{{#stocks}}{{rank}}. {{code}} {{name}} — 综合评分{{total_score}}（{{level_cn}}），趋势{{trend_desc}}，{{reason}}。{{/stocks}}",
      "assumptions": ["筛选漏斗的每层过滤条件均为初始设计，各阈值需要根据历史回测效果调整。", "signals、indicators、composite_scores 表当前均无数据，选股策略的实际效果需待数据上线后验证。", "初筛使用日线趋势，未考虑基本面和估值因素。"],
      "validation_cases": [
        {"input": {"limit": 20}, "expected": "stocks is list, each stock has total_score and level_cn"},
        {"input": {"min_confidence": 0.5}, "expected": "all stocks have confidence >= 0.5"}
      ]
    },
    {
      "id": "drawdown_recovery_stats",
      "name": "回撤恢复统计",
      "entity_type": "concept",
      "concept_layer": "L2_decision_concept",
      "version": 1,
      "description": "在识别个股历史回撤事件的基础上，计算每次回撤后在 60 日和 120 日窗口内的反弹概率、平均反弹幅度和首次回正天数，给出基于历史统计的持仓决策参考。适用于投资者在深度浮亏时客观评估\"割肉还是扛\"的决策。",
      "depends_on": ["stock_drawdown_events"],
      "source_atomic_entities": ["stock_full_kline_history"],
      "composition_type": "health_score",
      "composition_rule": {
        "logic": "1. 从 stock_drawdown_events 获取所有回撤事件的触发日期和触发价格。\n2. 对每个事件，使用 stock_full_kline_history 获取触发日后 60/120 个交易日的收盘价数据。\n3. 计算每个事件的 60 日/120 日前瞻指标：\n   - 最终涨跌幅：(事件后第 N 日收盘价 / 触发价 - 1) × 100%\n   - 最大反弹幅度：(事件后 N 日内最高价 / 触发价 - 1) × 100%\n   - 是否上涨：最终涨跌幅 > 0\n   - 首次回正天数：事件后首次收盘价 > 触发价的天数（未回正则标记为 None）\n4. 聚合统计：\n   - 上涨概率：上涨事件数 / 总事件数 × 100%\n   - 平均最终涨跌幅（全部事件 / 仅上涨事件 / 仅下跌事件）\n   - 平均最大反弹幅度\n   - 平均回正天数（仅上涨事件）\n5. 排除当前仍在进行中的事件后，给出\"历史胜率\"。\n6. 参考 SQL 实现（关键片段）：\nWITH events AS (...),\nforward AS (\n  SELECT e.event_date, e.trigger_price,\n    LEAD(k.close, 60) OVER (ORDER BY k.date) AS close_60d,\n    MAX(k.high) OVER (ORDER BY k.date ROWS BETWEEN 1 FOLLOWING AND 60 FOLLOWING) AS max_high_60d\n  FROM kline_daily k JOIN events e ON k.date = e.event_date\n)\nSELECT\n  COUNT(*) AS total_events,\n  SUM(CASE WHEN close_60d > trigger_price THEN 1 ELSE 0 END) AS up_count,\n  ROUND(AVG((close_60d / trigger_price - 1) * 100), 2) AS avg_pct_60d\nFROM forward",
        "explanation": "这是从\"描述回撤\"到\"决策支持\"的关键跃升。历史统计不保证未来结果，但提供了客观的概率基准，帮助投资者在情绪化决策时回归理性。"
      },
      "business_keywords": ["反弹概率", "回本概率", "历史胜率", "割肉还是扛", "回撤恢复", "解套", "统计套利", "回测"],
      "example_queries": ["这只股票每次回撤超过25%后，60天内涨回来的概率是多少？", "历史上深度回撤后平均能反弹多少？", "从历史统计看，现在该割肉还是继续持有？", "回撤后120天能回到成本价的概率多大？"],
      "interpretation_rule": "上涨概率 > 60% 为\"历史偏乐观\"，40-60% 为\"历史中性\"，< 40% 为\"历史偏悲观\"。结合平均反弹幅度评估盈亏比：如果平均反弹幅度 < 当前浮亏幅度，提示\"历史反弹不足以回本\"。",
      "answer_template": "{{code}} {{name}} 自上市以来触发过{{total_events}}次回撤≥{{threshold}}%事件（排除当前后{{historical_events}}次）。统计结果：\n- 60日内上涨概率：{{prob_up_60d}}%（{{up_60d}}/{{total_with_data_60d}}），平均涨幅 {{avg_pct_60d}}%\n- 120日内上涨概率：{{prob_up_120d}}%（{{up_120d}}/{{total_with_data_120d}}），平均涨幅 {{avg_pct_120d}}%\n- 平均最大反弹（60日）：{{avg_max_60d}}%\n{{#current_event}}当前事件：触发于{{current_trigger_date}}，触发价{{current_trigger_price}}，至今仅过去{{current_elapsed_days}}个交易日，尚无统计意义。{{/current_event}}{{#verdict}}历史结论：{{verdict}}。{{/verdict}}仅供参考，不构成投资建议。",
      "assumptions": ["回撤阈值默认 25%，前瞻窗口默认 60 日和 120 日，均可通过参数调整。", "历史统计基于该股自身数据，不同股票的回撤行为可能差异很大，不可跨股套用。", "当前事件的统计应被排除或单独标注，因为前瞻窗口尚未走完。", "统计结果受样本量影响：上市时间短的股票事件数可能不足，统计显著性有限。", "该分析需要执行多条SQL并做聚合计算，概念层的 composition_rule 提供了计算逻辑和参考SQL，实际执行可能需要借助 Python/sqlite3 脚本完成窗口计算和统计聚合。"],
      "validation_cases": [
        {"input": {"code": "603993", "threshold": 0.25, "forward_windows": [60, 120]}, "expected": "prob_up_60d is number between 0 and 100, avg_pct_60d is number"},
        {"input": {"code": "600519", "threshold": 0.20}, "expected": "total_events >= 0, historical_events <= total_events"}
      ]
    }
  ],
  "atomic_info": {
    "grouped": {
      "主数据": ["stock_basic_info", "table_field_dictionary"],
      "行情数据": ["daily_kline", "weekly_kline", "monthly_kline", "daily_market_snapshot", "stock_full_kline_history"],
      "技术分析": ["stock_indicator_value", "stock_signal"],
      "决策数据": ["market_environment", "composite_score_detail"],
      "运维数据": ["data_update_status"]
    },
    "total": 12,
    "has_data": 7,
    "no_data": 5,
    "data_cutoff": "2026-06-02"
  },
  "concept_graph": {
    "nodes_by_layer": {"L1": 11, "L2": 6},
    "dependencies": {
      "L1": {
        "stock_price_trend": ["daily_kline"],
        "stock_volume_analysis": ["daily_kline"],
        "multi_period_alignment": ["daily_kline", "weekly_kline", "monthly_kline"],
        "stock_signal_summary": ["stock_signal"],
        "stock_indicator_profile": ["stock_indicator_value"],
        "market_trend_status": ["market_environment"],
        "industry_performance": ["daily_kline", "stock_basic_info"],
        "stock_ranking": ["daily_market_snapshot"],
        "stock_composite_score_overview": ["composite_score_detail"],
        "stock_comparison": ["daily_kline"],
        "stock_drawdown_events": ["stock_full_kline_history"]
      },
      "L2": {
        "stock_investment_rating": ["stock_price_trend", "stock_signal_summary", "stock_indicator_profile"],
        "market_risk_assessment": ["market_trend_status", "industry_performance"],
        "stock_anomaly_alert": ["stock_price_trend", "stock_volume_analysis"],
        "sector_rotation_signal": ["industry_performance"],
        "top_stock_selection": ["stock_price_trend", "multi_period_alignment", "stock_signal_summary", "stock_composite_score_overview"],
        "drawdown_recovery_stats": ["stock_drawdown_events"]
      }
    }
  },
  "stats": {
    "total_atomic": 12,
    "total_l1": 11,
    "total_l2": 6,
    "total_concepts": 17,
    "total_entities": 29,
    "data_cutoff": "2026-06-02",
    "ready_score": 88,
    "ready_detail": "7个有数据L0 原子实体可用，5个空表L0 原子实体处于设计阶段，11个L1概念中8个100%可用，6个L2概念中3个100%可用",
    "known_gaps": [
      "indicators/signals/composite_scores/market_regime/update_log 五张表无数据",
      "暂无资金流向明细（北向资金、主力资金净流入/流出）",
      "暂无基本面与估值数据（PE、PB、ROE等）",
      "drawdown_recovery_stats 需Python脚本辅助执行窗口计算"
    ]
  }
};
