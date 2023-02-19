export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: string;
  message: string;
}

export class ClangParser {
  static parse(input: string) {
    console.log(input);
    const matched = input.matchAll(/(\w+)\.(.+):(\d+):(\d+):\s(\w+):\s(.+)/gm);
    const diagnostics: Diagnostic[] = [];

    let match: RegExpMatchArray | null;
    while ((match = matched.next().value)) {
      const [, name, ext, line, column, severity, message] = match;
      diagnostics.push({
        file: name.concat("." + ext),
        line: +line,
        column: +column,
        severity,
        message,
      });
    }
    return diagnostics;
  }
}
