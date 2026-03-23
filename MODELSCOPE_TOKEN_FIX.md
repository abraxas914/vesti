# ModelScope Access Token 问题诊断与修复

## 🔍 问题分析

### 你的 Token
```
ms-e3c89329-c116-493e-8476-3d499f40d275
```

### 错误信息
```
Direct ModelScope chat authentication failed for the configured BYOK key.
Route: ModelScope direct | HTTP 401 | Request: 76ec0dff-5eea-4450-ae13-4581a2974878
```

### 根本原因
ModelScope Access Token 有两种使用方式：

1. **带 `ms-` 前缀**：`Bearer ms-e3c89329-c116-493e-8476-3d499f40d275`
2. **不带 `ms-` 前缀**：`Bearer e3c89329-c116-493e-8476-3d499f40d275`

根据社区文档（配置 Claude Code 等工具时的经验），**某些情况下需要去掉 `ms-` 前缀**才能通过认证。

---

## ✅ 修复方案

### 方案 1：自动重试（已集成到代码）

我已经修改了 `llmService.ts`，现在代码会自动尝试两种格式：

```typescript
// 1. 首先尝试带 ms- 前缀
Authorization: Bearer ms-e3c89329-c116-493e-8476-3d499f40d275

// 2. 如果 401，自动尝试不带前缀
Authorization: Bearer e3c89329-c116-493e-8476-3d499f40d275
```

### 方案 2：手动测试正确格式

在浏览器控制台运行：

```javascript
// 加载测试工具
await import('/src/lib/services/modelscopeTokenTest.ts');

// 测试你的 Token
await window.modelscopeTokenTest.test('ms-e3c89329-c116-493e-8476-3d499f40d275');
```

### 方案 3：快速验证

在浏览器控制台运行：

```javascript
// 去掉 ms- 前缀测试
const tokenWithoutPrefix = 'e3c89329-c116-493e-8476-3d499f40d275';

const response = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${tokenWithoutPrefix}`
  },
  body: JSON.stringify({
    model: 'Qwen/Qwen2.5-Coder-32B-Instruct',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 10
  })
});

console.log('Status:', response.status);
console.log('Response:', await response.text());
```

---

## 📋 ModelScope API-Inference 正确调用方式

### Endpoint
```
POST https://api-inference.modelscope.cn/v1/chat/completions
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN_WITHOUT_MS_PREFIX}
```

### Request Body
```json
{
  "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "max_tokens": 1024
}
```

### 支持的模型
- `Qwen/Qwen2.5-Coder-32B-Instruct`
- `Qwen/Qwen2.5-7B-Instruct`
- `deepseek-ai/DeepSeek-V3`
- `deepseek-ai/DeepSeek-R1`
- 更多模型见：https://modelscope.cn/models

---

## 🔧 修改的文件

### 1. `frontend/src/lib/services/llmService.ts`
增强 `requestModelScope` 函数，添加自动重试逻辑：
- 首先尝试带 `ms-` 前缀的 token
- 如果返回 401，自动尝试不带前缀的 token
- 记录日志以便调试

### 2. 新增 `frontend/src/lib/services/modelscopeTokenHelper.ts`
Token 分析和格式化工具：
- 分析 token 格式
- 提供格式化建议
- 生成多种变体供测试

### 3. 新增 `frontend/src/lib/services/modelscopeTokenTest.ts`
浏览器控制台测试工具：
- 一键测试 token 的多种格式
- 自动推荐正确格式

---

## 🧪 测试步骤

### Step 1: 构建项目
```bash
cd /mnt/c/Users/a/Documents/GitHub/VESTI/frontend
pnpm run build
```

### Step 2: 重新加载扩展
1. 打开 Chrome `chrome://extensions/`
2. 找到 VESTI 扩展
3. 点击刷新按钮

### Step 3: 测试连接
1. 打开 VESTI Sidepanel
2. 进入设置页面
3. 保持当前配置（使用你的 Token）
4. 点击"测试连接"

### Step 4: 查看日志
在浏览器 DevTools 控制台查看日志：
```
[llm] ModelScope request prepared
[llm] ModelScope auth failed with ms- prefix, retrying without prefix
[llm] ModelScope auth succeeded WITHOUT ms- prefix
```

---

## 📝 如果仍然失败

### 检查清单

- [ ] Token 是否已过期？
  - 访问 https://modelscope.cn/my/myaccesstoken 检查
  
- [ ] Token 是否已绑定阿里云账号？
  - ModelScope API-Inference 需要绑定阿里云账号
  
- [ ] 是否选择了正确的模型？
  - 确认模型 ID 正确无误
  
- [ ] 网络是否通畅？
  - 尝试直接 curl 测试

### 手动 Curl 测试

```bash
# 测试带前缀
curl -X POST https://api-inference.modelscope.cn/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ms-e3c89329-c116-493e-8476-3d499f40d275" \
  -d '{
    "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'

# 测试不带前缀
curl -X POST https://api-inference.modelscope.cn/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer e3c89329-c116-493e-8476-3d499f40d275" \
  -d '{
    "model": "Qwen/Qwen2.5-Coder-32B-Instruct",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

---

## 🎯 预期结果

修复后，VESTI 应该能够：
1. 自动检测 `ms-` 前缀
2. 在 401 错误时自动尝试不带前缀的格式
3. 记录使用了哪种格式成功
4. 正常调用 ModelScope API-Inference

---

## 📚 参考文档

- [ModelScope 官方文档](https://modelscope.cn/docs)
- [获取 Access Token](https://modelscope.cn/my/myaccesstoken)
- [ModelScope 模型列表](https://modelscope.cn/models)

---

*修复时间：2024年*  
*修复内容：自动处理 ModelScope Access Token 前缀问题*
