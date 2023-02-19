import { assert } from "../utils";
interface ExportedCppCheck {
  callMain: (args: string[]) => number;
  FS: {
    writeFile: (
      path: string,
      data: string | ArrayBuffer,
      options: { encoding: "utf8" }
    ) => void;
    readFile: (path: string, options: { encoding: "utf8" }) => string;
  };
}

export interface FileInput {
  name: string; // path
  contents: ArrayBuffer | string;
}

export interface RunCppCheckOptions {
  source: FileInput;
  headers: FileInput[];
}

export interface CppCheckOut {
  file: string;
  line: number;
  column: number;
  severity: string;
  id: string;
  message: string;
}

export default class CppCheck {
  script: ((Module: any, ...args: any[]) => any) | null = null;
  baseReady: Promise<void>;
  ready: Promise<void> = Promise.resolve();
  baseInited: boolean = false;
  exportedCppCheck: ExportedCppCheck | null = null;

  constructor() {
    this.baseReady = import("../resources/cppcheck").then(
      ({ default: cppcheck }) => {
        this.script = cppcheck;
      }
    );
  }

  async init() {
    await this.baseReady;
    this.ready = this.initModule().then(() => this.writeCfgFile());
  }

  private async initModule() {
    assert(this.script !== null);
    const Module = {
      noInitialRun: true,
      print: (...args: any[]) => console.log(...args),
      printErr: (...args: any[]) => console.error(...args),
    };

    this.exportedCppCheck = await this.script(Module);
    this.baseInited = true;
  }

  private async writeCfgFile() {
    assert(this.baseInited);
    assert(this.exportedCppCheck !== null);

    const cfgFileUrl = new URL(
      "../resources/cppcheck-std.cfg",
      import.meta.url
    );
    const cfgFile = await fetch(cfgFileUrl);
    const cfgFileText = await cfgFile.text();

    this.exportedCppCheck.FS.writeFile("std.cfg", cfgFileText, {
      encoding: "utf8",
    });
  }

  async run(options: RunCppCheckOptions) {
    await this.ready;
    assert(this.baseInited);
    assert(this.exportedCppCheck !== null);

    const { source, headers } = options;
    
    this.exportedCppCheck.FS.writeFile(source.name, source.contents, {
      encoding: "utf8",
    });

    headers.forEach((h) => {
      this.exportedCppCheck?.FS.writeFile(h.name, h.contents, {
        encoding: "utf8",
      });
    });

    this.exportedCppCheck.FS.writeFile("cppcheck-result.txt", "", {
      encoding: "utf8",
    });

    const includeDirs = headers.map((h) => h.name.includes('/') ? h.name.replaceAll(/\/[^/]+$/g, "") : ".");
    const includeDirsStr = includeDirs.map((dir) => `-I="${dir}"`).join(" ");

    const args = [
      "--enable=all",
      "--std=c++17",
      "--template={file}$%*{line}$%*{column}$%*{severity}$%*{id}$%*{message}",
      "--inline-suppr",
      "--quiet",
      "--library=std.cfg",
      "--suppress=missingIncludeSystem",
      "--output-file=cppcheck-result.txt",
      includeDirsStr,
      source.name,
    ];

    try {
      const exitCode = this.exportedCppCheck.callMain(args);
      if (exitCode !== 0) {
        throw new Error(`Cppcheck exited with code ${exitCode}`);
      }

      const result = this.exportedCppCheck.FS.readFile("cppcheck-result.txt", {
        encoding: "utf8",
      });

      const parsed = this.parseResult(result);
      return parsed;
    } catch (error) {
      console.error("Cppcheck error:", error);
    }

    return [];
  }

  parseResult(result: string): CppCheckOut[] {
    // example result: main.c:4:style:unusedVariable:Unused variable: str
    const lines = result
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const parsed: CppCheckOut[] = [];
    for (const line of lines) {
      const [file, lineStr, columnStr, severity, id, message] =
        line.split("$%*");
      parsed.push({
        file,
        line: parseInt(lineStr),
        column: parseInt(columnStr),
        severity,
        id,
        message,
      });
    }

    return parsed;
  }
}
