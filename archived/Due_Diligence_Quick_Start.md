# VESTI 背调快速启动指南
## Quick Start for AI Due Diligence Agents

**配套文档**: `Due_Diligence_Guidebook.md`  
**目标读者**: 执行背调的AI Agent  
**阅读时间**: 15分钟  
**执行时间**: 4-6小时（标准背调）

---

## 阶段0: 准备 (15分钟)

### 0.1 理解背调目标

**VESTI项目背景**:
- 产品: AI对话管理浏览器扩展
- 核心功能: 跨平台捕获、本地存储、智能压缩导出
- 目标用户: AI重度使用者（开发者、研究者、内容创作者）
- 背调目标: 验证PACS（智能压缩系统）的市场需求

### 0.2 确认关键词包

**必须使用的核心关键词** (复制到搜索):

```
# 痛点发现 (高优先级)
"export chatgpt conversations" + "difficult"
"chatgpt history" + "search" + "not working"
"chatgpt export" + "waiting" + "hours"
"claude conversation" + "lost" + "disappeared"
"ai chat" + "organization" + "mess"
"multiple ai tools" + "context" + "lost"

# 竞品关键词
"chatgpt toolbox" + "review"
"ai prompt genius" + "alternative"
"mem0" + "vs" + "openmemory"
"chat organizer" + "app" + "review"

# 场景需求
"how to organize chatgpt conversations"
"manage ai chat history"
"backup claude conversations"
"export ai conversations to markdown"
"ai conversation memory tool"
```

### 0.3 信源清单

**必须搜索的平台** (按优先级):

1. ✅ Reddit (r/ChatGPT, r/ClaudeAI, r/OpenAI)
2. ✅ OpenAI Developer Community
3. ✅ MacPowerUsers Forum
4. ✅ Hacker News
5. ✅ LinkedIn (专业用户反馈)
6. ✅ Product Hunt (产品评论)
7. ✅ Chrome Web Store (竞品评论)

---

## 阶段1: 一级信源收集 (2小时)

### 1.1 Reddit深度搜索

**执行步骤**:

1. 访问 `reddit.com/r/ChatGPT`
2. 搜索关键词: `export`
3. 筛选: `Top` → `Past Year`
4. 记录得分>100的帖子 (至少10条)
5. 阅读前20条评论，提取用户原声
6. 重复上述步骤在 r/ClaudeAI, r/OpenAI

**记录模板**:
```
帖子标题: [复制]
URL: [复制]
作者: u/[用户名] (Karma: [数字])
日期: [YYYY-MM-DD]
得分: [数字]
评论数: [数字]

用户原声 (复制3-5条高赞评论):
1. "[直接引用]" - u/[用户名], [得分]分
2. ...

痛点分类: [导出/搜索/长对话/跨平台/隐私]
情感: [正面/中性/负面]
质量评分: [1-10]
```

### 1.2 官方社区搜索

**OpenAI Community**:
- 访问 `community.openai.com`
- 搜索: `export`
- 筛选: `Latest` 和 `Top`
- 记录支持票数>50的帖子

**Anthropic Support**:
- 搜索 Claude 相关问题
- 重点关注导出和历史记录问题

### 1.3 应用商店评论

**Chrome Web Store**:
- 搜索: "ChatGPT export", "ChatGPT organizer"
- 查看竞品（ChatGPT Toolbox, AI Prompt Genius）评论
- 记录3星及以下评论（真实痛点）
- 记录4-5星评论中的改进建议

---

## 阶段2: 二级信源收集 (1小时)

### 2.1 科技媒体报道

**搜索关键词**:
```
"ChatGPT export feature" site:techcrunch.com
"AI conversation management" site:theverge.com
"Claude context limit" site:wired.com
```

**记录重点**:
- 官方产品更新公告
- 用户反馈报道
- 市场趋势分析

### 2.2 行业分析报告

**查找来源**:
- CB Insights: AI应用趋势
- Gartner: 生产力工具市场
- 免费报告: Google Scholar搜索

---

## 阶段3: 数据整理与验证 (1小时)

### 3.1 证据录入

**使用标准格式**:

```yaml
Evidence_ID: EV-2026-XXX
Source_Type: Reddit
Platform: r/ChatGPT
URL: [完整URL]
Title: [帖子标题]
Author: u/[用户名] ([Karma数字])
Date: [YYYY-MM-DD]
Engagement:
  Upvotes: [数字]
  Comments: [数字]
Key_Quote: "[用户原声，50-100字]"
Pain_Point_Category: [导出/搜索/长对话/跨平台/隐私]
Sentiment: [正面/中性/负面]
Quality_Score: [1-10]
```

### 3.2 交叉验证

**验证清单**:
- [ ] 核心痛点是否有≥3个独立来源？
- [ ] 统计数据是否可验证？
- [ ] 用户原声是否可以点击访问？
- [ ] 是否有相反观点被记录？

### 3.3 情感分析

