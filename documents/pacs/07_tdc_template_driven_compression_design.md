# TDC - Template-Driven Compression 设计文档

> **版本**: v1.0  
> **状态**: 设计阶段，待评审  
> **创建日期**: 2026-03-15  
> **关联文档**: PACS 系统优化方案

---

## 执行摘要

### 当前问题

PACS 现有压缩机制存在以下阻碍生产场景使用的问题：

1. **过度结构化** - 输出包含过多层级标题（## Core Logic Chain, ## Concept Matrix...），不适合直接复用
2. **格式僵化** - 固定输出格式难以适应不同场景（迁移、文档、会议等）
3. **调整困难** - 修改输出格式需要改动多处代码，无法快速迭代
4. **验证成本高** - 难以快速验证不同配置的效果

### 解决方案

引入 **Template-Driven Compression (TDC)** - 模板驱动的压缩架构：

- **扁平输出** - 最多 2 级标题，聚焦内容而非结构
- **模板驱动** - 输出格式由配置模板决定，易于调整
- **场景定制** - 每个使用场景有独立的"最小可用模板"
- **热验证** - 模板可独立测试和验证

---

## 设计目标

| 目标 | 现状 | 目标状态 | 衡量标准 |
|------|------|----------|----------|
| **输出简洁度** | 多层嵌套标题 | 扁平结构，最多2级 | 标题层级 ≤ 2 |
| **场景适配** | 单一格式 | 多模板适配 | 支持 4+ 场景模板 |
| **调整效率** | 需改代码 | 改配置即可 | 模板调整 < 5 分钟 |
| **可验证性** | 集成测试 | 独立单元测试 | 模板独立测试覆盖率 > 80% |

---

## 架构设计

### 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                  TDC - Template-Driven Compression              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Scene Layer (场景层)                                     │  │
│  │  ├── multi_dialog_migration    多对话迁移                  │  │
│  │  ├── developer_documentation   开发者文档                  │  │
│  │  ├── meeting_minutes           会议纪要                    │  │
│  │  └── weekly_summary            周报汇总                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Template Engine (模板引擎)                               │  │
│  │  ├── 模板加载 (Template Loader)                           │  │
│  │  ├── 变量填充 (Variable Substitution)                     │  │
│  │  └── 输出验证 (Output Validation)                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Content Pipeline (内容管道)                              │  │
│  │  ├── Extract  - 从对话提取关键信息                         │  │
│  │  ├── Refine   - LLM 按模板要求压缩                        │  │
│  │  └── Format   - 应用模板输出最终格式                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Output (输出层)                                          │  │
│  │  ├── 扁平 Markdown                                        │  │
│  │  ├── 结构化 JSON (可选)                                    │  │
│  │  └── 纯文本 (可选)                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 与现有 PACS 的关系

```
PACS (现有)
├── Tier 1: Semantic Chunking (保留)
├── Tier 2: Hierarchical Summary (改造)
│   └── 集成 TDC 作为 "Template Mode"
├── Tier 3: Knowledge Graph (保留)
└── 新增: TDC Layer
    ├── Template Engine
    ├── Scene Configs
    └── Output Validators
```

TDC 将作为 Tier 2 的增强模式，同时可独立使用。

---

## 核心概念

### 1. Template (模板)

模板是定义输出格式的配置单元，包含：

- **结构定义** (Structure) - 输出包含哪些部分
- **LLM 指令** (Instruction) - 如何压缩和格式化
- **验证规则** (Validation) - 输出必须满足的条件
- **示例输出** (Example) - 用于参考和测试

### 2. Scene (场景)

场景是面向用户的模板实例，例如：

- 多对话迁移场景
- 开发者文档场景
- 会议纪要场景

每个场景绑定一个基础模板，可覆盖部分配置。

### 3. Pipeline (管道)

内容处理的三阶段管道：

1. **Extract** - 从原始对话提取关键信息（代码块、决策点、问题等）
2. **Refine** - LLM 根据模板指令压缩内容
3. **Format** - 应用模板结构输出最终格式

