import React, { useEffect } from "react";
import * as xterm from "xterm";
import "xterm/css/xterm.css";
import "./terminal.style.css";
import { FitAddon } from "xterm-addon-fit";
import { useTerminalContext } from "../../context/TerminalContext";
import { useRunContext } from "../../context/Run";

export interface _Terminal extends xterm.Terminal {
  _core: {
    buffer: {
      x: number;
    };
  };
}

const fitAddon = new FitAddon();

export default function Terminal() {
  const termDivRef = React.useRef<HTMLDivElement>(null);
  const termRef = React.useRef<_Terminal>();
  const { triggerInputListeners, addWriteListener } = useTerminalContext();
  const { forceAbort } = useRunContext();

  async function onWriteRequest(text: string) {
    termRef.current?.write(text);
    termRef.current?.scrollToBottom();
  }

  const loadTerminal = async () => {
    if (termDivRef?.current?.children.length ?? 1 > 0) return; // already loaded

    termRef.current = new xterm.Terminal({
      convertEol: true,
      disableStdin: false,
      cursorBlink: true,
      theme: {
        background: "#000000",
        foreground: "#ffffff",
        cursor: "#ffffff",
        
      },
    }) as _Terminal;

    termRef.current.loadAddon(fitAddon);

    let acum = "";
    termRef.current.onKey((e: any) => {
      const ev = e.domEvent;
      const printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;

      if (ev.keyCode === 67 && ev.ctrlKey) {
        // clean the acum
        acum = "";
        // emit a cancel signal
        return forceAbort(); // need to return here to avoid writing the char
      } else if (ev.keyCode === 8) {
        // if acum is empty, do nothing
        if (acum.length === 0) {
          return;
        }
        if (termRef.current?._core.buffer.x ?? 0 > 2) {
          termRef.current?.write("\b \b");
        }
      } else if (ev.keyCode === 13) {
        termRef.current?.writeln("");
      } else if (printable) {
        termRef.current?.write(e.key);
      }

      // if delete, delete the last char
      if (ev.keyCode === 8 && acum.length > 0) {
        acum = acum.slice(0, -1);
      } else {
        acum += e.key;
      }

      // if is enter
      if (ev.keyCode === 13) {
        // if (onCompleteInput.current) {
        triggerInputListeners(acum);
        //   onCompleteInput.current(acum);
        acum = "";
        // }
      }
    });

    if (termDivRef.current) {
      if (termDivRef.current.children.length > 0) return; // already loaded

      termRef.current.open(termDivRef.current);

      window.addEventListener("resize", () => {
        fitAddon.fit();
      });
    }
  };

  useEffect(() => {
    loadTerminal();

    const cleanup = addWriteListener(onWriteRequest);

    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (termDivRef.current) {
      const observer = new ResizeObserver(() => {
        fitAddon.fit();
      });

      observer.observe(termDivRef.current);
    }
  }, [termDivRef]);

  return <div ref={termDivRef} className="max-h-full h-full"></div>;
}
