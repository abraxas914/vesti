/**
 * Kimi API 测试脚本
 * 用于调试和优化 Compact/Summary 模式
 * 
 * 运行：npx ts-node test-kimi.ts
 */

import { compressCompact, compressSummary } from "../frontend/src/lib/services/kimiService";

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

async function testCompact() {
  console.log("\n========================================");
  console.log("Testing COMPACT Mode");
  console.log("========================================\n");
  
  const result = await compressCompact(mockConversationReact, "React 性能优化");
  
  if (result.success) {
    console.log("✅ Compact Success!");
    console.log("\n--- Output ---\n");
    console.log(result.content);
    console.log("\n--- Length ---");
    console.log(`Characters: ${result.content.length}`);
    
    // 验证格式
    const checks = [
      { name: "[主题]", pass: result.content.includes("[主题]") },
      { name: "[背景]", pass: result.content.includes("[背景]") },
      { name: "[关键决策]", pass: result.content.includes("[关键决策]") },
      { name: "[核心代码]", pass: result.content.includes("[核心代码]") },
      { name: "react-window", pass: result.content.includes("react-window") },
      { name: "FixedSizeList", pass: result.content.includes("FixedSizeList") },
    ];
    
    console.log("\n--- Format Checks ---");
    checks.forEach(c => console.log(`${c.pass ? "✅" : "❌"} ${c.name}`));
  } else {
    console.log("❌ Compact Failed:", result.error);
  }
}

async function testSummary() {
  console.log("\n========================================");
  console.log("Testing SUMMARY Mode");
  console.log("========================================\n");
  
  const result = await compressSummary(mockConversationReact, {
    title: "React 性能优化",
    platform: "ChatGPT",
    date: "2024-03-16",
  });
  
  if (result.success) {
    console.log("✅ Summary Success!");
    console.log("\n--- Output ---\n");
    console.log(result.content);
    console.log("\n--- Length ---");
    console.log(`Characters: ${result.content.length}`);
    
    // 验证格式
    const checks = [
      { name: "# Title", pass: result.content.startsWith("#") },
      { name: "TL;DR", pass: result.content.includes("TL;DR") || result.content.includes("## TL;DR") },
      { name: "问题定义", pass: result.content.includes("问题") },
      { name: "解决方案", pass: result.content.includes("方案") || result.content.includes("解决") },
      { name: "代码块", pass: result.content.includes("```") },
      { name: "表格", pass: result.content.includes("|") },
      { name: "标签", pass: result.content.includes("#") },
    ];
    
    console.log("\n--- Format Checks ---");
    checks.forEach(c => console.log(`${c.pass ? "✅" : "❌"} ${c.name}`));
  } else {
    console.log("❌ Summary Failed:", result.error);
  }
}

async function main() {
  console.log("Starting Kimi API Tests...");
  console.log("Make sure you have set KIMI_API_KEY in .env");
  
  try {
    await testCompact();
    await testSummary();
  } catch (error) {
    console.error("Test error:", error);
  }
}

main();