---

## 模板设计规范

### 模板数据结构

```typescript
interface ExportTemplate {
  // 元数据
  id: string;                    // 唯一标识
  name: string;                  // 显示名称
  description: string;           // 描述
  version: string;               // 版本号
  
  // 结构定义
  structure: TemplateSection[];  // 输出结构
  
  // LLM 指令
  instruction: string;           // 主指令
  constraints?: string[];        // 约束条件
  examples?: string[];           // 示例输出
  
  // 输出控制
  output: {
    maxHeadingLevel: 1 | 2 | 3;           // 最大标题层级
    includeMetadata: boolean;              // 是否包含元数据
    sourceAttribution: "inline" | "footer" | "none";  // 来源标注
    codeBlockHandling: "preserve" | "extract" | "summarize";  // 代码处理
  };
  
  // 验证规则
  validation: {
    requiredPatterns: string[];    // 必须包含的模式
    forbiddenPatterns: string[];   // 不能包含的模式
    minLength?: number;            // 最小长度
    maxLength?: number;            // 最大长度
  };
}

interface TemplateSection {
  id: string;                    // 标识符
  title: string;                 // 标题（空字符串表示无标题）
  required: boolean;             // 是否必需
  type: "paragraph" | "bullet_list" | "numbered_list" | "code_block" | "check_list";
  maxLength?: number;            // 最大长度限制
  condition?: string;            // 条件渲染（可选）
}
```

### 核心模板设计

#### 模板 A：多对话迁移 (multi-dialog-migration)

**目标**: 将多个对话整合为连贯的前置知识，可直接粘贴到其他 AI 工具作为上下文

**设计原则**:
- 无嵌套章节，扁平结构
- 连续叙述，而非分点罗列
- 保留关键决策，去除过程性讨论
- 内联标注来源

```yaml
id: "multi-dialog-migration"
name: "多对话迁移"
description: "将多个对话整合为连贯的前置知识"
version: "1.0.0"

structure:
  - id: "summary"
    title: ""                          # 无标题，直接进入正文
    required: true
    type: "paragraph"
    maxLength: 500
    
  - id: "key_points"
    title: "### 关键要点"               # 唯一的小节标题
    required: true
    type: "bullet_list"
    maxLength: 300

instruction: |
  将以下对话整合成一段连贯的知识总结。
  
  要求：
  1. 开头用1-2段连续段落叙述核心内容，不要标题
  2. 保留关键决策和依据，去除过程性讨论
  3. 在相关内容后标注来源：[来自: 对话标题]
  4. 用 ### 关键要点 列出3-5个可执行的要点
  5. 移除重复内容，合并相似观点
  6. 不要输出其他标题或章节

constraints:
  - "最多使用1个三级标题 (###)"
  - "必须标注来源"
  - "连续叙述，不要分小节"

examples:
  - |
    在讨论 React 性能优化时，团队决定采用 useMemo 来缓存昂贵计算，避免不必要的重渲染。这一决策基于组件渲染频率的分析，在高频更新的列表组件中尤为重要。[来自: React优化讨论-1]

    后续在架构评审中确认了这一方案，同时补充了虚拟滚动作为大数据列表的解决方案。[来自: 架构评审-3]

    ### 关键要点

    - 使用 useMemo 缓存昂贵计算（React优化讨论-1）
    - 虚拟滚动处理大数据列表（架构评审-3）
    - 避免在渲染路径中创建新对象

output:
  maxHeadingLevel: 3
  includeMetadata: false
  sourceAttribution: "inline"
  codeBlockHandling: "preserve"

validation:
  requiredPatterns:
    - "[来自:"
    - "### 关键要点"
  forbiddenPatterns:
    - "## Core Logic"
    - "## Concept Matrix"
    - "## Unresolved Tensions"
    - "### "  # 除了"关键要点"外的其他三级标题
  minLength: 100
  maxLength: 2000
```

