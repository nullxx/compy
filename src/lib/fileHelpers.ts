import { fileService, IFile, IFilePlain } from "../service/fileService";

export const sourcesExt = [".c", ".cc", ".cpp"];
export const headersExt = [".h", ".hh", ".hpp"];
const libExt = [".a", ".so"];

export enum SourceType {
  C = "c",
  CPP = "c++",
}

export async function getSourceFiles() {
  return (
    await Promise.all(sourcesExt.map((ext) => fileService.getFilesWith(ext)))
  )
    .flat()
    .map((file: IFile) => {
      return {
        name: file.path,
        contents: file.content,
      };
    });
}

export async function getHeaderFiles() {
  return (
    await Promise.all(headersExt.map((ext) => fileService.getFilesWith(ext)))
  )
    .flat()
    .map((file: IFile) => {
      return {
        name: file.path,
        contents: file.content,
      };
    });
}

export async function getLibFiles() {
  return (
    await Promise.all(libExt.map((ext) => fileService.getFilesWith(ext)))
  ).flat();
}

export async function getOtherFiles() {
  const files = await fileService.getFilesWithout([
    ...sourcesExt,
    ...headersExt,
    ...libExt,
  ]);

  return files.map((file: IFile) => {
    return {
      name: file.path,
      contents: file.content,
    };
  });
}

export function getSourceType(file: IFile | IFilePlain) {
  const ext = file.path.split(".").pop();
  if (ext === "c") {
    return SourceType.C;
  } else if (ext === "cc" || ext === "cpp" || ext === "cxx") {
    return SourceType.CPP;
  } else {
    // default to cpp
    return SourceType.CPP;
  }
}