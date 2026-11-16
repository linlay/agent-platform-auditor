import { useId, useRef } from "react";
import { Run } from "./domain";

export function BatchVersion({ run }: { run: Run }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  return <div className="batch-version">
    <button aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>版本</button>
    <dialog ref={dialog} className="batch-version-dialog" aria-labelledby={title}>
      <h2 id={title}>批次版本信息</h2>
      <pre>{JSON.stringify({ batchId: run.id, parser: run.parser, testsetHash: run.testsetHash, counts: run.counts }, null, 2)}</pre>
      <form method="dialog"><button className="primary">完成</button></form>
    </dialog>
  </div>;
}
