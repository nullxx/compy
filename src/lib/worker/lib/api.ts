import { assert, msToSec } from "../utils";
import { App } from "./app";
import { MemFS } from "./memfs";
import { Tar, TarPairType } from "./tar";

export interface APIOptions {
  readBuffer: (filename: string | URL) => Promise<ArrayBuffer>;
  compileStreaming: (filename: string | URL) => Promise<WebAssembly.Module>;
  hostWrite: (str: string) => void;
  hostReadLine: () => void;
  clang: URL;
  lld: URL;
  sysroot: URL;
  showTiming?: boolean;
  sharedMem: WebAssembly.Memory;

  memfs?: URL | string ;
}

export interface CompileOptions {
  source: FileInput;
  headers: FileInput[];
}
export interface FileInput {
  name: string; // path
  contents: ArrayBuffer;
}

export interface CompileLinkRunOptions {
  sources: FileInput[];
  headers: FileInput[];
  rest: FileInput[];
  libObjs: FileInput[];
}

export interface RunCppCheckOptions {
  source: FileInput;
  headers: FileInput[];
  rest: FileInput[];
}

export class API {
  moduleCache: { [key: string]: WebAssembly.Module };
  readBuffer: (filename: string | URL) => Promise<ArrayBuffer>;
  compileStreaming: (filename: string | URL) => Promise<WebAssembly.Module>;
  hostWrite: (str: string) => void;
  hostRead: () => void;
  clangFilename: URL;
  lldFilename: URL;
  sysrootFilename: URL;
  showTiming: boolean;
  sharedMem: WebAssembly.Memory;

  clangCommonArgs: string[];

  memfs: MemFS;
  ready: Promise<void>;

  constructor(options: APIOptions) {
    this.moduleCache = {};
    this.readBuffer = options.readBuffer;
    this.compileStreaming = options.compileStreaming;
    this.hostWrite = options.hostWrite;
    this.hostRead = options.hostReadLine;
    this.clangFilename = options.clang;
    this.lldFilename = options.lld;
    this.sysrootFilename = options.sysroot;
    this.showTiming = options.showTiming || false;
    this.sharedMem = options.sharedMem;

    this.clangCommonArgs = [
      "-disable-free",
      "-isysroot",
      "/",
      "-internal-isystem",
      "/include/c++/v1",
      "-internal-isystem",
      "/include",
      "-internal-isystem",
      "/lib/clang/8.0.1/include",
      "-ferror-limit",
      "19",
      "-fmessage-length",
      "80",
      "-fcolor-diagnostics",
    ];
    // debugger;
    this.memfs = new MemFS({
      compileStreaming: this.compileStreaming,
      hostWrite: this.hostWrite,
      hostRead: this.hostRead,
      memfsFilename: options.memfs || "memfs",
      sharedMem: this.sharedMem,
    });
    this.ready = this.memfs.ready.then(() => {
      return this.untar(this.sysrootFilename);
    });
  }

  setSharedMem(mem: WebAssembly.Memory) {
    this.sharedMem = mem;
  }

  hostLog(message: string) {
    const yellowArrow = "\x1b[1;93m>\x1b[0m ";
    this.hostWrite(`${yellowArrow}${message}`);
  }

  async hostLogAsync<T = unknown>(message: string, promise: Promise<T>) {
    const start = +new Date();
    this.hostLog(`${message}...`);
    const result = await promise;
    const end = +new Date();
    this.hostWrite(" done.");
    if (this.showTiming) {
      const green = "\x1b[92m";
      const normal = "\x1b[0m";
      this.hostWrite(` ${green}(${msToSec(start, end)}s)${normal}\n`);
    }
    this.hostWrite("\n");
    return result;
  }

  async getModule(name: string) {
    if (this.moduleCache[name]) return this.moduleCache[name];
    const module = await this.hostLogAsync(
      `Fetching and compiling ${name}`,
      this.compileStreaming(name)
    );
    this.moduleCache[name] = module;
    return module;
  }

  async untar(filename: URL) {
    await this.memfs.ready;
    const promise = new Promise<void>(async (resolve, reject) => {
      try {
        const tar = new Tar(await this.readBuffer(filename));
        tar.untar(({ type, filenameOrPath, contents }) => {
          if (type === TarPairType.File) {
            assert(contents instanceof Uint8Array);

            this.memfs.addFile(filenameOrPath, contents);
          } else if (type === TarPairType.Directory) {
            this.memfs.addDirectory(filenameOrPath);
          }
        }, resolve);
      } catch (error) {
        reject(error);
      }
    });

    await this.hostLogAsync(`Untarring ${filename}`, promise);
  }

