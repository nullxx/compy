import React, { useEffect, useState } from "react";
import { useEditorContext } from "../../context/EditorContext";
import { IFile, IFilePlain } from "../../service/fileService";

export default function Tabs() {
  const [tabs, setTabs] = useState<IFilePlain[]>([]);
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const {
    addOpenTabListener,
    openFileEditor,
    closeFileTab,
    setCurrentFile,
    addCloseTabListener,
    addChangeFileListener
  } = useEditorContext();

  React.useEffect(() => {
    const removeListener = addOpenTabListener((file) => {
      const tab = tabs.find((t) => t.id === file.id);
      if (tab) {
        setActiveTab(tab);
        return;
      }
      setTabs((tabs) => [...tabs, file]);
      setActiveTab(file);
    });

    const removeListener2 = addCloseTabListener(
      async (file: IFile | IFilePlain) => {
        const tab = tabs.find((t) => t.id === file.id);
        if (tab) {
          setTabs((tabs) => tabs.filter((t) => t.id !== file.id));
          if (tabs && tabs.length > 1) {
            setActiveTab(tabs[tabs.length - 1]);
            openFileEditor(tabs[tabs.length - 1]);
          }
        }
      }
    );

    const removeListener3 = addChangeFileListener((file) => {
      const tab = tabs.find((t) => t.id === file.id);
      if (tab) {
        setTabs((tabs) =>
          tabs.map((t) => {
            if (t.id === file.id) {
              return file;
            }
            return t;
          })
        );
      }
    });

    return () => {
      removeListener();
      removeListener2();
      removeListener3();
    };
  }, [tabs, addOpenTabListener, addCloseTabListener, openFileEditor, addChangeFileListener]);

  useEffect(() => {
    setCurrentFile(activeTab);
  }, [activeTab, setCurrentFile]);

  const onTabClick = (tab: IFilePlain) => {
    const fileTab = tabs.find((t) => t.id === tab.id);
    if (fileTab) {
      openFileEditor(fileTab);
    }
  };

  const onCloseTabClick = (
    tab: IFilePlain,
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.stopPropagation();
    closeFileTab(tab);
    const restFileTabs = tabs.filter((t) => t.id !== tab.id);
    setTabs(restFileTabs);
    if (tabs && tabs.length > 1) {
      const last = restFileTabs[restFileTabs.length - 1];
      setActiveTab(last);
      openFileEditor(last);
    }
  };

  return (
    <div className="flex border-b border-gray-200 overflow-x-scroll overflow-y-hidden w-full no-scrollbar">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${
            activeTab?.id === tab?.id
              ? "bg-gray-200 text-gray-700 border-b-2 border-r-2 border-gray-700"
              : "bg-gray-100 text-gray-500"
          } cursor-pointer h-9 px-4 hover:bg-gray-200 hover:text-gray-700 flex items-center gap-2`}
          onClick={() => onTabClick(tab)}
        >
          <span className="text-sm">{tab.path}</span>

          <button
            className="hover:rounded-full"
            onClick={(e) => onCloseTabClick(tab, e)}
          >
            <svg
              width="15px"
              height="15px"
              viewBox="0 0 24 24"
              fill="#ff0000"
              xmlns="http://www.w3.org/2000/svg"
              className="fill-orange-700"
            >
              <path
                d="M16.19 2H7.81C4.17 2 2 4.17 2 7.81V16.18C2 19.83 4.17 22 7.81 22H16.18C19.82 22 21.99 19.83 21.99 16.19V7.81C22 4.17 19.83 2 16.19 2ZM15.36 14.3C15.65 14.59 15.65 15.07 15.36 15.36C15.21 15.51 15.02 15.58 14.83 15.58C14.64 15.58 14.45 15.51 14.3 15.36L12 13.06L9.7 15.36C9.55 15.51 9.36 15.58 9.17 15.58C8.98 15.58 8.79 15.51 8.64 15.36C8.35 15.07 8.35 14.59 8.64 14.3L10.94 12L8.64 9.7C8.35 9.41 8.35 8.93 8.64 8.64C8.93 8.35 9.41 8.35 9.7 8.64L12 10.94L14.3 8.64C14.59 8.35 15.07 8.35 15.36 8.64C15.65 8.93 15.65 9.41 15.36 9.7L13.06 12L15.36 14.3Z"
                fill="#292D32"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
