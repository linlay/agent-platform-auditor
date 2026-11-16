import { api, download, downloadFile } from "./api";
import { Result, Run } from "./domain";
import { collectReportData, ExportKind, loadReportEvidence, rawReport, ReportRequest } from "./report-data";
import { feedbackEvidenceKeys, feedbackZip } from "./report-feedback";
import { humanReport } from "./report-html";

export async function exportResultReport(request: ReportRequest, kind: ExportKind): Promise<void> {
  const data = await collectReportData(request, id => api<Run>("/api/runs/" + encodeURIComponent(id)));
  const origin = data.scope === "batch" ? data.items[0]?.runId : data.scope === "comparison" ? data.comparison?.id : data.scope;
  const name = [data.testsetId, origin, data.generatedAt.replace(/[:.]/g, "-")].join("-");
  if (kind === "human") {
    downloadFile(new Blob([humanReport(data)], { type: "text/html;charset=utf-8" }), name + "-report.html");
    return;
  }
  const keys = kind === "raw" ? new Set([...data.items, ...data.baseline].map(i => i.key)) : feedbackEvidenceKeys(data);
  await loadReportEvidence(data, keys, (run, id) => api<Result>(`/api/runs/${encodeURIComponent(run)}/cases/${encodeURIComponent(id)}`));
  if (kind === "raw") download(rawReport(data), name + "-full.json");
  else downloadFile(new Blob([new Uint8Array(feedbackZip(data))], { type: "application/zip" }), name + "-feedback.zip");
}