**简单情感分类**:
- 😠 强烈负面 (用词: hate, terrible, unacceptable)
- 😤 负面 (用词: frustrating, annoying, difficult)
- 😕 中性 (客观描述，无明显情绪)
- 🙂 正面 (用词: love, great, helpful)

---

## 阶段4: 分析与洞察 (1小时)

### 4.1 痛点优先级矩阵

**制作表格**:

| 排名 | 痛点描述 | 证据数 | 严重性 | 样本原声 |
|-----|---------|-------|-------|---------|
| 1 | [简要描述] | [N]条 | [高/中/低] | "[引用]" |

**严重性评估** (5维度):
- 频率: 1-5
- 影响: 1-5
- 情感强度: 1-5
- 解决难度: 1-5
- 替代方案: 1-5 (反向)

### 4.2 证据链构建

**示例格式**:

```
结论: [陈述句]

支撑证据:
├── 用户原声 (N条)
│   ├── "[引用]" [EV-XXX]
│   └── ...
├── 参与度数据
│   ├── 总讨论: [N]条
│   └── 平均赞数: [N]
└── 趋势数据
    └── 增长/下降: [%]

证据强度: [高/中/低]
```

---

## 阶段5: 报告撰写 (1小时)

### 5.1 使用标准模板

**复制模板**: `Due_Diligence_Guidebook.md` 第6.1节

**必须包含章节**:
1. 执行摘要 (3-5条核心发现)
2. 用户痛点分析 (带优先级矩阵)
3. 竞品分析 (3-5个主要竞品)
4. 机会与风险 (2-3个关键机会，2-3个关键风险)
5. 数据附录 (完整证据清单)

### 5.2 质量检查

**提交前检查清单**:

**内容完整性**:
- [ ] 收集≥20条一级信源证据
- [ ] 覆盖≥5个核心痛点
- [ ] 包含≥3个竞品分析
- [ ] 所有引用可点击验证

**分析质量**:
- [ ] 使用了5维度痛点评估
- [ ] 每个高优先级痛点有≥3条证据
- [ ] 包含情感分布数据
- [ ] 包含时间趋势分析

**客观性**:
- [ ] 同时收集了正面和负面反馈
- [ ] 标注了可能的偏见来源
- [ ] 包含局限性声明

---

## 快速参考：关键词扩展表

**按痛点分类的关键词**:

| 痛点类型 | 搜索关键词 | 预期结果 |
|---------|-----------|---------|
| **导出困难** | "chatgpt export waiting", "export taking too long" | 等待时间问题 |
| **格式问题** | "chatgpt export json unreadable", "export format" | 格式混乱问题 |
| **搜索困难** | "can't find old chatgpt conversation", "search not working" | 搜索功能问题 |
| **长对话** | "chatgpt context limit", "conversation too long" | 上下文限制 |
| **跨平台** | "switch between chatgpt and claude", "multiple ai tools" | 平台切换问题 |
| **隐私** | "chatgpt privacy concerns", "local storage ai chat" | 隐私担忧 |

---

## 快速参考：信源可靠性评级

| 平台 | 可靠性 | 使用建议 |
|-----|-------|---------|
| Reddit (高赞帖) | ⭐⭐⭐⭐⭐ | 核心证据源 |
| 官方社区论坛 | ⭐⭐⭐⭐⭐ | 核心证据源 |
| Hacker News | ⭐⭐⭐⭐⭐ | 技术用户反馈 |
| Product Hunt | ⭐⭐⭐⭐☆ | 早期采用者反馈 |
| 应用商店评论 | ⭐⭐⭐⭐☆ | 实际使用反馈 |
| 科技媒体 | ⭐⭐⭐☆☆ | 趋势验证 |
| Twitter/X | ⭐⭐⭐☆☆ | 实时反馈 |
| 博客/个人网站 | ⭐⭐☆☆☆ | 需验证作者身份 |

---

## 常见问题 (FAQ)

**Q: 如果找不到足够的一级信源怎么办？**  
A: 扩大关键词范围，尝试不同组合。如果仍不足，在报告中明确说明样本限制。

**Q: 如何处理相互矛盾的证据？**  
A: 记录所有观点，分析矛盾原因（用户群体不同、时间变化、使用场景差异），在报告中说明。

**Q: 情感分析如何量化？**  
A: 使用简单分类：正面(+1)、中性(0)、负面(-1)，计算平均值和分布比例。

**Q: 多久更新一次背调？**  
A: 技术领域建议每季度更新，重大产品发布后应立即更新。

---

## 执行检查清单 (打印版)

```
□ 阅读本快速启动指南
□ 理解VESTI项目背景
□ 准备关键词包
□ 打开Reddit开始搜索
□ 收集≥20条一级信源
□ 录入标准格式证据
□ 完成交叉验证
□ 制作痛点优先级矩阵
□ 构建核心证据链
□ 撰写背调报告
□ 完成质量检查
□ 提交报告
```

---

**下一步**: 参考 `Due_Diligence_Guidebook.md` 获取详细方法论和理论背景。

**执行支持**: 如有疑问，参考指导书第7章"工具与资源"。
