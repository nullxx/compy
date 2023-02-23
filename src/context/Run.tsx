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
import type { editor } from "monaco-editor";

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
  const { addChangeFileListener, mark, addOpenEditorListener, monaco } =
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
    write(
      "\r\n\u001b[41m##### Program forcefully terminated #####\u001b[0m\r\n"
    );
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
    const fn = debounce(
      async (file: IFilePlain) => {
        const contentArrBuffer = new TextEncoder().encode(file.content);
        const source: FileInput = {
          name: file?.path,
          contents: contentArrBuffer,
        };

        const headers = await getHeaderFiles();

        const result = await apiRef.current?.runCppCheck({
          source,
          headers,
          sourceType: getSourceType(file),
        });

        if (!result) return;

        mark(result);
      },
      200,
      true
    );

    const rmListener = addChangeFileListener(fn);
    const rmEditorListener = addOpenEditorListener(fn);

    const disposable = monaco?.languages.registerHoverProvider(["c", "c++"], {
      async provideHover(model, position, token) {
        const word: editor.IWordAtPosition | null =
          model.getWordAtPosition(position);
        if (!word) {
          return null;
        }

        const range: any = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // check if is string literal -> show string literal
        const lineContent: string = model.getLineContent(position.lineNumber);
        const lineTillCurrentPosition = lineContent.substring(
          word.startColumn - 2,
          word.endColumn
        );
        const lineTillCurrentPositionTrimmed = lineTillCurrentPosition.trim();
        if (
          lineTillCurrentPositionTrimmed.startsWith('"') &&
          lineTillCurrentPositionTrimmed.endsWith('"')
        ) {
          return {
            range,
            contents: [
              {
                value: lineTillCurrentPositionTrimmed,
                isTrusted: true,
              },
            ],
          };
        }

        // check if is number literal -> show number literal
        if (!isNaN(Number(word.word))) {
          return {
            range,
            contents: [
              {
                value: word.word,
                isTrusted: true,
              },
            ],
          };
        }
        let htmlContent: string | null = null;
        let baseURI = process.env.PUBLIC_URL + "/resources/man";
        let uri: string = `${baseURI}/3_${word.word}.html`;
        try {
          const result = await fetch(uri);
          if (result.ok) htmlContent = await result.text();
        } catch (error) {
          console.error(error);
        }

        return {
          range,
          contents: [
            htmlContent
              ? {
                  value: htmlContent,
                  supportHtml: true,
                  baseUri: monaco.Uri.from({
                    scheme: "http",
                    path: uri,
                  }),

                  isTrusted: true,
                }
              : {
                  value: word.word,
                  isTrusted: true,
                },
          ],
        };
      },
    });

    return () => {
      rmListener();
      rmEditorListener();
      disposable?.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
