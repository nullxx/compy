import { Button } from "primereact/button";
import { useEditorContext } from "../../context/EditorContext";
import { useRunContext } from "../../context/Run";
import "./run.styles.css";

export function RunSingleFile() {
  const { currentFile } = useEditorContext();
  const { runSingleFile, isRunning, forceAbort } = useRunContext();
  const onSingleFileRun = async () => {
    if (!currentFile) return;

    isRunning ? forceAbort() : await runSingleFile(currentFile);
  };

  return (
    <button
      // disabled={isRunning}
      className={`w-8 h-8 ${currentFile ?? "hidden"} disabled:opacity-50`}
      onClick={onSingleFileRun}
    >
      {isRunning ? (
        <i className="pi pi-stop bg-slate-700 p-1 rounded-sm text-white hover:bg-slate-600"></i>
      ) : (
        <i className="pi pi-play bg-slate-700 p-1 rounded-sm text-white hover:bg-slate-600"></i>
      )}
    </button>
  );
}

export function RunProject() {
  const { runProject, isRunning, forceAbort } = useRunContext();
  const onProjectRun = async () => {
    isRunning ? forceAbort() : await runProject();
  };

  return (
    <Button
      label={`${isRunning ? "Stop execution" : "Run project"}`}
      icon={isRunning ? "pi pi-stop" : "pi pi-play"}
      onClick={onProjectRun}
    />
  );
}
