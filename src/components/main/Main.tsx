import Editor from "../editor/Editor";
import React from "react";
import FileService, {
  fileService,
  IFilePlain,
} from "../../service/fileService";

import Split from "react-split-grid";
import "./main.style.css";
import Terminal from "../terminal/Terminal";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { usePrompt } from "../../context/TextPrompt";
import { useEditorContext } from "../../context/EditorContext";
import Sidebar from "../sidebar/Sidebar";

export default function IDE() {
  const { addChangeFileListener } = useEditorContext();
  const { showTextPrompt } = usePrompt();

  React.useEffect(() => {
    async function onFileChange(file: IFilePlain) {
      await fileService.updateFileById(file.id, file.content);
    }

    const removeListener = addChangeFileListener(onFileChange);

    return () => {
      removeListener();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [projects, setProjects] = React.useState<any[]>([]);
  const [currentProject, setCurrentProject] = React.useState<any | null>(null);
  const [justOpened, setJustOpened] = React.useState(true);

  const loadProjects = async () => {
    const projects = await fileService.getProjects();
    setProjects(projects);
    if (projects.length > 0) {
      setCurrentProject({
        name: projects[0],
        code: projects[0],
      });
    }
  };

  React.useEffect(() => {
    loadProjects();
  }, []);

  if (justOpened) {
    // select project or create new project
    return (
      <div className="h-screen flex flex-col gap-2 items-center justify-center">
        <div className="p-10 shadow-lg rounded-lg bg-gray-700 gap-4 flex flex-col">
          {projects.length > 0 ? (
            <Dropdown
              value={currentProject}
              onChange={(e) => {
                setCurrentProject(e.target.value);
              }}
              options={
                projects.map((project: any) => ({
                  name: project,
                  code: project,
                })) || []
              }
              optionLabel="name"
              placeholder="Select a project"
              className="w-full md:w-14rem"
            />
          ) : (
            <div className="text-white w-48">
              Click on the button below to create your first project
            </div>
          )}

          <div className="flex gap-4">
            {projects.length > 0 && (
              <Button
                disabled={!currentProject}
                onClick={async () => {
                  FileService.currentProject = currentProject.code;
                  setJustOpened(false);
                }}
              >
                Open project
              </Button>
            )}
            <Button
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={async () => {
                try {
                  const currentProject = await showTextPrompt({
                    title: "Create new project",
                    message: "Enter project name",
                  });
                  if (currentProject) {
                    FileService.currentProject = currentProject;
                    setJustOpened(false);
                  }
                } catch (error) {
                  console.log(error);
                }
              }}
            >
              <svg
                className="inline-block"
                fill="#000000"
                width="20px"
                height="20px"
                viewBox="0 0 16 16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M8.64 4.33H7.39v3.05H4.34v1.25h3.05v3.05h1.25V8.63h3.05V7.38H8.64V4.33z" />
                <path d="M8 .5A7.77 7.77 0 0 0 0 8a7.77 7.77 0 0 0 8 7.5A7.77 7.77 0 0 0 16 8 7.77 7.77 0 0 0 8 .5zm0 13.75A6.52 6.52 0 0 1 1.25 8 6.52 6.52 0 0 1 8 1.75 6.52 6.52 0 0 1 14.75 8 6.52 6.52 0 0 1 8 14.25z" />
              </svg>
              <span className="ml-2">Create new project</span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen overflow-scroll">
      <Split
        render={({ getGridProps, getGutterProps }) => (
          <div className="left-col" {...getGridProps()}>
            <Sidebar />
            <div
              className="gutter-col gutter-col-1"
              {...getGutterProps("column", 1)}
            />
            <div className="overflow-hidden">
              <Split
                render={({ getGridProps, getGutterProps }) => (
                  <div className="grid-2 h-full" {...getGridProps()}>
                    <Editor />
                    <div
                      className="gutter-row gutter-row-1"
                      {...getGutterProps("row", 1)}
                    />
                    <div className="h-full overflow-hidden">
                      <Terminal />
                    </div>
                  </div>
                )}
              />
            </div>
          </div>
        )}
      />
    </div>
  );
}