#### 模板 B：开发者文档 (developer-documentation)

**目标**: 提取可直接复用的技术实现，保留代码完整性和使用说明

**设计原则**:
- 开门见山，先给代码
- 保留完整代码块（含注释）
- 简洁的使用说明，无废话
- 不要解释"为什么"，只保留"是什么"和"怎么做"

```yaml
id: "developer-documentation"
name: "开发者文档"
description: "提取可直接复用的技术内容"
version: "1.0.0"

structure:
  - id: "overview"
    title: ""
    required: true
    type: "paragraph"
    maxLength: 150
    
  - id: "code"
    title: "### 核心代码"
    required: true
    type: "code_block"
    
  - id: "usage"
    title: "### 使用方式"
    required: true
    type: "bullet_list"
    maxLength: 200

instruction: |
  提取以下对话中的技术实现。
  
  要求：
  1. 开头用1句话说明这段代码解决什么问题
  2. ### 核心代码：保留完整代码块，包括注释和类型定义
  3. ### 使用方式：用3-5个简洁步骤说明如何使用
  4. 不要背景介绍、详细解释或替代方案讨论
  5. 代码必须是可直接运行的，不要省略关键部分

constraints:
  - "代码块必须完整，不能截断"
  - "使用步骤必须具体可操作"
  - "不要解释性文字"

examples:
  - |
    实现了一个带防抖的搜索输入框 Hook，延迟触发搜索以减少请求。

    ### 核心代码

    ```typescript
    import { useState, useEffect } from 'react';

    export const useDebounceSearch = (delay = 300) => {
      const [query, setQuery] = useState('');
      const [debouncedQuery, setDebouncedQuery] = useState('');

      useEffect(() => {
        const timer = setTimeout(() => {
          setDebouncedQuery(query);
        }, delay);

        return () => clearTimeout(timer);
      }, [query, delay]);

      return { query, setQuery, debouncedQuery };
    };
    ```

    ### 使用方式

    - 导入 Hook：`import { useDebounceSearch } from './hooks'`
    - 调用并传入延迟：`const { debouncedQuery } = useDebounceSearch(500)`
    - 在 input 的 onChange 中调用 `setQuery`：`<input onChange={e => setQuery(e.target.value)} />`
    - 在 useEffect 中监听 `debouncedQuery` 变化并触发搜索

output:
  maxHeadingLevel: 3
  includeMetadata: false
  sourceAttribution: "none"
  codeBlockHandling: "preserve"

validation:
  requiredPatterns:
    - "### 核心代码"
    - "### 使用方式"
    - "```"
  forbiddenPatterns:
    - "背景"
    - "详细解释"
    - "替代方案"
    - "为什么选择"
    - "## "
```

#### 模板 C：会议纪要 (meeting-minutes)

**目标**: 快速提取会议要点、决策和待办事项

**设计原则**:
- 结构化但简洁
- 突出决策和责任人
- 待办事项可勾选

```yaml
id: "meeting-minutes"
name: "会议纪要"
description: "提取会议要点、决策和待办"
version: "1.0.0"

structure:
  - id: "summary"
    title: ""
    required: true
    type: "paragraph"
    maxLength: 200
    
  - id: "decisions"
    title: "### 决策"
    required: true
    type: "bullet_list"
    
  - id: "action_items"
    title: "### 待办"
    required: true
    type: "check_list"

instruction: |
  将对话整理为会议纪要格式。
  
  要求：
  1. 1段总结会议主题和结论
  2. ### 决策：列出达成的决策，格式为"决策内容 - 负责人"
  3. ### 待办：列出待办事项，格式为"[ ] 任务内容 (@负责人)"
  4. 去除讨论过程，只保留结论

output:
  maxHeadingLevel: 3
  includeMetadata: true
  sourceAttribution: "none"

validation:
  requiredPatterns:
    - "### 决策"
    - "### 待办"
    - "[ ]"
