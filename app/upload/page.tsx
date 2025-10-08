"use client";
import { useMemo, useState } from 'react';

export default function UploadPage() {
  return <ClientUploadPage />;
}

type TreeNode = { title: string; due?: string | null; children?: TreeNode[]; done?: boolean };

function ClientUploadPage() {
  const [transcript, setTranscript] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [todosTree, setTodosTree] = useState<TreeNode[]>([]);
  const [active, setActive] = useState<'transcript' | 'highlights' | 'todos'>('transcript');
  const [file, setFile] = useState<File | null>(null);

  // 三段进度：上传/转写/分析 各 1/3
  const [uploadRatio, setUploadRatio] = useState<number>(0);
  const [transcribeDone, setTranscribeDone] = useState<boolean>(false);
  const [analyzeDone, setAnalyzeDone] = useState<boolean>(false);

  const overallPercent = useMemo(() => {
    const a = Math.max(0, Math.min(1, uploadRatio));
    const b = transcribeDone ? 1 : 0;
    const c = analyzeDone ? 1 : 0;
    return Math.round(((a + b + c) / 3) * 100);
  }, [uploadRatio, transcribeDone, analyzeDone]);

  const hasResult = useMemo(() => !!transcript, [transcript]);
  const analyzing = useMemo(() => !!transcript && !analyzeDone, [transcript, analyzeDone]);

  // 递归渲染 To-do 树
  function TodoTree({ nodes, onChange, path = [] as number[] }: { nodes: TreeNode[]; onChange: (n: TreeNode[]) => void; path?: number[] }) {
    const toggle = (p: number[]) => {
      const next = structuredClone(nodes) as TreeNode[];
      let ref: any = next;
      for (let i = 0; i < p.length - 1; i++) ref = ref[p[i]].children;
      const idx = p[p.length - 1];
      ref[idx].done = !ref[idx].done;
      onChange(next);
    };
    return (
      <ul className="space-y-2">
        {nodes.map((n, i) => (
          <li key={i}>
            <label className="flex items-start gap-2">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={!!n.done} onChange={() => toggle([i])} />
              <span className={n.done ? 'line-through text-gray-500' : ''}>{n.title}</span>
            </label>
            {n.children && n.children.length > 0 && (
              <div className="pl-6 mt-2">
                <TodoTree
                  nodes={n.children}
                  onChange={(child) => {
                    const next = structuredClone(nodes) as TreeNode[];
                    (next[i].children as TreeNode[]) = child;
                    onChange(next);
                  }}
                  path={[...path, i]}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  }

  const onUpload = async () => {
    if (!file) return alert('请先选择文件');
    // 重置阶段
    setUploadRatio(0);
    setTranscribeDone(false);
    setAnalyzeDone(false);
    setSummary('');
    setTodosTree([]);
    setTranscript('');

    try {
      // 1) 上传并等待转写文本（后端返回纯文本）
      const text = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/transcribe', true);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadRatio(e.loaded / e.total);
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText || '');
          else reject(new Error(`上传失败（${xhr.status}）: ${String(xhr.responseText).slice(0,200)}`));
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        const form = new FormData();
        form.append('file', file, file.name);
        xhr.send(form);
      });
      setUploadRatio(1);
      setTranscribeDone(true);
      setTranscript(text);

      // 2) 调用 /api/analyze（完成第三段）
      const analysisRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (analysisRes.ok) {
        const a = await analysisRes.json();
        const rawTree: TreeNode[] = Array.isArray(a?.todos_tree) ? a.todos_tree : [];
        const withDone = (nodes: TreeNode[]): TreeNode[] => nodes.map(n => ({ title: n.title, due: n.due ?? null, done: false, children: n.children ? withDone(n.children) : [] }));
        const ready = withDone(rawTree);
        setSummary(a?.summary || '');
        setTodosTree(ready);
        setAnalyzeDone(true);
        setActive('highlights');
      } else {
        setAnalyzeDone(true);
      }
    } catch (e: any) {
      setUploadRatio(0);
      alert(e?.message || '上传失败');
    }
  };

  const copyMarkdown = async (tab: 'transcript' | 'highlights' | 'todos') => {
    let md = '';
    if (tab === 'transcript') md = `# Transcript\n\n${transcript || ''}`;
    if (tab === 'highlights') md = `# 摘要\n\n${summary || ''}`;
    if (tab === 'todos') {
      const toMd = (nodes: TreeNode[], depth = 0): string => nodes.map(n => {
        const indent = '  '.repeat(depth);
        const line = `${indent}- [ ] ${n.title}`;
        const childrenMd = n.children && n.children.length ? '\n' + toMd(n.children, depth + 1) : '';
        return line + childrenMd;
      }).join('\n');
      md = `# 待办清单\n` + (todosTree.length ? toMd(todosTree) : '\n刚刚的文本中没有待办事项');
    }
    try { await navigator.clipboard.writeText(md); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 backdrop-blur-md bg-white/70 border-b">
        <div className="mx-auto max-w-screen-md px-4 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-500">工具</div>
          <div className="flex gap-2" />
        </div>
      </div>

      <div className="px-1 pt-2">
        <h1 className="text-4xl font-bold tracking-tight">语音转文字</h1>
      </div>

      <div className="rounded-2xl border shadow-sm bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input type="file" accept="audio/wav,.wav,audio/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
          <button onClick={onUpload} disabled={!file} className="rounded-md bg-black text-white px-4 py-2 text-sm">上传并转写</button>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          支持格式：WAV、MP3、M4A、AAC、OGG、WEBM、FLAC、3GP、AMR、MP4（≤100MB）。
          如果在手机上看不到 WAV，请从“文件/文件管理器”选择，或在语音备忘录中“共享/导出到浏览器”后上传；也可先将扩展名改为 .m4a/.mp3（后端可识别 WAV）。
        </p>
        {(uploadRatio > 0 || transcribeDone || analyzeDone) && overallPercent < 100 && (
          <div className="mt-4">
            <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden">
              <div className="h-1 bg-black/80 transition-all" style={{ width: `${overallPercent}%` }} />
            </div>
            <div className="text-xs text-black/60 mt-2">总体进度：{overallPercent}%（上传/转写/分析）</div>
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">文件将发送到后端进行转写。</p>
      </div>

      <div className="rounded-2xl border shadow-sm bg-white">
        <div className="flex p-1">
          {([
            { key: 'transcript', label: 'Transcript' },
            { key: 'highlights', label: 'Highlights' },
            { key: 'todos', label: 'Todos' },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActive(tab.key)} className={'flex-1 rounded-lg px-3 py-2 text-sm transition ' + (active === tab.key ? 'bg-gray-900 text-white' : 'bg-transparent text-gray-700 hover:bg-gray-100')}>{tab.label}</button>
          ))}
        </div>
        <div className="border-t" />

        <div className="p-4">
          {!hasResult && <div className="text-sm text-gray-500">暂无结果。请先上传音频。</div>}

          {hasResult && active === 'transcript' && (
            <div className="space-y-3">
              <div className="whitespace-pre-wrap break-words text-sm">{transcript}</div>
              <div className="pt-2"><button onClick={() => copyMarkdown('transcript')} className="text-xs rounded-md bg-gray-100 px-2 py-1">复制 Markdown</button></div>
            </div>
          )}

          {hasResult && active === 'highlights' && (
            <div className="space-y-3">
              {analyzing && !analyzeDone ? (
                <div className="text-sm text-gray-500">分析中…</div>
              ) : (
                <div>
                  <h3 className="font-medium mb-1">摘要</h3>
                  <p className="text-sm whitespace-pre-wrap break-words">{summary || '（无摘要）'}</p>
                </div>
              )}
              <div className="pt-2"><button onClick={() => copyMarkdown('highlights')} className="text-xs rounded-md bg-gray-100 px-2 py-1">复制 Markdown</button></div>
            </div>
          )}

          {hasResult && active === 'todos' && (
            <div className="space-y-3">
              {analyzing && !analyzeDone ? (
                <div className="text-sm text-gray-500">分析中…</div>
              ) : (
                <div>
                  {todosTree.length === 0 ? (
                    <div className="text-sm text-gray-500">刚刚的文本中没有待办事项</div>
                  ) : (
                    <TodoTree nodes={todosTree} onChange={setTodosTree} />
                  )}
                </div>
              )}
              <div className="pt-2"><button onClick={() => copyMarkdown('todos')} className="text-xs rounded-md bg-gray-100 px-2 py-1">复制 Markdown</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


