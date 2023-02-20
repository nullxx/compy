import React from "react";
import { createContext } from "react";
import { IFile, IFilePlain } from "../service/fileService";

type OpenFileTabListener = (file: IFilePlain) => void;
type OnFileEditorShowListener = (file: IFilePlain) => void;
type OnFileChangeListener = (file: IFilePlain) => void;
type OnFileCloseListener = (file: IFile | IFilePlain) => void;

export interface EditorContext {
  theme: string;
  setTheme: (theme: string) => void;

  setMonaco: (monaco: any) => void;

  addOpenTabListener: (listener: OpenFileTabListener) => () => void;
  openFileTab: (file: IFilePlain) => void;

  addOpenEditorListener: (listener: OnFileEditorShowListener) => () => void;
  openFileEditor: (file: IFilePlain) => void;

  addChangeFileListener: (listener: OnFileChangeListener) => () => void;
  notifyFileChange: (file: IFilePlain) => void;

  addCloseTabListener: (listener: OnFileCloseListener) => () => void;
  closeFileTab: (file: IFile | IFilePlain) => void;

  setCurrentFile: (file: IFilePlain) => void;
  currentFile: IFilePlain | null;

  mark(
    opts: {
      file: string;
      line: number;
      column: number;
      message: string;
      severity: string;
    }[]
  ): void;
}

const Context = createContext<EditorContext>({
  theme: "",
  setTheme: () => {},
  addOpenTabListener: () => () => {},
  openFileTab: () => {},
  addOpenEditorListener: () => () => {},
  openFileEditor: () => {},
  addChangeFileListener: () => () => {},
  notifyFileChange: () => {},
  addCloseTabListener: () => () => {},
  closeFileTab: () => {},
  setCurrentFile: () => {},
  currentFile: null,
  mark: () => {},
  setMonaco: () => {},
});

const themePrefix = "vs-";

export default function EditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = React.useState<string>(
    themePrefix + (localStorage.getItem("dark") === "true" ? "dark" : "light")
  );
  const [currentFile, setCurrentFile] = React.useState<IFilePlain | null>(null);
  const monacoRef = React.useRef<any>(null);
  const openFileListenerRef = React.useRef<OpenFileTabListener[]>([]);
  const openFileEditorListenerRef = React.useRef<OnFileEditorShowListener[]>(
    []
  );
  const changeFileListenerRef = React.useRef<OnFileChangeListener[]>([]);
  const closeFileListenerRef = React.useRef<OnFileCloseListener[]>([]);

  const addOpenTabListener = (listener: OpenFileTabListener) => {
    openFileListenerRef.current.push(listener);
    return () => {
      openFileListenerRef.current = openFileListenerRef.current.filter(
        (l) => l !== listener
      );
    };
  };

  const openFileTab = (file: IFilePlain) => {
    if (openFileListenerRef.current.length === 0) {
      console.warn("No open file listener");
      return;
    }

    openFileListenerRef.current.forEach((l) => l(file));
  };

  const addOpenEditorListener = (listener: OnFileEditorShowListener) => {
    openFileEditorListenerRef.current.push(listener);
    return () => {
      openFileEditorListenerRef.current =
        openFileEditorListenerRef.current.filter((l) => l !== listener);
    };
  };

  const openFileEditor = (file: IFilePlain) => {
    if (openFileEditorListenerRef.current.length === 0) {
      console.warn("No open file listener");
      return;
    }

    openFileEditorListenerRef.current.forEach((l) => l(file));
  };

  const addChangeFileListener = (listener: OnFileChangeListener) => {
    changeFileListenerRef.current.push(listener);
    return () => {
      changeFileListenerRef.current = changeFileListenerRef.current.filter(
        (l) => l !== listener
      );
    };
  };

  const notifyFileChange = (file: IFilePlain) => {
    if (changeFileListenerRef.current.length === 0) {
      console.warn("No open file listener");
      return;
    }

    changeFileListenerRef.current.forEach((l) => l(file));
  };

  const addCloseTabListener = (listener: OnFileCloseListener) => {
    closeFileListenerRef.current.push(listener);
    return () => {
      closeFileListenerRef.current = closeFileListenerRef.current.filter(
        (l) => l !== listener
      );
    };
  };

  const closeFileTab = (file: IFile | IFilePlain) => {
    if (closeFileListenerRef.current.length === 0) {
      console.warn("No open file listener");
      return;
    }

    closeFileListenerRef.current.forEach((l) => l(file));
  };

  const setMonaco = (monaco: any) => {
    monacoRef.current = monaco;
  };

  const mark = (
    opts: {
      file: string;
      line: number;
      column: number;
      message: string;
      severity: string;
    }[]
  ) => {
    const monaco = monacoRef.current;

    function getMonacoSeverity(str: string) {
      if (!monaco) {
        return 4;
      }

      switch (str) {
        case "error":
          return monaco.MarkerSeverity.Error;
        case "warning":
          return monaco.MarkerSeverity.Warning;
        case "info":
          return monaco.MarkerSeverity.Info;
        default:
          return monaco.MarkerSeverity.Warning;
      }
    }

    // group by file
    const grouped = opts.reduce((acc, o) => {
      if (!acc[o.file]) {
        acc[o.file] = [];
      }

      acc[o.file].push(o);
      return acc;
    }, {} as { [key: string]: typeof opts });

    monaco.editor.getModels().forEach((model: any) => {
      monaco.editor.setModelMarkers(model, "owner", []);
    });

    Object.keys(grouped).forEach((file) => {
      const uri = monaco?.Uri.from({
        scheme: "file",
        path: file,
      });

      if (!uri) {
        return null;
      }

      let model = monaco?.editor.getModel(uri);
      if (!model) {
        const uri = monaco?.Uri.from({
          scheme: "file",
          path: currentFile?.path,
        });

        if (!uri) {
          return null;
        }

        model = monaco?.editor.getModel(uri);
        if (!model) {
          return null;
        }
      }

      const markers = grouped[file].map((o) => {
        const word = model?.getWordAtPosition({
          lineNumber: o.line,
          column: o.column,
        });

        return {
          severity: getMonacoSeverity(o.severity),
          startLineNumber: o.line,
          startColumn: o.column,
          endLineNumber: o.line,
          // endColumn: end of line
          endColumn: word?.endColumn ?? o.column + Infinity,
          message: o.message,
        };
      });

      monaco?.editor.setModelMarkers(model, "owner", markers);
    });
  };

  const value = {
    theme,
    setTheme,
    addOpenTabListener,
    openFileTab,
    addOpenEditorListener,
    openFileEditor,
    addChangeFileListener,
    notifyFileChange,
    addCloseTabListener,
    closeFileTab,
    setCurrentFile,
    currentFile,
    mark,
    setMonaco,
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useEditorContext() {
  return React.useContext(Context);
}
