import React, { useState } from "react";
import { Tree } from "primereact/tree";
import { SplitButton } from "primereact/splitbutton";
import { ContextMenu } from "primereact/contextmenu";
import FileService, { fileService, IFile, IFilePlain } from "../service/fileService";
import { usePrompt } from "../context/TextPrompt";
import { useEditorContext } from "../context/EditorContext";
import { useRunContext } from "../context/Run";
import { headersExt, sourcesExt } from "../lib/fileHelpers";

export const FileTree = () => {
  const [files, setFiles] = useState<any[]>([]);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);
  const [selectedNodeKey, setSelectedNodeKey] = useState<string | undefined>();
  const { showTextPrompt, showConfirm } = usePrompt();

  const { openFileEditor, closeFileTab } = useEditorContext();
  const { runSingleFile } = useRunContext();

  const cm = React.useRef<ContextMenu>(null);
  const treeRef = React.useRef<Tree>(null);

  async function launchImport() {
    let parent = "/";

    if (selectedNodeKey) {
      const file = await fileService.getFileById(Number(selectedNodeKey));
      if (!file) return;
      parent = await fileService.getParentDirectory(file.path);
    }

    const input = document.createElement("input");
    input.type = "file";

    input.accept = sourcesExt.concat(headersExt).concat(".zip").join(",");
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as any).files;
      if (files && files.length > 0) {
        await fileService.importFiles(files, parent);
        await loadFiles();
      }
    };
    input.click();
  }

  async function requestDownload() {
    const _files = await fileService.getFiles(FileService.currentProject);
    if (!_files) return;

    await fileService.downloadFilesToZip(
      _files,
      FileService.currentProject.concat(".zip")
    );
  }
  const menu = [
    {
      label: "Rename",
      icon: "pi pi-fw pi-pencil",
      command: async () => {
        if (!selectedNodeKey) return;

        const file = await fileService.getFileById(Number(selectedNodeKey));
        if (!file) return;

        const pathParts = file.path.split("/");
        const name = pathParts[pathParts.length - 1];

        const newName = await showTextPrompt({
          title: "Rename",
          message: "Enter new name",
          defaultValue: name,
        });
        if (newName) {
          await fileService.moveFileById(Number(selectedNodeKey), newName);
          loadFiles();
        }
      },
    },
    {
      label: "Delete",
      icon: "pi pi-fw pi-trash",
      command: async () => {
        if (!selectedNodeKey) return;

        const file = await fileService.getFileById(Number(selectedNodeKey));
        if (!file) return;

        // eslint-disable-next-line no-restricted-globals
        if (
          await showConfirm({
            title: `Delete "${file.path}"`,
            message: "Are you sure you want to delete this file?",
          })
        ) {
          closeFileTab(file as IFile);
          await fileService.deleteFileById(file.id);
          loadFiles();
        }
      },
    },
    {
      label: "Run only this file",
      icon: "pi pi-fw pi-play",
      command: async () => {
        if (!selectedNodeKey) return;

        const file = await fileService.getFileById(Number(selectedNodeKey));
        if (!file) return;

        runSingleFile(file);
      },
    },
    {
      label: "Import files",
      disabled: false,
      icon: "pi pi-fw pi-upload",
      command: async function () {
        launchImport();
      },
    },
  ];

  const loadFiles = async () => {
    const data = await fileService.getFileSystemAsTree();
    setFiles(data);
    return data;
  };

  React.useEffect(() => {
    loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nodeTemplate = (node: any) => {
    return (
      <span className="p-treenode-label">
        <span>{node.label}</span>
      </span>
    );
  };

  const onNodeSelect = async (e: any) => {
    const id = e.value;

    const file = await fileService.getFileById(id);
    setSelectedFile(file);
  };

  const onCreateFile = async () => {
    let parentPath = "";

    if (selectedNodeKey) {
      const file = await fileService.getFileById(Number(selectedNodeKey));
      if (file) {
        parentPath = await fileService.getParentDirectory(file.path);
      }
    }

    const path = await showTextPrompt({
      title: "New file",
      message: `New file name in "${parentPath}/"`,
    });

    if (path) {
      const file = await fileService.createFile(path, "");
      await loadFiles();
      openFileEditor((await fileService.getFileById(file.id, true)) as IFilePlain);
    }
  };

  React.useEffect(() => {
    if (selectedFile) {
      openFileEditor(selectedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFile]);

  const items = [
    {
      label: "Import",
      icon: "pi pi-fw pi-upload",
      command: () => {
        launchImport();
      },
    },
    {
      label: `Download "${FileService.currentProject}" as zip`,
      icon: "pi pi-fw pi-download",
      command: () => {
        requestDownload();
      },
    },
  ];

  return (
    <div className="h-full">
      <h5 className="text-lg font-bold text-gray-700">
        {FileService.currentProject}
      </h5>
      <div className="flex flex-col gap-2 overflow-auto">
        <SplitButton
          label="Create file"
          icon="pi pi-plus"
          model={items}
          onClick={onCreateFile}
        />
        <ContextMenu
          model={menu}
          ref={cm}
          onHide={() => setSelectedNodeKey(undefined)}
        />
        {files.length > 0 ? (
          <Tree
            ref={treeRef}
            value={files}
            className="overflow-auto"
            selectionMode="single"
            style={{
              height: "100%",
              border: "unset",
              padding: 0,
            }}
            selectionKeys={selectedFile ? selectedFile.key : null}
            onSelectionChange={onNodeSelect}
            nodeTemplate={nodeTemplate}
            contextMenuSelectionKey={selectedNodeKey}
            onSelect={(event) => setSelectedNodeKey(event.node.key as string)}
            showHeader={false}
            onUnselect={(event) => {
              setSelectedNodeKey(undefined);
            }}
            onContextMenuSelectionChange={(event) =>
              setSelectedNodeKey(event.value as string)
            }
            onContextMenu={(event) => cm.current?.show(event.originalEvent)}
          />
        ) : (
          <div className="flex justify-center items-center h-64">
            <h5 className="text-lg font-bold text-gray-700">
              No files in this project
            </h5>
          </div>
        )}
      </div>
    </div>
  );
};
