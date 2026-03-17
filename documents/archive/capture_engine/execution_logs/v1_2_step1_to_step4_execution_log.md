# Vesti v1.2 Capture Engine Step1-Step4 工程操作记录

Version: v1.2  
Status: Implemented (Step1-Step4)  
Owner: Vesti FE/Extension

---

## 1. 文档目的

本文件用于沉淀 v1.2 从 Step1 到 Step4 的**实际工程落地动作**，作为后续排查、回归和 v1.3 扩展的实现基线。  
重点记录：
- 每一步改了什么（行为变化）
- 改在哪些文件（实现位置）
- 当前边界与已知限制

---

## 2. Step1 - Capture Settings 落盘 + Settings 轻量 UI

### 2.1 目标
- 新增 Capture Engine 配置模型
- 设置页可编辑并保存 `mirror/smart/manual`
- 先不改变捕获写库行为

### 2.2 主要工程操作
1. 新增 Capture 设置模型：
   - `CaptureMode = "mirror" | "smart" | "manual"`
   - `CaptureSettings`（含 `smartConfig.minTurns` / `blacklistKeywords`）
2. 新增本地设置服务：
   - storage key: `vesti_capture_settings`
   - 兼容旧值映射：`full_mirror/smart_denoise/curator`
   - 标准化：`minTurns` clamp 到 `1..20`，黑名单去空去重
3. Settings 新增 `Capture Engine` 卡片：
   - 模式单选 + smart 子配置输入
   - `Archive Active Thread Now` 先做 disabled 占位

### 2.3 核心文件
- `frontend/src/lib/types/index.ts`
- `frontend/src/lib/services/captureSettingsService.ts`
- `frontend/src/sidepanel/pages/SettingsPage.tsx`

---

## 3. Step2 - Gatekeeper 生效（smart/manual 拦截）

### 3.1 目标
- mirror 透传
- smart 按阈值和黑名单拦截
- manual 硬拦截
- 仅真实写库成功才触发数据刷新事件

### 3.2 主要工程操作
1. 扩展 CAPTURE 决策类型：
   - `CaptureDecision` / `CaptureDecisionReason` / `CaptureDecisionMeta`
2. 扩展协议：
   - `CAPTURE_CONVERSATION` 响应返回 `decision`
   - payload 预埋 `forceFlag?: boolean`
3. 新增 Gatekeeper：
   - `storage-interceptor.ts`
   - 统一输出 `committed/held/rejected` + reason
4. runtime 接线：
   - `offscreen/background` 从直接 `deduplicateAndSave` 改为先走拦截器
5. pipeline 事件修正：
   - `saved === true` 才发送 `VESTI_DATA_UPDATED`

### 3.3 核心文件
- `frontend/src/lib/capture/storage-interceptor.ts`
- `frontend/src/lib/messaging/protocol.ts`
- `frontend/src/lib/types/index.ts`
- `frontend/src/offscreen/index.ts`
- `frontend/src/background/index.ts`
- `frontend/src/lib/core/pipeline/capturePipeline.ts`
- `frontend/src/contents/chatgpt.ts`
- `frontend/src/contents/claude.ts`

---

## 4. Step3 - 会话身份硬化 + 可信时间基线

### 4.1 目标
- 以稳定会话 ID 为写库前提
- 会话主键语义升级为 `platform + uuid`
- `Created At` 展示优先 `source_created_at`

### 4.2 主要工程操作
1. Parser 合同升级：
   - `getSessionUUID(): string | null`
   - 新增 `getSourceCreatedAt(): number | null`
2. 去掉伪 ID fallback：
   - URL 无稳定 ID 时不再用 `Date.now()` 伪造 uuid
3. Gatekeeper 前置拦截：
   - 新增 reason: `missing_conversation_id`
4. 数据模型升级：
   - `Conversation/ConversationDraft` 增加 `source_created_at: number | null`
   - Dexie 升级到 `version(3)`，新增索引：
     - `source_created_at`
     - `[platform+uuid]`
   - 旧数据补齐 `source_created_at = null`
5. 去重查询升级：
   - 从 `where("uuid")` 改为 `[platform+uuid]`
6. 用户可见时间接入：
   - 复制全文、TXT/MD 导出线程头、时间跨度计算采用  
     `displayCreatedAt = source_created_at ?? created_at`

