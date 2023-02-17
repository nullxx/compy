import { createContext, useContext, useRef, useState } from "react";

export interface GeneralContext {

}

const defaultValue: GeneralContext = {

};

const Context = createContext<GeneralContext>(defaultValue);

export function TerminalProvider(props: { children: React.ReactNode }) {



  const value: GeneralContext = {
 
  };

  return <Context.Provider value={value}>{props.children}</Context.Provider>;
}

export function useGeneralContext() {
  return useContext(Context);
}
