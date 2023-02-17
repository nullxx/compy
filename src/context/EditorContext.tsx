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
  };

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useEditorContext() {
  return React.useContext(Context);
}
