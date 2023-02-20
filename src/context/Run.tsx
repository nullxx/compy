import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import debounce from "just-debounce-it";

import {
  getHeaderFiles,
  getLibFiles,
  getOtherFiles,
  getSourceFiles,
  getSourceType,
} from "../lib/fileHelpers";
import { FileInput } from "../lib/worker/lib/cppcheck";
import { WorkerAPI } from "../lib/workerapi";
import { IFile, IFilePlain } from "../service/fileService";
import { useEditorContext } from "./EditorContext";
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
  const { addChangeFileListener, mark, addOpenEditorListener } =
    useEditorContext();

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
      delete apiRef.current;
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

  useEffect(() => {
    const fn = debounce(async (file: IFilePlain) => {
      const contentArrBuffer = new TextEncoder().encode(file.content);
      const source: FileInput = {
        name: file?.path,
        contents: contentArrBuffer,
      };

      const headers = await getHeaderFiles();

      const result = await apiRef.current?.runCppCheck({
        source,
        headers,
        sourceType: getSourceType(file)
      });

      if (!result) return

      mark(result);
    }, 200, true);
    
    const rmListener = addChangeFileListener(fn);
    const rmEditorListener = addOpenEditorListener(fn);

    return () => {
      rmListener();
      rmEditorListener();
    };

  }, [addChangeFileListener, addOpenEditorListener, mark]);

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
