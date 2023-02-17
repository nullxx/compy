import React from "react";
import Main from "./components/main/Main";
import EditorProvider from "./context/EditorContext";
import RunProvider from "./context/Run";
import { TerminalProvider } from "./context/TerminalContext";
import TextPromptProvider from "./context/TextPrompt";

function App() {
  return (
    <>
      <TerminalProvider>
        <TextPromptProvider>
          <EditorProvider>
            <RunProvider>
              <Main />
            </RunProvider>
          </EditorProvider>
        </TextPromptProvider>
      </TerminalProvider>
    </>
  );
}

export default App;