### 4.3 核心文件
- `frontend/src/lib/core/parser/IParser.ts`
- `frontend/src/lib/core/parser/chatgpt/ChatGPTParser.ts`
- `frontend/src/lib/core/parser/claude/ClaudeParser.ts`
- `frontend/src/lib/core/parser/shared/selectorUtils.ts`
- `frontend/src/lib/core/pipeline/capturePipeline.ts`
- `frontend/src/lib/capture/storage-interceptor.ts`
- `frontend/src/lib/core/middleware/deduplicate.ts`
- `frontend/src/lib/db/schema.ts`
- `frontend/src/lib/messaging/protocol.ts`
- `frontend/src/lib/types/index.ts`
- `frontend/src/sidepanel/containers/ConversationList.tsx`
- `frontend/src/lib/services/exportSerializers.ts`

---

## 5. Step4 - 手动保存（Sidepanel）

### 5.1 目标
- 在 smart/manual 模式下允许手动强制归档
- 保持 ID 基线：无稳定会话 ID 时仍禁止强存

### 5.2 主要工程操作
1. 协议扩展（background target）：
   - `GET_ACTIVE_CAPTURE_STATUS`
   - `FORCE_ARCHIVE_TRANSIENT`
2. 内容脚本 transient store：
   - 维护 latest payload / lastDecision / updatedAt（内存态）
   - 支持 `GET_TRANSIENT_CAPTURE_STATUS`
   - 支持 `FORCE_ARCHIVE_TRANSIENT` 并转发 CAPTURE(`forceFlag=true`)
3. Background 主控编排：
   - active tab 获取 + 域名支持校验（ChatGPT/Claude）
   - mirror 模式禁止手动归档（`ARCHIVE_MODE_DISABLED`）
   - 转发到 active tab content script
4. Gatekeeper 语义补齐：
   - 新增 reason: `force_archive`
   - 决策顺序固定：
     - `empty_payload`
     - `missing_conversation_id`（force 不绕过）
     - `force_archive`
     - mirror/smart/manual
5. Settings 启用交互：
   - 归档按钮在 smart/manual 且 transient 可用时可点
   - 轮询 active capture status（3s）
   - 成功显示摘要（reason + messageCount）
   - 失败显示标准错误映射

### 5.3 核心文件
- `frontend/src/lib/messaging/protocol.ts`
- `frontend/src/lib/types/index.ts`
- `frontend/src/lib/services/storageService.ts`
- `frontend/src/lib/capture/transient-store.ts`
- `frontend/src/contents/chatgpt.ts`
- `frontend/src/contents/claude.ts`
- `frontend/src/background/index.ts`
- `frontend/src/lib/capture/storage-interceptor.ts`
- `frontend/src/sidepanel/pages/SettingsPage.tsx`

---

## 6. Step1-Step4 之后的完整链路

1. 内容脚本 observer 解析消息  
2. 更新 transient（内存快照）  
3. 自动捕获请求 `CAPTURE_CONVERSATION` -> gatekeeper 判定  
4. smart/manual 可能 held；mirror 或条件达成则 committed  
5. 用户点击 Settings 手动归档  
6. Sidepanel -> Background -> Active Tab Content Script  
7. Content Script 用 transient payload 发 `CAPTURE_CONVERSATION(forceFlag=true)`  
8. gatekeeper 输出 `force_archive` 或拦截原因  
9. 成功写库触发 `VESTI_DATA_UPDATED`

---

## 7. 错误码与判定口径（当前）

### 7.1 手动归档调用错误码
- `ARCHIVE_MODE_DISABLED`
- `ACTIVE_TAB_UNSUPPORTED`
- `ACTIVE_TAB_UNAVAILABLE`
- `TRANSIENT_NOT_FOUND`
- `FORCE_ARCHIVE_FAILED`

### 7.2 Capture decision reason（关键）
- `missing_conversation_id`
- `force_archive`
- `mode_mirror`
- `mode_manual_hold`
- `smart_below_min_turns`
- `smart_keyword_blocked`
- `smart_pass`
- `empty_payload`
- `storage_limit_blocked`
- `persist_failed`

---

## 8. 已知限制（截至 Step4）

1. transient 仅驻留内容脚本内存，页面刷新/关闭会丢失（设计内接受）。  
2. Claude 的 `source_created_at` 多数场景不可稳定提取，当前允许回退 `created_at`。  
3. 手动归档仅 Sidepanel 入口；尚未提供页面悬浮按钮入口。  
4. 仅覆盖 ChatGPT/Claude；多平台扩展在 v1.3。

---

## 9. 回归验证命令（每步执行）

- `pnpm -C frontend build`
- `pnpm -C frontend package`

---

## 10. 后续衔接建议（v1.2 后半段 / v1.3 前置）

1. 为 `GET_ACTIVE_CAPTURE_STATUS` 增加更细粒度可观测日志（tabId/platform/decision）。  
2. 在 sampling 文档中补一组 “missing_conversation_id -> later commit” 的标准复现样例。  
3. v1.3 平台扩展时沿用同一 transient + force archive 协议，不再拆分实现分支。  
