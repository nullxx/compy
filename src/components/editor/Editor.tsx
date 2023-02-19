import React from "react";
import Editor, { Monaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import "./editor.style.css";
import Tabs from "./Tabs";
import { useEditorContext } from "../../context/EditorContext";
import { IFile, IFilePlain } from "../../service/fileService";
import { usePrompt } from "../../context/TextPrompt";
import { RunSingleFile } from "../run/Run";
import icon from "../../assets/img/icon.png";

const lang = "c";

function NotOpened() {
  return (
    <>
      <div className="w-full h-full flex flex-col">
        <div className="flex flex-col items-center justify-center h-full">
          <img src={icon} alt="Icon" className="w-20" />
          <h1 className="text-2xl font-bold">No file selected</h1>
          <p className="text-gray-500">
            Select a file from the sidebar file explorer
          </p>
        </div>
      </div>
    </>
  );
}

function CustomEditor() {
  const [show, setShow] = React.useState(false);
  const editorRef = React.useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = React.useRef<Monaco | null>(null);
  const afterLoadedFns = React.useRef<
    ((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void)[]
  >([]);
  const modelsRef = React.useRef<{ [key: string]: editor.ITextModel }>({});
  const statesRef = React.useRef<{
    [key: string]: editor.ICodeEditorViewState | null;
  }>({});
  const currentFileRef = React.useRef<IFilePlain | null>(null);
  const {
    openFileTab,
    addOpenEditorListener,
    notifyFileChange,
    addCloseTabListener,
    setMonaco
  } = useEditorContext();
  const { showConfirm } = usePrompt();

  React.useEffect(() => {
    async function chooseModel(file: IFilePlain) {
      if (!editorRef.current) return;

      // save state for current opened model
      const currentModel = editorRef.current.getModel();
      if (currentModel) {
        // save view state
        const viewState = editorRef.current.saveViewState();
        statesRef.current[currentModel.uri.path] = viewState;
      }

      if (modelsRef.current[file.path]) {
        editorRef.current.setModel(modelsRef.current[file.path]);

        if (
          file.content !== modelsRef.current[file.path].getValue() &&
          (await showConfirm({
            title: "File changed",
            message:
              "File has been changed outside of the editor. Do you want to reload it?",
          }))
        ) {
          modelsRef.current[file.path].setValue(file.content);
        }
      } else {
        const model = monacoRef.current!.editor.createModel(
          file.content,
          lang,
          monacoRef.current!.Uri.from({
            scheme: "file",
            path: file.path,
          })
        );
        modelsRef.current[file.path] = model;
        editorRef.current.setModel(model);
      }

      // restore view state if exists
      if (statesRef.current[file.path]) {
        editorRef.current.restoreViewState(statesRef.current[file.path]);
      }

      currentFileRef.current = file;

      setShow(true);
    }

    async function removeModel(file: IFile | IFilePlain) {
      if (!editorRef.current) return;

      if (modelsRef.current[file.path]) {
        const model = modelsRef.current[file.path];
        model.dispose();
        delete modelsRef.current[file.path];
      }
    }

    const removeListener = addOpenEditorListener((file: IFilePlain) => {
      openFileTab(file);

      if (editorRef.current) {
        chooseModel(file);
      } else {
        afterLoadedFns.current.push((editor, monaco) => {
          chooseModel(file);
        });
      }
    });

    const removeListener2 = addCloseTabListener(
      async (file: IFile | IFilePlain) => {
        if (currentFileRef.current?.path === file.path) {
          // if the file is currently opened, close it
          if (file.path === currentFileRef.current?.path) setShow(false);
          await removeModel(file);
        }
      }
    );

    return () => {
      removeListener();
      removeListener2();
    };
  }, [addOpenEditorListener, openFileTab, showConfirm, addCloseTabListener]);

  const onChange = async (value?: string) => {
    if (value === undefined) return;
    const currentFile = currentFileRef.current;
    if (!currentFile) return;
    currentFile.content = value;
    notifyFileChange(currentFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  };

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: Monaco
  ) {
    editorRef.current = editor;
    monacoRef.current = monaco;

    setMonaco(monaco);
    editorRef.current.setModel(null);

    afterLoadedFns.current.forEach((fn) => fn(editor, monaco));
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      <div className="flex items-center">
        <Tabs />
        {show && <RunSingleFile />}
      </div>

      {!show && <NotOpened />}
      <div className={show ? "h-full" : "hidden"}>
        <Editor
          width="100%"
          loading={show ? "Loading..." : ""}
          defaultLanguage={lang}
          language={lang}
          onChange={onChange}
          onMount={handleEditorDidMount}
        />
      </div>
    </div>
  );
}

export default CustomEditor;
