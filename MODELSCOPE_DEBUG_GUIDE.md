# ModelScope 路由调试指南

本文档提供全面的 ModelScope 路由调试工具和方法，帮助诊断和解决集成问题。

## 📋 目录

1. [快速诊断](#快速诊断)
2. [调试工具使用](#调试工具使用)
3. [常见问题排查](#常见问题排查)
4. [测试用例](#测试用例)
5. [诊断报告解读](#诊断报告解读)

---

## 快速诊断

### 1. 浏览器控制台快速测试

打开 VESTI 扩展的 DevTools 控制台，运行：

```javascript
// 加载调试面板
await import('/src/lib/services/__tests__/routeTestPanel.ts');

// 运行全面诊断
await window.vestiRouteTest.runAll();
```

### 2. 检查当前配置

```javascript
await window.vestiRouteTest.testConfig();
```

输出示例：
```
Configuration Mode: custom_byok
Is Valid: ✅

⚠️  Warnings:
  [MISSING] proxyServiceToken: No proxy service token configured
      💡 Some proxy servers require a service token...

✅ Configuration is valid!
```

### 3. 测试网络连通性

```javascript
await window.vestiRouteTest.testConnectivity();
```

---

## 调试工具使用

### 工具模块位置

```
frontend/src/lib/services/
├── llmRouteDebugger.ts      # 核心调试工具
├── llmDiagnostics.ts        # 追踪和诊断
└── __tests__/
    ├── llmService.test.ts   # 单元测试
    └── routeTestPanel.ts    # 交互式测试面板
```

### 使用 llmRouteDebugger

```typescript
import { 
  validateLlmConfig, 
  testModelScopeRoute,
  generateMockModelScopeResponse 
} from './services/llmRouteDebugger';

// 验证配置
const validation = validateLlmConfig(config);
console.log(validation.isValid);  // true/false
console.log(validation.errors);   // 错误列表
console.log(validation.warnings); // 警告列表

// 测试路由
const result = await testModelScopeRoute(config, { 
  timeoutMs: 30000,
  verbose: true 
});

if (!result.success) {
  console.error(result.stage);      // 失败阶段: config/network/auth/request/response
  console.error(result.message);    // 错误信息
  console.log(result.suggestions);  // 修复建议
}
```

### 使用 llmDiagnostics（运行时追踪）

```typescript
import { globalTracer, globalIssueDetector, getDiagnosticReport } from './services/llmDiagnostics';

// 运行一些请求后...

// 生成完整诊断报告
console.log(getDiagnosticReport());

// 获取追踪时间线
console.log(globalTracer.generateTimeline());

// 检测常见问题
const issues = globalIssueDetector.detectIssues();
issues.forEach(issue => {
  console.log(`${issue.severity}: ${issue.title}`);
  console.log(issue.suggestions);
});
```

### 浏览器控制台全局对象

加载后，以下全局对象可用：

| 对象 | 用途 |
|------|------|
| `window.vestiRouteTest` | 交互式测试面板 |
| `window.vestiDiagnostics` | 诊断工具和追踪器 |
| `window.runLLMTests` | 运行单元测试 |

---

## 常见问题排查

### ❌ 问题：401 Unauthorized（认证失败）

**症状：**
```
Status: 401
Code: modelscope_byok_auth_invalid
Message: Direct ModelScope chat authentication failed for the configured BYOK key.
```

**排查步骤：**

1. **检查 API Key 格式**
   ```javascript
   const config = await getLlmSettings();
   console.log(config.apiKey?.slice(0, 10) + '...'); // 确保不为空
   ```

2. **验证 API Key 有效性**
   ```bash
   curl https://api-inference.modelscope.cn/v1/chat/completions \
     -H "Authorization: Bearer $YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model": "moonshotai/Kimi-K2.5", "messages": [{"role": "user", "content": "Hi"}]}'
   ```

3. **检查 Key 是否过期**
   - 登录 [ModelScope 控制台](https://modelscope.cn/)
   - 检查 API Key 状态和有效期

**修复建议：**
- 重新生成 API Key
- 确保 Key 有调用目标模型的权限
- 检查 Key 是否有 IP 白名单限制

---

### ❌ 问题：404 Model Not Found

**症状：**
```
Status: 404
Message: Model or endpoint not found
```

**排查步骤：**

1. **验证模型 ID**
   ```javascript
   import { BYOK_MODEL_WHITELIST } from './services/llmConfig';
   console.log(BYOK_MODEL_WHITELIST); // 查看支持的模型列表
   ```

2. **检查模型可用性**
   ```bash
   curl https://api-inference.modelscope.cn/v1/models \
     -H "Authorization: Bearer $YOUR_API_KEY"
   ```

**修复建议：**
- 使用白名单中的模型 ID
- 确认模型名称拼写正确（区分大小写）
- 确认模型在您所在的区域可用

---

### ❌ 问题：429 Rate Limited

**症状：**
```
Status: 429
Code: RATE_LIMITED
Message: Rate limit exceeded
```

**排查步骤：**

1. **检查请求频率**
   ```javascript
   // 在 llmDiagnostics 中查看请求历史
   console.log(window.vestiDiagnostics.tracer.getEvents());
   ```

2. **查看重试建议**
   ```javascript
   const result = await testModelScopeRoute(config);
   console.log(result.suggestions); // 包含 retry-after 建议
   ```

**修复建议：**
- 实现指数退避重试机制
- 降低请求频率
- 联系 ModelScope 提升配额

---

### ❌ 问题：JSON 解析失败

**症状：**
```
Mode: plain_text (expected json_mode)
Parse Error: Unexpected token...
```

**排查步骤：**

1. **检查模型 JSON 支持**
   ```javascript
   import { getLlmModelProfile } from './services/llmModelProfile';
   const profile = getLlmModelProfile('your-model');
   console.log(profile.responseFormatStrategy); // "json_mode_first" or "prompt_json_first"
   ```

2. **查看 Fallback 情况**
   ```javascript
   // 检查诊断报告中的 FALLBACK_TRIGGERED 事件
   window.vestiRouteTest.showReport();
   ```

**修复建议：**
- 更新模型配置文件使用正确的策略
- 为不支持 JSON mode 的模型使用 prompt_json
- 启用 reasoning_content JSON 恢复（对于 DeepSeek R1 等模型）

---

### ❌ 问题：网络超时

**症状：**
```
Request timed out after 30000ms
Stage: request
```

**排查步骤：**

1. **测试网络连通性**
   ```bash
   ping api-inference.modelscope.cn
   curl -w "@curl-format.txt" https://api-inference.modelscope.cn/v1/models
   ```

2. **检查代理/VPN**
   ```javascript
   await window.vestiRouteTest.testConnectivity();
   ```

**修复建议：**
- 检查防火墙设置
- 尝试更换 DNS（8.8.8.8 / 114.114.114.114）
- 使用代理时检查代理配置
- 增加请求超时时间

---

## 测试用例

### 手动测试检查清单

- [ ] **配置验证测试**
  ```javascript
  await window.vestiRouteTest.testConfig();
  // 预期：无 ERROR 级别错误
  ```

- [ ] **网络连通性测试**
  ```javascript
  await window.vestiRouteTest.testConnectivity();
  // 预期：success = true
  ```

- [ ] **简单提示词测试**
  ```javascript
  await window.vestiRouteTest.testPrompt("Say hello");
  // 预期：正常返回文本
  ```

- [ ] **JSON 输出测试**
  ```javascript
  await window.vestiRouteTest.testJsonModes();
  // 预期：两种模式都返回有效 JSON
  ```

- [ ] **双路由对比测试**
  ```javascript
  await window.vestiRouteTest.testDirectRoutes();
  // 预期：ModelScope 和 Proxy 都能正常工作
  ```

- [ ] **长时间运行测试**
  ```javascript
  for (let i = 0; i < 10; i++) {
    await window.vestiRouteTest.testPrompt(`Test ${i}`);
    await new Promise(r => setTimeout(r, 1000));
  }
  // 预期：所有请求都成功，无 rate limit
  ```

---

## 诊断报告解读

### 示例诊断时间线

```
================================================================================
MODELSCOPE ROUTE DIAGNOSTIC TIMELINE
================================================================================

📦 Request: req-1-abc123
----------------------------------------
  [14:32:15.123] 🛤️ ROUTE_SELECTED
      Route: modelscope
      Model: moonshotai/Kimi-K2.5
      Family: moonshot_kimi
  [14:32:15.234] 📋 REQUEST_PREPARED
      URL: https://api-inference.modelscope.cn/v1/chat/completions
      Method: POST
      Payload Size: 456 bytes
  [14:32:15.235] 📤 REQUEST_SENT
  [14:32:16.456] 📥 RESPONSE_RECEIVED
      Status: 200
      Latency: 1221ms
  [14:32:16.457] 🔍 RESPONSE_PARSED
      Has Content: true
      Has Reasoning Content: false
      Content Length: 1234
      Mode: prompt_json
      Finish Reason: stop

================================================================================
```

### 事件类型说明

| 图标 | 事件类型 | 说明 |
|------|---------|------|
| 🛤️ | ROUTE_SELECTED | 路由选择完成 |
| 📋 | REQUEST_PREPARED | 请求准备完成 |
| 📤 | REQUEST_SENT | 请求已发送 |
| 📥 | RESPONSE_RECEIVED | 响应已接收 |
| 🔍 | RESPONSE_PARSED | 响应解析完成 |
| ❌ | ERROR_OCCURRED | 发生错误 |
| 🔄 | FALLBACK_TRIGGERED | 触发 Fallback |
| 💎 | JSON_RECOVERED | 从 reasoning_content 恢复 JSON |

---

## 高级调试

### 启用详细日志

在 `llmService.ts` 中修改日志级别：

```typescript
import { logger } from '../utils/logger';

// 临时启用详细日志
logger.setLevel('debug');

// 执行操作后恢复
logger.setLevel('info');
```

### 捕获原始请求/响应

```typescript
// 在浏览器 Network 面板中
// 1. 打开 DevTools → Network
// 2. 过滤 "modelscope"
// 3. 查看请求 Headers 和 Payload
// 4. 查看响应详情
```

### 导出诊断报告

```javascript
// 生成完整报告
const report = window.vestiDiagnostics.getReport();

// 复制到剪贴板
navigator.clipboard.writeText(report);

// 或下载为文件
const blob = new Blob([report], { type: 'text/plain' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'vesti-diagnostic-report.txt';
a.click();
```

---

## 获取帮助

如果以上方法无法解决问题：

1. **导出诊断报告**
   ```javascript
   window.vestiDiagnostics.getReport();
   ```

2. **查看测试历史**
   ```javascript
   window.vestiRouteTest.showHistory();
   ```

3. **提交 Issue** 时附上：
   - 诊断报告
   - 浏览器版本和扩展版本
   - 复现步骤
   - 配置截图（脱敏后）

---

*最后更新：2024年 - VESTI AI Team*
