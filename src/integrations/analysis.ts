// Analysis via new公益API
// Dev: uses local proxy to avoid exposing keys; Prod: uses server route

export interface TodoItem {
  id: string;
  title: string;
  priority?: "low" | "medium" | "high";
  category?: string;
  children?: TodoItem[];
}

export interface AnalyzeResult {
  highlights: string; // markdown or plain summary
  todos: TodoItem[];  // structured action items
  raw?: unknown;
}

export async function analyzeTextWithOpenAI(text: string): Promise<AnalyzeResult> {
  const isDev = import.meta.env.DEV;
  if (!isDev) {
    // 生产环境：统一走服务端路由 /api/analyze（由 Vercel/Edge Function 调用外部API）
    const resp = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      throw new Error(`分析失败: ${resp.status} ${resp.statusText} ${msg}`);
    }
    const data = await resp.json();
    const highlights: string = data?.highlights || "";
    const todos: TodoItem[] = Array.isArray(data?.todos) ? data.todos : [];
    return { highlights, todos, raw: data };
  }

  // 开发环境：通过 Vite 代理 /api/newapi，避免密钥暴露与跨域问题
  const baseUrl = "/api/newapi";
  const userMsg = `你是一个有帮助的助手。请依据用户的中文转写文本，生成摘要（长度约为原文的20%-30%）与层级化待办清单。待办项需包含优先级（low/medium/high）与父子关系。只返回严格的 JSON：{\"highlights\": string, \"todos\": [{id,title,priority?,category?,children?}]}。原文如下：\n\n${text}`;

  let attempt = 0;
  let lastError: any = null;
  
  // 公益站可用模型列表（硬编码，只使用公益站提供的模型）
  const preferModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-preview-05",
    "gemini-flash-latest",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-exp-image-generation",
    "gpt-4o-mini",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
  ];

  async function listModels(): Promise<string[]> {
    try {
      const url = `${baseUrl}/models`;
      console.log("获取模型列表，请求 URL:", url);
      const res = await fetch(url, { method: "GET" });
      console.log("模型列表响应状态:", res.status, res.statusText);
      const txt = await res.text();
      console.log("模型列表响应内容:", txt.substring(0, 500)); // 只显示前500字符
      const json = safeJSON(txt);
      // 支持多种响应格式
      let data: any[] = [];
      if (Array.isArray(json?.data)) {
        data = json.data;
      } else if (Array.isArray(json)) {
        data = json;
      }
      const models = data.map((m: any) => m?.id || m).filter(Boolean);
      console.log("解析出的模型列表:", models);
      return models;
    } catch (e) {
      // 如果获取失败，返回空数组，后续会使用硬编码的可用模型
      console.error("无法获取模型列表，将使用硬编码的可用模型:", e);
      return [];
    }
  }

  function pickFallbackModel(models: string[], prefer: string[]): string | null {
    if (models.length === 0) {
      // 如果模型列表为空，直接返回优先列表中的第一个
      return prefer[0] || null;
    }
    // 只从公益站提供的模型中选择，过滤掉不在 preferModels 中的模型
    const validModels = models.filter(m => preferModels.includes(m));
    const set = new Set(validModels);
    for (const m of prefer) {
      if (m && set.has(m)) return m;
    }
    // 如果优先列表中的模型都不在可用列表中，返回 null
    return null;
  }

  // 直接使用公益站可用模型，不依赖环境变量或API获取的模型列表
  // 如果环境变量设置了可用模型，优先使用；否则使用硬编码的第一个可用模型
  const envModel = (import.meta.env.VITE_NEWAPI_MODEL as string | undefined);
  let currentModel: string;
  
  // 如果环境变量中的模型在可用列表中，使用它；否则使用第一个可用模型
  if (envModel && preferModels.includes(envModel)) {
    currentModel = envModel;
  } else {
    currentModel = preferModels[0]; // 默认使用 gemini-2.5-flash
  }
  
  // 尝试获取实际可用模型列表并验证（只使用公益站提供的模型）
  try {
    const availableModels = await listModels();
    console.log("可用模型列表:", availableModels);
    if (availableModels.length > 0) {
      // 从可用模型列表中选择最佳模型（只从公益站提供的模型中选择）
      const picked = pickFallbackModel(availableModels, preferModels);
      if (picked) {
        currentModel = picked;
        console.log("选择的模型:", currentModel);
      } else {
        console.warn("无法从可用模型列表中找到公益站模型，使用默认模型:", currentModel);
      }
    } else {
      console.warn("无法获取模型列表，使用硬编码的默认模型:", currentModel);
    }
  } catch (e) {
    console.warn("获取模型列表失败，使用硬编码的默认模型:", currentModel, e);
  }
  
  // 记录初始使用的模型
  console.log("初始使用模型:", currentModel);
  // 记录已尝试的模型，避免重复尝试
  const triedModels = new Set<string>();
  
  while (attempt < 3) {
    try {
      console.log(`尝试 ${attempt + 1}/3: 使用模型 ${currentModel}`);
      triedModels.add(currentModel);
      
      const requestUrl = `${baseUrl}/chat/completions`;
      const requestBody = {
        model: currentModel,
        messages: [
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
      };
      console.log("请求 URL:", requestUrl);
      console.log("请求体:", JSON.stringify(requestBody, null, 2));
      
      const resp = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const textErr = await resp.text().catch(() => "");
      if (!resp.ok) {
        // 429/5xx 重试，其他直接抛错
        const details = safeJSON(textErr);
        const errCode = (details?.error?.code as string) || "";
        console.error(`请求失败: ${resp.status}, 模型: ${currentModel}, 错误:`, details);
        
        if (resp.status === 404) {
          throw new Error("开发环境API路由未找到：请确认 vite.config.ts 中存在 /api/newapi 代理，且 .env.local 已配置 NEWAPI_BASE_URL 为有效HTTPS地址。");
        }
        // 模型不可用时，尝试回退
        if (resp.status === 404 || resp.status === 422 || resp.status === 503 || errCode === "model_not_found") {
          // 优先尝试其他可用模型（排除当前失败的模型和已尝试的模型）
          const otherModels = preferModels.filter(m => m !== currentModel && !triedModels.has(m));
          
          if (otherModels.length === 0) {
            // 如果所有模型都尝试过了，抛出错误
            throw new Error(`所有公益站模型都不可用。已尝试的模型: ${Array.from(triedModels).join(", ")}`);
          }
          
          // 尝试获取实际可用模型列表
          const models = await listModels();
          let picked: string | null = null;
          
          if (models.length > 0) {
            // 如果获取到了模型列表，从中选择（只选择未尝试的模型）
            const availableNotTried = otherModels.filter(m => models.includes(m));
            picked = availableNotTried[0] || null;
          } else {
            // 如果无法获取模型列表，直接使用硬编码的可用模型列表中的下一个
            picked = otherModels[0] || null;
          }
          
          if (picked) {
            console.log(`模型 ${currentModel} 不可用，切换到: ${picked}`);
            currentModel = picked;
            // 立即重试，不增加 attempt 次数
            continue;
          } else {
            // 如果找不到可用模型，尝试下一个未尝试的模型
            const nextModel = otherModels[0];
            if (nextModel) {
              console.log(`无法从模型列表中找到可用模型，尝试下一个: ${nextModel}`);
              currentModel = nextModel;
              continue;
            }
          }
          
          // 如果所有模型都尝试过了，抛出错误
          throw new Error(`模型 ${currentModel} 不可用，且无法找到其他可用模型。已尝试: ${Array.from(triedModels).join(", ")}`);
        }
        if (resp.status === 429 || resp.status >= 500) {
          attempt++;
          if (attempt < 3) {
            console.log(`遇到 ${resp.status} 错误，等待后重试...`);
            await new Promise((r) => setTimeout(r, 500 * attempt));
            continue;
          }
          throw new Error(`NewAPI 请求失败(${resp.status}): ${textErr}`);
        }
        throw new Error(`NewAPI 请求失败(${resp.status}): ${textErr}`);
      }
      
      console.log(`请求成功，使用模型: ${currentModel}`);

      const data = safeJSON(textErr);
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      let parsed: any = null;
      try {
        parsed = JSON.parse(content);
      } catch {
        const m = content.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      }
      if (!parsed || typeof parsed !== "object") {
        throw new Error("NewAPI 返回解析失败，未获得有效 JSON");
      }
      const highlights: string = parsed.highlights || "";
      const todos: TodoItem[] = Array.isArray(parsed.todos) ? parsed.todos : [];
      return { highlights, todos, raw: data };
    } catch (e: any) {
      lastError = e;
      attempt++;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw new Error(String(lastError?.message || lastError || "NewAPI 请求失败"));
}

function safeJSON(text: string) {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}


