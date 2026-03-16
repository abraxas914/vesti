/**
 * API Keys 配置管理
 * 
 * 安全说明：
 * 1. 开发时使用 .env 文件（已添加到 .gitignore）
 * 2. 生产时使用 Chrome Storage（用户自行配置）
 * 3. 代码中不要硬编码 API Key
 */

import { logger } from "../utils/logger";

// 环境变量中的 API Key（开发时使用）
const ENV_KIMI_API_KEY = process.env.PLASMO_PUBLIC_KIMI_API_KEY || "";

// Storage Key
const STORAGE_KEY_KIMI_API_KEY = "kimiApiKey";

/**
 * 获取 Kimi API Key
 * 优先级：Chrome Storage > 环境变量 > 空
 */
export async function getKimiApiKey(): Promise<string> {
  try {
    // 1. 优先从 Chrome Storage 读取（用户配置）
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY_KIMI_API_KEY);
      if (result[STORAGE_KEY_KIMI_API_KEY]) {
        logger.debug("apiKeys", "Using Kimi API Key from Chrome Storage");
        return result[STORAGE_KEY_KIMI_API_KEY];
      }
    }
    
    // 2. 其次从环境变量读取（开发配置）
    if (ENV_KIMI_API_KEY) {
      logger.debug("apiKeys", "Using Kimi API Key from environment");
      return ENV_KIMI_API_KEY;
    }
    
    // 3. 返回空（需要用户配置）
    logger.warn("apiKeys", "Kimi API Key not found");
    return "";
  } catch (error) {
    logger.error("apiKeys", "Failed to get Kimi API Key", error as Error);
    return "";
  }
}

/**
 * 设置 Kimi API Key（存储到 Chrome Storage）
 */
export async function setKimiApiKey(apiKey: string): Promise<boolean> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY_KIMI_API_KEY]: apiKey });
      logger.info("apiKeys", "Kimi API Key saved to Chrome Storage");
      return true;
    }
    return false;
  } catch (error) {
    logger.error("apiKeys", "Failed to save Kimi API Key", error as Error);
    return false;
  }
}

/**
 * 清除 Kimi API Key
 */
export async function clearKimiApiKey(): Promise<boolean> {
  try {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      await chrome.storage.local.remove(STORAGE_KEY_KIMI_API_KEY);
      logger.info("apiKeys", "Kimi API Key cleared");
      return true;
    }
    return false;
  } catch (error) {
    logger.error("apiKeys", "Failed to clear Kimi API Key", error as Error);
    return false;
  }
}

/**
 * 检查是否配置了 Kimi API Key
 */
export async function hasKimiApiKey(): Promise<boolean> {
  const key = await getKimiApiKey();
  return !!key && key.startsWith("sk-");
}
