import { type ChangeEvent, useRef } from "react";

interface Props {
  raw: string;
  onRawChange: (value: string) => void;
  onParse: () => void;
  onLoadSample: () => void;
  onFileText: (text: string) => void;
  disabled: boolean;
  fileError: string;
  onFileError: (value: string) => void;
}

export function InputPanel(props: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      props.onFileText(text);
    } catch (error) {
      props.onFileError(error instanceof Error ? error.message : "文件读取失败");
    }
  };

  return (
    <div className="paste-section">
      <textarea
        id="paste-area"
        value={props.raw}
        onChange={(event) => props.onRawChange(event.target.value)}
        placeholder="粘贴 chatId.jsonl、SSE 原始文本、或 WebSocket JSON frame 日志..."
      />
      <div className="btn-row">
        <button type="button" className="btn btn-primary" onClick={props.onParse} disabled={props.disabled}>解析并审计</button>
        <button type="button" className="btn" onClick={() => fileInputRef.current?.click()} disabled={props.disabled}>选择文件</button>
        <button type="button" className="btn" onClick={props.onLoadSample} disabled={props.disabled}>加载示例</button>
      </div>
      <input ref={fileInputRef} className="visually-hidden" aria-label="选择日志文件" type="file" accept=".jsonl,.txt,.log,.json" onChange={handleFileChange} />
      {props.fileError ? <div className="input-error">文件读取失败：{props.fileError}</div> : null}
    </div>
  );
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("文件读取失败"));
    reader.readAsText(file);
  });
}
