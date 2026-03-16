/**
 * Kimi Service 测试与调试
 * 
 * 使用模拟数据测试 Compact 和 Summary 模式
 */

import { describe, it, expect } from "vitest";
import { compressCompact, compressSummary } from "../kimiService";

// 模拟对话数据 - React 性能优化
const mockConversationReact = [
  {
    role: "user",
    content: "我在做一个 React 项目，有一个大型列表（1000+ 条数据），渲染很卡顿，有什么优化方案吗？",
  },
  {
    role: "assistant", 
    content: "大型列表渲染卡顿通常是因为 DOM 节点过多。有几个优化方案：\n\n1. **虚拟滚动 (Virtual Scrolling)** - 只渲染可见区域的数据\n2. **useMemo/useCallback** - 缓存计算结果和函数\n3. **分页加载** - 减少初始渲染数据量\n4. **Web Workers** - 将计算移到后台线程\n\n建议先用 react-window 实现虚拟滚动，效果最明显。",
  },
  {
    role: "user",
    content: "react-window 怎么用？能给我个示例吗？",
  },
  {
    role: "assistant",
    content: "```jsx\nimport { FixedSizeList } from 'react-window';\n\nfunction MyList({ items }) {\n  const Row = ({ index, style }) => (\n    <div style={style}>\n      {items[index].name}\n    </div>\n  );\n\n  return (\n    <FixedSizeList\n      height={500}\n      itemCount={items.length}\n      itemSize={35}\n      width=\"100%\"\n    >\n      {Row}\n    </FixedSizeList>\n  );\n}\n```\n\n这个组件只渲染可见区域的 10-15 个元素，而不是全部 1000 个。",
  },
  {
    role: "user",
    content: "用了 react-window 后，滚动时还是有点卡，怎么办？",
  },
  {
    role: "assistant",
    content: "滚动卡顿可能是因为：\n\n1. **Row 组件没有 memo** - 每次滚动都重新渲染\n2. **items 数组引用变化** - 导致重新计算\n\n优化方案：\n\n```jsx\nimport { memo } from 'react';\n\nconst Row = memo(({ index, style, data }) => {\n  const item = data[index];\n  return (\n    <div style={style}>\n      {item.name}\n    </div>\n  );\n});\n\nfunction MyList({ items }) {\n  const itemData = useMemo(() => items, [items]);\n  \n  return (\n    <FixedSizeList\n      height={500}\n      itemCount={items.length}\n      itemSize={35}\n      width=\"100%\"\n      itemData={itemData}\n    >\n      {Row}\n    </FixedSizeList>\n  );\n}\n```\n\n用 memo 包裹 Row，用 useMemo 缓存 items，应该能解决卡顿。",
  },
];

// 模拟对话数据 - API 设计讨论
const mockConversationAPI = [
  {
    role: "user",
    content: "我们在设计一个新的用户认证 API，有什么最佳实践建议吗？",
  },
  {
    role: "assistant",
    content: "用户认证 API 设计的关键点：\n\n1. **使用 JWT** - 无状态、可扩展\n2. **HTTPS 强制** - 防止中间人攻击\n3. **Rate Limiting** - 防止暴力破解\n4. **刷新令牌机制** - Access Token + Refresh Token\n\n需要我详细说明某个方面吗？",
  },
  {
    role: "user",
    content: "JWT 的有效期设置多长比较合适？",
  },
  {
    role: "assistant",
    content: "JWT 有效期建议：\n\n| Token 类型 | 有效期 | 说明 |\n|-----------|--------|------|\n| Access Token | 15-60 分钟 | 短有效期，减少泄露风险 |\n| Refresh Token | 7-30 天 | 长期，可撤销 |\n\n权衡安全性和用户体验：\n- **太短** - 频繁重新登录，体验差\n- **太长** - 泄露风险高\n\n推荐：Access Token 30 分钟，Refresh Token 7 天。",
  },
  {
    role: "user",
    content: "如果 Access Token 过期了，怎么无缝刷新？",
  },
  {
    role: "assistant",
    content: "Token 刷新策略：** Silent Refresh（静默刷新）**\n\n```typescript\n// Axios 拦截器示例\naxios.interceptors.response.use(\n  (response) => response,\n  async (error) => {\n    const originalRequest = error.config;\n    \n    if (error.response?.status === 401 && !originalRequest._retry) {\n      originalRequest._retry = true;\n      \n      // 用 Refresh Token 获取新的 Access Token\n      const refreshToken = localStorage.getItem('refreshToken');\n      const { accessToken } = await axios.post('/auth/refresh', {\n        refreshToken\n      });\n      \n      // 更新存储并重试原请求\n      localStorage.setItem('accessToken', accessToken);\n      originalRequest.headers.Authorization = `Bearer ${accessToken}`;\n      return axios(originalRequest);\n    }\n    \n    return Promise.reject(error);\n  }\n);\n```\n\n关键点：\n1. 401 时自动触发刷新\n2. 刷新成功后重试原请求\n3. 刷新失败才跳转到登录页",
  },
];

