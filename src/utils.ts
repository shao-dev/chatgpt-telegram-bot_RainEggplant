import type {FetchFn, openai} from 'chatgpt';
import config from 'config';
import fetch, {type RequestInfo, type RequestInit} from 'node-fetch';
import {
  Config,
  APIBrowserOptions,
  APIOfficialOptions,
  APIUnofficialOptions,
} from './types';
import {SocksProxyAgent} from 'socks-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import * as http from 'http';

function loadConfig(): Config {
  function tryGet<T>(key: string): T | undefined {
    if (!config.has(key)) {
      return undefined;
    } else {
      return config.get<T>(key);
    }
  }

  let fetchFn: FetchFn | undefined = undefined;
  const proxy = tryGet<string>('proxy') || process.env.http_proxy;
  if (proxy) {
    let proxyAgent: http.Agent;
    const m = proxy.match(
      /^socks[45][ha]?:\/\/((([^@.:]+)@([^@.:]+)):)?([^:]+):(\d+)$/
    );
    if (proxy.startsWith('socks') && m) {
      console.log('proxy.match', [m[5], m[6]]);
      proxyAgent = new SocksProxyAgent({
        hostname: m[5],
        port: m[6],
      });
    } else {
      proxyAgent = new HttpsProxyAgent.HttpsProxyAgent(proxy);
    }
    fetchFn = ((url, opts) =>
      fetch(
        url as RequestInfo,
        {...opts, agent: proxyAgent} as RequestInit
      )) as FetchFn;
  }

  const apiType = config.get<'browser' | 'official' | 'unofficial'>('api.type');
  let apiBrowserCfg: APIBrowserOptions | undefined;
  let apiOfficialCfg: APIOfficialOptions | undefined;
  let apiUnofficialCfg: APIUnofficialOptions | undefined;
  if (apiType == 'browser') {
    apiBrowserCfg = {
      email: config.get<string>('api.browser.email'),
      password: config.get<string>('api.browser.password'),
      isGoogleLogin: tryGet<boolean>('api.browser.isGoogleLogin') || false,
      isProAccount: tryGet<boolean>('api.browser.isProAccount') || false,
      executablePath:
        tryGet<string>('api.browser.executablePath') ||
        process.env.PUPPETEER_EXECUTABLE_PATH ||
        undefined,
      proxyServer: tryGet<string>('proxy') || undefined,
      nopechaKey: tryGet<string>('api.browser.nopechaKey') || undefined,
      captchaToken: tryGet<string>('api.browser.captchaToken') || undefined,
      userDataDir: tryGet<string>('api.browser.userDataDir') || undefined,
      timeoutMs: tryGet<number>('api.browser.timeoutMs') || undefined,
      debug: config.get<number>('debug') >= 2,
    };
  } else if (apiType == 'official') {
    apiOfficialCfg = {
      apiKey: config.get<string>('api.official.apiKey'),
      apiBaseUrl: tryGet<string>('api.official.apiBaseUrl') || undefined,
      completionParams:
        tryGet<
          Partial<Omit<openai.CreateChatCompletionRequest, 'messages' | 'n'>>
        >('api.official.completionParams') || undefined,
      systemMessage: tryGet<string>('api.official.systemMessage') || undefined,
      maxModelTokens:
        tryGet<number>('api.official.maxModelTokens') || undefined,
      maxResponseTokens:
        tryGet<number>('api.official.maxResponseTokens') || undefined,
      timeoutMs: tryGet<number>('api.official.timeoutMs') || undefined,
      fetch: fetchFn,
      debug: config.get<number>('debug') >= 2,
    };
  } else if (apiType == 'unofficial') {
    apiUnofficialCfg = {
      accessToken: config.get<string>('api.unofficial.accessToken'),
      apiReverseProxyUrl:
        tryGet<string>('api.unofficial.apiReverseProxyUrl') || undefined,
      model: tryGet<string>('api.unofficial.model') || undefined,
      timeoutMs: tryGet<number>('api.unofficial.timeoutMs') || undefined,
      fetch: fetchFn,
      debug: config.get<number>('debug') >= 2,
    };
  } else {
    throw new RangeError('Invalid API type');
  }

  const cfg: Config = {
    debug: tryGet<number>('debug') || 1,
    bot: {
      token: config.get<string>('bot.token'),
      userIds: tryGet<number[]>('bot.userIds') || [],
      groupIds: tryGet<number[]>('bot.groupIds') || [],
      chatCmd: tryGet<string>('bot.chatCmd') || '/chat',
    },
    api: {
      type: apiType,
      browser: apiBrowserCfg,
      official: apiOfficialCfg,
      unofficial: apiUnofficialCfg,
    },
    server: {
      host: tryGet<string>('server.host'),
      port: tryGet<number>('server.port'),
    },
    proxy: proxy,
    redis: tryGet<string>('redis'),
  };

  return cfg;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function logWithTime(...args: any[]) {
  console.log(new Date().toLocaleString(), ...args);
}

export {loadConfig, logWithTime};
