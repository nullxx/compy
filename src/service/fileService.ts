import _Dexie from "dexie";
import * as zip from "@zip.js/zip.js";

export interface IFile {
  id: number;
  path: string;
  content: ArrayBuffer;
  project: string;
}

export interface IFilePlain extends Omit<IFile, "content"> {
  content: string;
}

class Dexie extends _Dexie {
  files!: _Dexie.Table<IFile, number>;
  constructor(name: string) {
    super(name);
    this.version(1).stores({
      files: "++id,path,content,project,[path+project]",
    });

    // compound index path + project
  }
}

const db = new Dexie("fileService");

export default class FileService {

  async getFiles(project = FileService.currentProject) {
    return await db.files.where("project").equals(project).toArray();
  }

  async downloadFilesToZip(files: IFile[], filename: string) {
    const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));

    for (const file of files) {
      const blob = new Blob([file.content]);
      await zipWriter.add(file.path, new zip.BlobReader(blob));
    }

    const blob = await zipWriter.close();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importFromZip(zipFile: File) {
    const zipFiles = await new Promise<File[]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = e.target?.result as ArrayBuffer;
        if (data) {
          const blob = new Blob([data]);
          const zipReader = new zip.ZipReader(new zip.BlobReader(blob));
          const entries = await zipReader.getEntries();
          const files: File[] = [];
          for (const entry of entries) {
            const blob = await entry.getData(
              new zip.BlobWriter("application/octet-stream")
            );
            const file = new File([blob], entry.filename);
            files.push(file);
          }
          resolve(files);
        }
      };

      reader.readAsArrayBuffer(new Blob([zipFile]));
      reader.onerror = (e) => {
        reject(e);
      };
    });

    const files = zipFiles
      .filter((file) => !["__MACOSX"].includes(file.name.split("/")?.[0]))
      // filter folders
      .filter((file) => !file.name.endsWith("/"));

    // check if all files are in the same base folder (something/..., something/.../...)
    const baseFolder = files[0].name.split("/")[0];
    const allInBaseFolder = files.every((file) => file.name.startsWith(baseFolder));

    // if allInBaseFolder import the files inside allInBaseFolder as root
    if (allInBaseFolder) {
      const _files = files.map((file) => {
        const path = file.name.replace(`${baseFolder}/`, "");
        return new File([file], path);
      });
      return this.importFiles(_files, "");
    } else {
      return this.importFiles(files, "");
    }
  }

  async importFiles(files: File[], path: string): Promise<void> {
    if (files.length === 1 && files[0].name.endsWith(".zip")) {
      return this.importFromZip(files[0]);
    }

    for (const file of files) {
      const fileReader = new FileReader();
      await new Promise((resolve, reject) => {
        fileReader.onload = async (e) => {
          const content = e.target?.result;

          const basePath = !path ? file.name : `${path}/${file.name}`;
          try {
            if (typeof content === "string") {
              await this.createFile(basePath, content);
            } else if (content instanceof ArrayBuffer) {
              await this.createFileFromArrayBuffer(basePath, content);
            }
            resolve(true);
          } catch (error) {
            console.error(
              "Error while importing file: ",
              file.name,
              "with content: ",
              content,
              "to path: ",
              basePath
            );
            console.error(error);
            reject(error);
          }
        };
        fileReader.onerror = (e) => {
          console.error("Error while importing file: ", file.name);
          console.error(e);
          reject(e);
        };
        fileReader.readAsText(file);
      });
    }
  }

  static currentProject = "";

  async createFileFromArrayBuffer(
    path: string,
    content: ArrayBuffer
  ): Promise<boolean> {
    const file = {
      id: Date.now(),
      path,
      content,
      project: FileService.currentProject,
    };

    await db.files.add(file);
    return true;
  }

  async createFile(path: string, content: string): Promise<boolean> {
    const contentsArrayBuffer = new TextEncoder().encode(content);
    const file = {
      id: Date.now(),
      path,
      content: contentsArrayBuffer,
      project: FileService.currentProject,
    };
    await db.files.add(file);
    return true;
  }

  async getProjects(): Promise<string[]> {
    const projects = await db.files.toArray();
    return [...new Set(projects.map((project) => project.project))];
  }

  async getParentDirectory(filePath: string) {
    const path = filePath.split("/");
    path.pop();
    return path.join("/");
  }

  async getFile(
    path: string,
    plain = true
  ): Promise<IFile | IFilePlain | undefined> {
    // return await db.files.get({ path, project: IFileService.currentProject });
    const file = await db.files
      .where({ path, project: FileService.currentProject })
      .first();
    if (file && plain) {
      const decoder = new TextDecoder();
      const content = decoder.decode(file.content);
      return { ...file, content };
    }
    return file;
  }

  async getFileById(
    id: number,
    plain = true
  ): Promise<IFile | IFilePlain | undefined> {
    const file = await db.files.get(id);
    if (file && plain) {
      const decoder = new TextDecoder();
      const content = decoder.decode(file.content);
      return { ...file, content };
    }
    return file;
  }

  async updateFile(path: string, content: string): Promise<boolean> {
    const file = await this.getFile(path);

    if (file) {
      const contentsArrayBuffer = new TextEncoder().encode(content);
      file.content = contentsArrayBuffer;
      await db.files.update(file.id, file);
      return true;
    }
    return false;
  }

  async updateFileById(id: number, content: string): Promise<boolean> {
    const file = await this.getFileById(id, false);
    if (file) {
      const contentsArrayBuffer = new TextEncoder().encode(content);
      file.content = contentsArrayBuffer;
      await db.files.update(file.id, file);
      return true;
    }
    return false;
  }

  async deleteFile(path: string): Promise<boolean> {
    const file = await this.getFile(path);
    if (file) {
      await db.files.delete(file.id);
      return true;
    }
    return false;
  }

  async deleteFileById(id: number): Promise<boolean> {
    const file = await this.getFileById(id);
    if (file) {
      await db.files.delete(file.id);
      return true;
    }
    return false;
  }

  async moveFileById(id: number, newPath: string): Promise<boolean> {
    const file = await this.getFileById(id, false);
    if (file) {
      file.path = newPath;
      await db.files.update(file.id, file);
      return true;
    }
    return false;
  }

  async getFileSystemAsTree(): Promise<any> {
    const files = (await db.files.toArray()).filter(
      (file) => file.project === FileService.currentProject
    );
    const tree: any[] = [];
    files.forEach((file) => {
      const path = file.path.split("/");
      let current = tree;
      for (let i = 0; i < path.length; i++) {
        const name = path[i];
        const isFile = i === path.length - 1;
        let node = current.find((node) => node.label === name);
        if (!node) {
          node = {
            label: name,
            children: [],
            key: file.id,
            icon: isFile ? "pi pi-fw pi-file" : "pi pi-fw pi-folder",
          };
          current.push(node);
        }
        if (isFile) {
          node.data = file.content;
        }
        current = node.children;
      }
    });

    if (tree.length === 1 && tree[0].label === "") {
      return tree[0].children;
    }

    return tree;
  }

  async getFilePathsWith(ext: string) {
    return this.getFilesWith(ext).then((files) =>
      files.map((file) => file.path)
    );
  }

  async getFilesWith(ext: string) {
    const files = (await db.files.toArray()).filter(
      (file) => file.project === FileService.currentProject
    );
    return files.filter((file) => file.path.endsWith(ext));
  }

  async getFilesWithout(ext: string[] | string) {
    const files = (await db.files.toArray()).filter(
      (file) => file.project === FileService.currentProject
    );
    return files.filter((file) => {
      if (typeof ext === "string") {
        return !file.path.endsWith(ext);
      }
      return !ext.some((ext) => file.path.endsWith(ext));
    });
  }

  async getFilesPathsWithout(extOrExts: string | string[]) {
    const files = (await db.files.toArray()).filter(
      (file) => file.project === FileService.currentProject
    );
    if (typeof extOrExts === "string") {
      return files
        .filter((file) => !file.path.endsWith(extOrExts))
        .map((file) => file.path);
    }
    return files
      .filter((file) => !extOrExts.some((ext) => file.path.endsWith(ext)))
      .map((file) => file.path);
  }
}

export const fileService = new FileService();
