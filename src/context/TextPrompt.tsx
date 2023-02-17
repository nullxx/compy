import React, { useState } from "react";
import { Button } from "primereact/button";
import { Dialog } from "primereact/dialog";

import { InputText } from "primereact/inputtext";

export interface ShowTextPromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
}

export interface ShowConfirmOptions {
  title: string;
  message: string;
}

const TextPromptContext = React.createContext<{
  showTextPrompt: (props: ShowTextPromptOptions) => Promise<string>;
  showConfirm: (props: ShowConfirmOptions) => Promise<boolean>;
}>({
  showTextPrompt: () => Promise.resolve(""),
  showConfirm: () => Promise.resolve(false),
});

export default function TextPromptProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [visible, setVisible] = useState<boolean>(false);
  const [value, setValue] = useState<string>("");
  const completeCBRef = React.useRef<(value: string | boolean | null) => void>();
  const [title, setTitle] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [type, setType] = useState<"text" | "confirm">("text");

  const valueTrimmed = value.trim();

  const cancelLabel = type === "text" ? "Cancel" : "No";
  const confirmLabel = type === "text" ? "Continue" : "Yes";

  const confirmDisabled = type === "text" && !valueTrimmed.length;
  const footerContent = (
    <div>
      <Button
        label={cancelLabel}
        icon="pi pi-times"
        onClick={() => {
          if (type === "text") {
            completeCBRef.current?.(null);
          } else if (type === 'confirm') {
            completeCBRef.current?.(false);
          }
          setVisible(false);
        }}
        className="p-button-text"
      />
      <Button
        disabled={confirmDisabled}
        label={confirmLabel}
        icon="pi pi-check"
        onClick={() => {
          if (type === "text") {
          completeCBRef.current?.(valueTrimmed);
          } else if (type === 'confirm') {
            completeCBRef.current?.(true);
          }
          setVisible(false);
        }}
        autoFocus
      />
    </div>
  );

  function showTextPrompt(props: ShowTextPromptOptions) {
    setTitle(props.title);
    setMessage(props.message);

    return new Promise<string>((resolve, reject) => {
      setType("text");
      setValue(props.defaultValue ?? "");
      setVisible(true);

      completeCBRef.current = (v) => {
        if (typeof v === 'string') {
          resolve(v);
        } else {
          reject(new Error("cancelled"));
        }

        completeCBRef.current = undefined;
      };
    });
  }

  function showConfirm(props: ShowConfirmOptions) {
    setTitle(props.title);
    setMessage(props.message);

    return new Promise<boolean>((resolve, reject) => {
      setType("confirm");
      setValue("");
      setVisible(true);

      completeCBRef.current = (v) => {
        if (typeof v === 'boolean') {
          resolve(v);
        } else {
          reject(new Error("cancelled"));
        }

        completeCBRef.current = undefined;
      };
    });
  }

  const _value = {
    showTextPrompt,
    showConfirm,
  };

  return (
    <TextPromptContext.Provider value={_value}>
      {children}

      <div className="card flex justify-content-center">
        <Dialog
          header={title}
          visible={visible}
          style={{ width: "50vw" }}
          onHide={() => {
            completeCBRef.current?.(null);
            setVisible(false);
          }}
          footer={footerContent}
        >
          <div className="flex flex-col">
            {type === "text" && (
              <InputText
                autoFocus
                placeholder={message}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                // on enter
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    completeCBRef.current?.(valueTrimmed);
                    setVisible(false);
                  }
                }}
              />
            )}

            {type === 'confirm' && (
              <div className="flex flex-col">
                <p>{message}</p>
              </div>
            )}
          </div>
        </Dialog>
      </div>
    </TextPromptContext.Provider>
  );
}

export function usePrompt() {
  return React.useContext(TextPromptContext);
}