  async compile(options: CompileOptions) {
    const source = options.source;

    const obj = `${source.name}.o`;
    await this.ready;

    const clang = await this.getModule(this.clangFilename.toString());
    await this.run(
      clang,
      "clang",
      "-cc1",
      "-Wall",
      "-emit-obj",
      // headersStr,
      // libPathsStr,
      ...this.clangCommonArgs,
      "-O2",
      "-o",
      obj,
      "-x",
      "c++",
      source.name
    );

    // test this: clang -cc1 -Wall -fsyntax-only -isysroot / -internal-isystem /include/c++/v1 -internal-isystem /include -internal-isystem /lib/clang/8.0.1/include -ferror-limit 19 -fmessage-length 80 -fcolor-diagnostics -O2 -x c++ read.c
      // await this.run(
      //   clang,
      //   "clang",
      //   "-cc1",
      //   "-Wall",
      //   "-fsyntax-only",
      //   "-isysroot",
      //   "/",
      //   "-internal-isystem",
      //   "/include/c++/v1",
      //   "-internal-isystem",
      //   "/include",
      //   "-internal-isystem",
      //   "/lib/clang/8.0.1/include",
      //   "-ferror-limit",
      //   "19",
      //   "-fmessage-length",
      //   "80",
      //   "-fcolor-diagnostics",
      //   "-O2",
      //   "-x",
      //   "c++",
      //   source.name
      // );

    return obj;
  }

  //   async compileToAssembly(options) {
  //     const input = options.input;
  //     const output = options.output;
  //     const contents = options.contents;
  //     const obj = options.obj;
  //     const triple = options.triple || "x86_64";
  //     const opt = options.opt || "2";

  //     await this.ready;
  //     this.memfs.addFile(input, contents);
  //     const clang = await this.getModule(this.clangFilename);
  //     await this.run(
  //       clang,
  //       "clang",
  //       "-cc1",
  //       "-S",
  //       ...this.clangCommonArgs,
  //       `-triple=${triple}`,
  //       "-mllvm",
  //       "--x86-asm-syntax=intel",
  //       `-O${opt}`,
  //       "-o",
  //       output,
  //       "-x",
  //       "c++",
  //       input
  //     );
  //     return this.memfs.getFileContents(output);
  //   }

  //   async compileTo6502(options) {
  //     const input = options.input;
  //     const output = options.output;
  //     const contents = options.contents;
  //     const flags = options.flags;

  //     await this.ready;
  //     this.memfs.addFile(input, contents);
  //     const vasm = await this.getModule("vasm6502_oldstyle");
  //     await this.run(vasm, "vasm6502_oldstyle", ...flags, "-o", output, input);
  //     return this.memfs.getFileContents(output);
  //   }

  async link(objs: string[], wasm: string, libPaths: string[]) {
    const stackSize = 1024 * 1024;

    const libdir = "lib/wasm32-wasi";
    const crt1 = `${libdir}/crt1.o`;
    await this.ready;
    const lld = await this.getModule(this.lldFilename.toString());

    const libPathsStr = libPaths.map((p) => `-L${p}`).join(" ");

    return await this.run(
      lld,
      "wasm-ld",
      "--no-threads",
      "--export-dynamic", // TODO required?
      "-z",
      `stack-size=${stackSize}`,
      `-L${libdir}`,
      crt1,
      libPathsStr,
      libPathsStr,
      ...objs,
      "-o",
      wasm,
      "-lc",
      "-lc++",
      "-lc++abi",
    );
  }

  async run(module: WebAssembly.Module, ...args: string[]) {
    this.hostLog(`${args.join(" ")}\n`);

    const name = args[0];
    const start = +new Date();
    const app = new App(module, this.memfs, name, ...args.slice(1));
    const instantiate = +new Date();
    const stillRunning = await app.run();
    const end = +new Date();
    this.hostWrite("\n");
    if (this.showTiming) {
      const green = "\x1b[92m";
      const normal = "\x1b[0m";
      let msg = `${green}(${msToSec(start, instantiate)}s`;
      msg += `/${msToSec(instantiate, end)}s)${normal}\n`;
      this.hostWrite(msg);
    }
    return stillRunning ? app : null;
  }

  async compileLinkRun(options: CompileLinkRunOptions) {
    const wasm = `program.wasm`;

    const { sources, headers, libObjs, rest } = options;

    // lib paths from sources
    const sourcePaths = sources.map((s) => s.name);
    const onlyDirs = sourcePaths
      .map((p) => p.split("/").slice(0, -1).join("/"))
      .filter((p) => p);

    for (const header of headers) {
      this.memfs.addFile(header.name, header.contents);
    }

    const objs = [];
    for (const source of sources) {
      this.memfs.addFile(source.name, source.contents);
      const r = await this.compile({ source, headers });
      objs.push(r);
    }

    for (const obj of libObjs) {
      this.memfs.addFile(obj.name, obj.contents);
      objs.push(obj.name);
    }

    for (const r of rest) {
      this.memfs.addFile(r.name, r.contents);
    }

    await this.link(objs, wasm, onlyDirs);

    const buffer = this.memfs.getFileContents(wasm);
    const testMod = await this.hostLogAsync(
      `Compiling ${wasm}`,
      WebAssembly.compile(buffer)
    );

    return await this.run(testMod, wasm);
  }
}