```

#### 模板 D：周报汇总 (weekly-summary)

**目标**: 汇总一周对话，提取主题、进展和阻塞点

```yaml
id: "weekly-summary"
name: "周报汇总"
description: "汇总一周对话生成周报"
version: "1.0.0"

structure:
  - id: "overview"
    title: ""
    required: true
    type: "paragraph"
    
  - id: "themes"
    title: "### 本周主题"
    required: true
    type: "bullet_list"
    
  - id: "progress"
    title: "### 进展"
    required: true
    type: "bullet_list"
    
  - id: "blockers"
    title: "### 阻塞/风险"
    required: false
    type: "bullet_list"

instruction: |
  汇总以下对话生成周报。
  
  要求：
  1. 1段总体进展概述
  2. ### 本周主题：列出3-5个主要讨论主题
  3. ### 进展：列出具体完成的事项
  4. ### 阻塞/风险：列出待解决问题（如有）

output:
  maxHeadingLevel: 3
  includeMetadata: false
  sourceAttribution: "footer"
```

---

## 系统模块设计

### 模块 1：TemplateLoader (模板加载器)

```typescript
// lib/compression/template/loader.ts

export class TemplateLoader {
  private templates: Map<string, ExportTemplate> = new Map();
  
  /**
   * 注册模板
   */
  register(template: ExportTemplate): void {
    this.templates.set(template.id, template);
  }
  
  /**
   * 加载模板
   */
  load(id: string): ExportTemplate | undefined {
    return this.templates.get(id);
  }
  
  /**
   * 列出所有模板
   */
  list(): ExportTemplate[] {
    return Array.from(this.templates.values());
  }
  
  /**
   * 从配置文件批量加载
   */
  loadFromConfig(configs: ExportTemplate[]): void {
    configs.forEach(c => this.register(c));
  }
}

// 全局模板加载器实例
export const templateLoader = new TemplateLoader();
```

### 模块 2：TemplateEngine (模板引擎)

```typescript
// lib/compression/template/engine.ts

export class TemplateEngine {
  private loader: TemplateLoader;
  
  constructor(loader: TemplateLoader) {
    this.loader = loader;
  }
  
