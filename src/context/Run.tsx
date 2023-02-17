import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getHeaderFiles,
  getLibFiles,
  getOtherFiles,
  getSourceFiles,
} from "../lib/fileHelpers";
import { WorkerAPI } from "../lib/workerapi";
import { IFile, IFilePlain } from "../service/fileService";
import { useTerminalContext } from "./TerminalContext";

type OnRunningChange = (isRunning: boolean) => void;

interface RunContext {
  runProject: () => Promise<void>;
  runSingleFile: (file: IFile | IFilePlain) => Promise<void>;

  addRunningChangeListener: (listener: OnRunningChange) => () => void;
  isRunning: boolean;

  forceAbort(): void;
}

const Context = createContext<RunContext>({
  runProject: () => Promise.resolve(),
  runSingleFile: () => Promise.resolve(),
  addRunningChangeListener: () => () => {},
  forceAbort: () => {},
  isRunning: false,
});
export default function RunProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const apiRef = useRef<WorkerAPI>();
  const runningChangeListeners = useRef<OnRunningChange[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const { addInputListener, write } = useTerminalContext();

  const addRunningChangeListener = (listener: OnRunningChange) => {
    runningChangeListeners.current.push(listener);
    return () => {
      runningChangeListeners.current = runningChangeListeners.current.filter(
        (l) => l !== listener
      );
    };
  };

  const runProject = async () => {
    setIsRunning(true);
    const sources = await getSourceFiles();
    const headers = await getHeaderFiles();
    const libs = await getLibFiles();
    const others = await getOtherFiles();

    await apiRef.current
      ?.compileLinkRun(sources, headers, libs, others)
      .finally(() => {
        setIsRunning(false);
      });
  };

  const runSingleFile = async (file: IFile | IFilePlain) => {
    setIsRunning(true);
    const source = {
      name: file?.path,
      contents: file?.content,
    };
    await apiRef.current?.compileLinkRun([source], [], [], []).finally(() => {
      setIsRunning(false);
    });
  };

  const forceAbort = () => {
    loadNewWorkerAPI();
    write("\n\u001b[41m##### Program forcefully terminated #####\u001b[0m\n");
  };

  const loadNewWorkerAPI = useCallback(() => {
    async function waitForInput() {
      return new Promise<string>((resolve) => {
        const cleanup = addInputListener((input) => {
          cleanup();
          resolve(input);
        });
      });
    }

    if (apiRef.current) {
      // terminate old worker
      apiRef.current.terminate();
    }

    const api = new WorkerAPI(waitForInput, write);
    apiRef.current = api;
  }, [addInputListener, write]);

  useEffect(() => {
    loadNewWorkerAPI();
  }, [loadNewWorkerAPI]);

  useEffect(() => {
    runningChangeListeners.current.forEach((l) => l(isRunning));
  }, [isRunning]);

  const value = {
    runProject,
    runSingleFile,
    addRunningChangeListener,
    forceAbort,
    isRunning,
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRunContext() {
  return useContext(Context);
}
