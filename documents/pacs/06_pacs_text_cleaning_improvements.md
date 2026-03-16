# PACS 文本清理改进

## 改进概述

针对用户反馈的"压缩文本残留对话标签"问题，已添加完整的文本清理系统。

## 新增功能

### 1. 文本清理模块 (`textCleaner.ts`)

**清理目标**:
- `[User]`, `[AI]`, `[Assistant]` 等角色标签
- `User:`, `AI:` 等冒号前缀
- 时间戳 (如 `10:30 AM`, `2024-01-01`)
- 数字序号前缀 (如 `1. `, `2. `)
- 角色独占行

**清理级别**:

| 方法 | 用途 | 强度 |
|------|------|------|
| `smartClean()` | 通用清理，保留代码块 | 中等 |
| `deepClean()` | 深度清理，移除所有格式 | 强 |
| `cleanTier1Output()` | Tier 1 压缩专用 | 轻 |
| `cleanTier2Output()` | Tier 2 压缩专用 | 中 |
| `cleanTier3Output()` | Tier 3 压缩专用 | 轻 |

### 2. 智能保护机制

清理过程中会保护以下内容不被破坏：
- 代码块 (```code```)
- 行内代码 (`code`)
- Markdown 标题 (## Heading)
- 列表项 (- item)
- 引用块 (> quote)

### 3. 集成点

**CompressionService**:
- 在返回结果前自动应用清理
- 根据压缩级别选择相应的清理方式
- 验证清理效果，记录残留标签

```typescript
// 压缩后自动清理
const cleanedContent = cleanByLevel(result.content, targetLevel);
result.content = cleanedContent;
result.metadata.compressedLength = cleanedContent.length;
```

**Tier 1 (Semantic Chunking)**:
- 每个分块内容单独清理
- 最终输出再次清理

**Tier 2 (Hierarchical Summary)**:
- 保护章节结构
- 清理逻辑链内容中的标签
- 保留 Agent A 格式

### 4. 验证机制

```typescript
const validation = validateCleaning(original, cleaned);
// {
//   isClean: boolean,           // 是否完全清理
//   remainingLabels: string[],  // 残留的标签
//   stats: { originalLength, cleanedLength, reduction }
// }
```

## 使用方式

### 快速清理

```typescript
import { quickClean } from "~lib/compression";

const cleaned = quickClean(rawText);
```

### 按级别清理

```typescript
import { cleanByLevel } from "~lib/compression";

const cleaned = cleanByLevel(text, "hierarchical");
```

### 清理工具类

```typescript
import { TextCleaner } from "~lib/compression";

const cleaner = new TextCleaner();
const cleaned = cleaner.clean(text, "semantic");
```

## 测试验证

### 测试案例

**输入示例** (含标签):
```
1. [User] What is React?
   
2. [AI] React is a JavaScript library.
   Time: 10:30 AM
   
3. [User] How does it work?
```

**清理后输出**:
```
What is React?

React is a JavaScript library.

How does it work?
```

### 验证日志

清理后会输出日志：
```
[compression] Compression completed
[compression] Content cleaned, removed 5 labels
[compression] Remaining labels: []  // 空数组表示完全清理
```

## 文件变更

```
frontend/src/lib/compression/
├── textCleaner.ts          # 新增：文本清理模块 (300+ 行)
├── compressionService.ts   # 修改：集成清理逻辑
└── index.ts                # 修改：导出清理工具
```

## 构建信息

- **构建路径**: `/mnt/c/Users/a/Documents/GitHub/VESTI/frontend/build/chrome-mv3-prod/`
- **构建时间**: ~2 分钟
- **新增代码**: ~300 行

## 测试步骤

1. 重新加载扩展
2. 打开任意对话
3. 导出为 Compact 模式
4. 检查输出内容是否干净（无 [User]/[AI] 标签）
5. 检查 Console 日志确认清理生效

## 后续优化建议

1. **自定义清理规则**: 允许用户配置要保留/移除的标签模式
2. **多语言支持**: 针对不同语言的角色标签（如"用户"、"助手"）
3. **智能识别**: 识别并保留重要的角色上下文信息