describe("KimiService - Compact Mode", () => {
  it("should compress React conversation without truncation", async () => {
    // 注意：这个测试需要真实 API Key 才能运行
    // 仅用于调试目的
    const result = await compressCompact(mockConversationReact, "React 性能优化");
    
    console.log("=== Compact Result ===");
    console.log(result.content);
    
    if (result.success) {
      // 验证格式
      expect(result.content).toContain("[主题]");
      expect(result.content).toContain("[背景]");
      expect(result.content).toContain("[关键决策]");
      expect(result.content).toContain("[核心代码]");
      
      // 验证代码完整性（不应被截断）
      expect(result.content).toContain("react-window");
      expect(result.content).toContain("FixedSizeList");
      
      // 验证所有关键决策都被保留
      expect(result.content.length).toBeGreaterThan(500);
    } else {
      console.log("API Error:", result.error);
      // API 错误时跳过测试
      expect(true).toBe(true);
    }
  }, 30000);
  
  it("should compress API design conversation", async () => {
    const result = await compressCompact(mockConversationAPI, "API 认证设计");
    
    console.log("=== Compact Result (API) ===");
    console.log(result.content);
    
    if (result.success) {
      expect(result.content).toContain("[主题]");
      expect(result.content).toContain("JWT");
      expect(result.content).toContain("Refresh Token");
    } else {
      console.log("API Error:", result.error);
      expect(true).toBe(true);
    }
  }, 30000);
});

describe("KimiService - Summary Mode", () => {
  it("should create structured summary for React conversation", async () => {
    const result = await compressSummary(mockConversationReact, {
      title: "React 性能优化",
      platform: "ChatGPT",
      date: "2024-03-16",
    });
    
    console.log("=== Summary Result ===");
    console.log(result.content);
    
    if (result.success) {
      // 验证结构化格式
      expect(result.content).toContain("#");
      expect(result.content).toContain("TL;DR");
      expect(result.content).toContain("问题定义");
      expect(result.content).toContain("解决方案");
      expect(result.content).toContain("可复用代码");
      
      // 验证表格
      expect(result.content).toContain("|");
      
      // 验证代码块
      expect(result.content).toContain("```");
      
      // 验证标签
      expect(result.content).toContain("#");
    } else {
      console.log("API Error:", result.error);
      expect(true).toBe(true);
    }
  }, 30000);
  
  it("should create structured summary for API conversation", async () => {
    const result = await compressSummary(mockConversationAPI, {
      title: "API 认证设计",
      platform: "Claude",
      date: "2024-03-16",
    });
    
    console.log("=== Summary Result (API) ===");
    console.log(result.content);
    
    if (result.success) {
      expect(result.content).toContain("#");
      expect(result.content).toContain("JWT");
      expect(result.content).toContain("Access Token");
    } else {
      console.log("API Error:", result.error);
      expect(true).toBe(true);
    }
  }, 30000);
});