  /**
   * 使用模板压缩对话
   */
  async compress(
    messages: Message[],
    templateId: string,
    settings: LlmConfig
  ): Promise<CompressionResult> {
    const template = this.loader.load(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    // 1. 构建 Prompt
    const prompt = this.buildPrompt(messages, template);
    
    // 2. 调用 LLM
    const llmResult = await callInference(settings, prompt);
    
    // 3. 验证输出
    const validation = this.validate(llmResult.content, template);
    
    // 4. 构建结果
    return {
      content: llmResult.content,
      level: "template",
      metadata: {
        originalLength: messages.reduce((s, m) => s + m.content_text.length, 0),
        compressedLength: llmResult.content.length,
        compressionRatio: llmResult.content.length / messages.reduce((s, m) => s + m.content_text.length, 0),
        processingTimeMs: 0,  // 实际计算
        llmCallCount: 1,
        fromCache: false,
        template: templateId,
        validation: validation.valid,
      },
    };
  }
  
  /**
   * 构建 LLM Prompt
   */
  private buildPrompt(messages: Message[], template: ExportTemplate): string {
    const conversationText = messages.map(m => {
      const role = m.role === "user" ? "User" : "AI";
      return `[${role}] ${m.content_text}`;
    }).join("\n\n");
    
    return `${template.instruction}

对话内容：
${conversationText}

${this.buildStructureHint(template.structure)}

约束条件：
${template.constraints?.map(c => `- ${c}`).join("\n") || "无"}`;
  }
  
  /**
   * 构建结构提示
   */
  private buildStructureHint(sections: TemplateSection[]): string {
    const hints = sections.map(s => {
      if (s.title) {
        return `${s.title}\n{${s.type}}`;
      }
      return `{${s.type}}`;
    });
    
    return `输出结构：\n${hints.join("\n\n")}`;
  }
  
  /**
   * 验证输出
   */
  validate(output: string, template: ExportTemplate): ValidationResult {
    const errors: string[] = [];
    
    // 检查必需模式
    for (const pattern of template.validation.requiredPatterns) {
      if (!output.includes(pattern)) {
        errors.push(`Missing required pattern: ${pattern}`);
      }
    }
    
    // 检查禁止模式
    for (const pattern of template.validation.forbiddenPatterns) {
      if (output.includes(pattern)) {
        errors.push(`Found forbidden pattern: ${pattern}`);
      }
    }
    
    // 检查长度
    if (template.validation.minLength && output.length < template.validation.minLength) {
      errors.push(`Output too short: ${output.length} < ${template.validation.minLength}`);
    }
    if (template.validation.maxLength && output.length > template.validation.maxLength) {
      errors.push(`Output too long: ${output.length} > ${template.validation.maxLength}`);
    }
    
    // 检查标题层级
    const headings = output.match(/^#{1,6} /gm) || [];
    for (const h of headings) {
      const level = h.match(/#+/)?.[0].length || 0;
      if (level > template.output.maxHeadingLevel) {
        errors.push(`Heading level ${level} exceeds max ${template.output.maxHeadingLevel}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      output,
    };
  }
}
```

### 模块 3：TemplateTester (模板测试器)

```typescript
// lib/compression/template/tester.ts

export interface TestResult {
  template: string;
  success: boolean;
  output: string;
  errors?: string[];
  duration: number;
  metrics?: {
    compressionRatio: number;
    headingCount: number;
    codeBlockCount: number;
  };
}

export class TemplateTester {
  private engine: TemplateEngine;
  
  constructor(engine: TemplateEngine) {
    this.engine = engine;
  }
  
  /**
   * 测试单个模板
   */
  async test(
    templateId: string,
    sampleMessages: Message[],
    settings: LlmConfig
  ): Promise<TestResult> {
    const startTime = performance.now();
    
    try {
      const result = await this.engine.compress(sampleMessages, templateId, settings);
      const duration = performance.now() - startTime;
      
      const validation = this.engine.validate(result.content, 
        this.engine["loader"].load(templateId)!
      );
      
      // 计算指标
      const metrics = {
        compressionRatio: result.metadata.compressionRatio,
        headingCount: (result.content.match(/^#{1,6} /gm) || []).length,
        codeBlockCount: (result.content.match(/```/g) || []).length / 2,
      };
      
      return {
        template: templateId,
        success: validation.valid,
        output: result.content,
        errors: validation.errors,
        duration,
        metrics,
      };
    } catch (error) {
      return {
        template: templateId,
        success: false,
        output: "",
        errors: [(error as Error).message],
        duration: performance.now() - startTime,
      };
    }
  }
  
  /**
   * 批量测试并生成报告
   */
  async testBatch(
    tests: Array<{ templateId: string; messages: Message[] }>,
    settings: LlmConfig
  ): Promise<TestReport> {
    const results = await Promise.all(
      tests.map(t => this.test(t.templateId, t.messages, settings))
    );
    
    return {
      total: results.length,
      passed: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      summary: this.generateSummary(results),
    };
  }
  
  private generateSummary(results: TestResult[]): string {
    const lines = [
      "=== Template Test Summary ===",
      `Total: ${results.length}`,
      `Passed: ${results.filter(r => r.success).length}`,
      `Failed: ${results.filter(r => !r.success).length}`,
      "",
      "Details:",
      ...results.map(r => 
        `${r.success ? "✅" : "❌"} ${r.template} (${r.duration.toFixed(0)}ms)`
      ),
    ];
    return lines.join("\n");
  }
}
```

### 模块 4：MultiDialogMerger (跨对话整合器)

```typescript
// lib/compression/multiDialogMerger.ts

export interface MergedDocument {
  title: string;
  content: string;
  sources: Array<{
    conversationId: number;
    title: string;
    platform: string;
    timestamp: number;
  }>;
  themes: string[];
}

export class MultiDialogMerger {
  private engine: TemplateEngine;
  
  constructor(engine: TemplateEngine) {
    this.engine = engine;
  }
  
  /**
   * 合并多个对话
   */
  async merge(
    conversations: Array<{
      conversation: Conversation;
      messages: Message[];
    }>,
    templateId: string,
    settings: LlmConfig
  ): Promise<MergedDocument> {
    // 1. 分别压缩每个对话
    const compressed = await Promise.all(
      conversations.map(async ({ conversation, messages }) => {
        const result = await this.engine.compress(messages, templateId, settings);
        return {
          conversation,
          compressed: result.content,
        };
      })
    );
    
    // 2. 整合所有压缩结果
    const mergedContent = this.integrateContents(compressed);
    
    // 3. 提取主题
    const themes = this.extractThemes(compressed);
    
    return {
      title: this.generateTitle(compressed),
      content: mergedContent,
      sources: conversations.map(c => ({
        conversationId: c.conversation.id,
        title: c.conversation.title,
        platform: c.conversation.platform,
        timestamp: c.conversation.created_at,
      })),
      themes,
    };
  }
  
  private integrateContents(
    compressed: Array<{ conversation: Conversation; compressed: string }>
  ): string {
    // 简单的整合策略：按时间顺序连接，添加来源标注
    const sorted = compressed.sort(
      (a, b) => (a.conversation.source_created_at || 0) - (b.conversation.source_created_at || 0)
    );
    
    const parts = sorted.map(({ conversation, compressed }) => {
      // 如果内容没有来源标注，添加一个
      if (!compressed.includes("[来自:")) {
        return `${compressed}\n\n[来自: ${conversation.title}]`;
      }
      return compressed;
    });
    
    return parts.join("\n\n---\n\n");
  }
  
  private extractThemes(
    compressed: Array<{ conversation: Conversation; compressed: string }>
  ): string[] {
    // 简单的主题提取：基于标题关键词
    const keywords = new Set<string>();
    
    for (const { conversation } of compressed) {
      const title = conversation.title.toLowerCase();
      // 提取技术关键词（简单实现）
      const techTerms = title.match(/\b(react|vue|angular|node|api|database|ui|ux)\b/gi);
      techTerms?.forEach(t => keywords.add(t.toLowerCase()));
    }
    
    return Array.from(keywords);
  }
  
  private generateTitle(
    compressed: Array<{ conversation: Conversation }>
  ): string {
    if (compressed.length === 1) {
      return compressed[0].conversation.title;
    }
    
    // 提取共同关键词
    const titles = compressed.map(c => c.conversation.title);
    const commonTerms = this.findCommonTerms(titles);
    
    if (commonTerms.length > 0) {
      return `${commonTerms.join(" ")} - 对话整合 (${compressed.length}个)`;
    }
    
    return `对话整合 - ${compressed.length}个对话`;
  }
  
  private findCommonTerms(titles: string[]): string[] {
    // 简单实现：找到所有标题中都出现的词
    if (titles.length === 0) return [];
    
    const words = titles.map(t => 
      t.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    );
    
    const first = words[0];
    return first.filter(word => 
      words.every(w => w.includes(word))
    );
  }
}
```

---

## 与现有系统集成

### 集成点 1：PACS CompressionService

```typescript
// lib/compression/compressionService.ts 扩展

export class CompressionService {
  private templateEngine: TemplateEngine;
  
  constructor(...) {
    // ... 现有初始化
    this.templateEngine = new TemplateEngine(templateLoader);
  }
  
  /**
   * 新增：使用模板压缩
   */
  async compressWithTemplate(
    messages: Message[],
    templateId: string,
    config?: TemplateCompressionConfig
  ): Promise<CompressionResult> {
    return this.templateEngine.compress(
      messages,
      templateId,
      this.llmSettings
    );
  }
  
  /**
   * 新增：批量模板压缩
   */
  async compressBatchWithTemplate(
    items: Array<{ conversationId: number; messages: Message[] }>,
    templateId: string
  ): Promise<Array<CompressionResult & { conversationId: number }>> {
    return Promise.all(
      items.map(async (item) => {
        const result = await this.compressWithTemplate(
          item.messages,
          templateId
        );
        return { ...result, conversationId: item.conversationId };
      })
    );
  }
}
```

### 集成点 2：导出功能

```typescript
// sidepanel/utils/exportConversations.ts 扩展

async function exportWithTemplate(
  conversations: Conversation[],
  templateId: string,
  config: ExportConfig
): Promise<ExportResult> {
  const service = await getCompressionService();
  
  // 获取消息
  const messagesMap = await loadMessages(conversations);
  
  // 使用模板压缩
  const results = await service.compressBatchWithTemplate(
    conversations.map(c => ({
      conversationId: c.id,
      messages: messagesMap.get(c.id) || [],
    })),
    templateId
  );
  
  // 如果是多对话且模板支持，进行跨对话整合
  if (conversations.length > 1 && templateId === "multi-dialog-migration") {
    const merger = new MultiDialogMerger(service["templateEngine"]);
    const merged = await merger.merge(
      conversations.map(c => ({
        conversation: c,
        messages: messagesMap.get(c.id) || [],
      })),
      templateId,
      service["llmSettings"]
    );
    
    return {
      content: merged.content,
      filename: generateFilename(conversations.length, "md", "merged"),
    };
  }
  
  // 单对话导出
  // ... 生成 Markdown
}
```

---

## 实施计划

### Phase 1：核心基础设施（Week 1）

| 任务 | 时间 | 产出 | 验收标准 |
|------|------|------|----------|
| 创建模板类型定义 | 0.5d | `types.ts` | 类型完整，覆盖所有场景 |
| 实现 TemplateLoader | 0.5d | `loader.ts` | 可注册/加载模板 |
| 实现 TemplateEngine | 2d | `engine.ts` | 可压缩并验证输出 |
| 实现 TemplateTester | 1d | `tester.ts` | 可独立测试模板 |
| 定义 2 个核心模板 | 1d | `templates/*.yaml` | 迁移、开发文档模板 |

**风险**: 🟢 极低（独立模块，不影响现有功能）

### Phase 2：场景模板开发（Week 2）

| 任务 | 时间 | 产出 | 验收标准 |
|------|------|------|----------|
| 优化迁移模板 | 1d | 模板 v1.1 | 测试通过率 > 90% |
| 优化开发文档模板 | 1d | 模板 v1.1 | 代码完整性验证 |
| 添加会议纪要模板 | 1d | 新模板 | 可用性验证 |
| 添加周报模板 | 1d | 新模板 | 可用性验证 |
| 模板测试套件 | 1d | 测试用例 | 覆盖 4 个模板 |

**风险**: 🟢 低（配置调整，秒级回滚）

### Phase 3：集成与验证（Week 3）

| 任务 | 时间 | 产出 | 验收标准 |
|------|------|------|----------|
| 集成到 CompressionService | 1d | 扩展 service | 向后兼容 |
| 集成到导出功能 | 1.5d | 新导出模式 | 原有功能正常 |
| 添加模板选择 UI | 1d | ExportDialog 扩展 | 4 个模板可选 |
| 端到端测试 | 1d | 测试报告 | 导出成功率 > 95% |
| 文档编写 | 0.5d | 使用文档 | 模板调整指南 |

**风险**: 🟡 中（UI 改动，需回归测试）

### Phase 4：优化迭代（Week 4+）

- 根据实际使用反馈调整模板
- 添加更多场景模板（设计交付、产品 PRD 等）
- 优化跨对话整合算法

---

## 验证方案

### 单元测试

```typescript
// 模板加载测试
describe("TemplateLoader", () => {
  it("should register and load template", () => {
    const loader = new TemplateLoader();
    loader.register(MIGRATION_TEMPLATE);
    expect(loader.load("multi-dialog-migration")).toBeDefined();
  });
});

// 模板引擎测试
describe("TemplateEngine", () => {
  it("should compress with migration template", async () => {
    const engine = new TemplateEngine(loader);
    const result = await engine.compress(messages, "multi-dialog-migration", mockSettings);
    
    expect(result.content).toContain("[来自:");
    expect(result.content).toContain("### 关键要点");
    expect(result.metadata.compressionRatio).toBeLessThan(0.5);
  });
});

// 模板验证测试
describe("Template Validation", () => {
  it("should detect forbidden patterns", () => {
    const engine = new TemplateEngine(loader);
    const validation = engine.validate(
      "## Core Logic Chain\ncontent",
      MIGRATION_TEMPLATE
    );
    
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain("Found forbidden pattern: ## Core Logic");
  });
});
```

### 集成测试

```typescript
// 导出功能集成测试
describe("Export with Template", () => {
  it("should export with migration template", async () => {
    const result = await exportConversations(
      conversations,
      { template: "multi-dialog-migration", format: "md" }
    );
    
    expect(result.content).not.toContain("## Core Logic Chain");
    expect(result.content).not.toContain("## Concept Matrix");
    expect(result.content).toContain("[来自:");
  });
});
```

### 手动验证清单

- [ ] 迁移模板输出无嵌套标题
- [ ] 开发文档模板保留完整代码
- [ ] 会议纪要模板包含待办清单
- [ ] 多对话导出正确标注来源
- [ ] 模板切换即时生效
- [ ] 原有导出功能不受影响

---

## 附录

### A. 模板配置文件示例

```typescript
// config/templates.ts

import { ExportTemplate } from "./types";

export const DEFAULT_TEMPLATES: ExportTemplate[] = [
  MIGRATION_TEMPLATE,
  DEV_DOC_TEMPLATE,
  MEETING_TEMPLATE,
  WEEKLY_TEMPLATE,
];

// 用户自定义模板（可覆盖默认）
export const CUSTOM_TEMPLATES: ExportTemplate[] = [
  // 用户可在配置中添加自定义模板
];
```

### B. 模板调整快速指南

**调整输出长度**:
```yaml
structure:
  - id: "summary"
    maxLength: 300  # 修改此处
```

**添加新的必需模式**:
```yaml
validation:
  requiredPatterns:
    - "[来自:"
    - "### 关键要点"
    - "### 新的必需模式"  # 添加此处
```

**禁止特定内容**:
```yaml
validation:
  forbiddenPatterns:
    - "详细解释"
    - "背景介绍"
```

### C. 相关文档索引

- `02_pacs_architecture_design_v2.md` - PACS 原始架构
- `05_pacs_final_summary_complete.md` - PACS 实现总结
- `07_tdc_template_driven_compression_design.md` - 本文档

---

## 待讨论事项

1. **模板存储方式**
   - 选项 A：TypeScript 代码（类型安全，需 rebuild）
   - 选项 B：JSON/YAML 文件（热重载，配置化）
   - 选项 C：IndexedDB（用户可自定义）

2. **默认模板数量**
   - 极简版：2 个（迁移、开发文档）
   - 标准版：4 个（迁移、开发文档、会议纪要、周报）
   - 完整版：6+ 个

3. **跨对话整合策略**
   - 选项 A：简单连接（当前设计）
   - 选项 B：LLM 二次整合（增加一次调用）
   - 选项 C：主题聚类后分别整合

4. **与现有 Tier 系统的关系**
   - 选项 A：TDC 完全替代 Tier 2
   - 选项 B：TDC 作为 Tier 2 的 "Template Mode"
   - 选项 C：TDC 独立，Tier 系统保留

---

*本文档封存于 2026-03-15，待讨论后进入开发阶段。*
