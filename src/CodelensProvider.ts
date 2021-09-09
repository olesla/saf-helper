import * as vscode from "vscode";

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = [];
  private regex: RegExp;
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event;

  constructor() {
    // "uuid": "3068e975-3be2-5bd8-8d58-637ee093635f"
    this.regex =
      /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/g;

    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire();
    });
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (
      vscode.workspace
        .getConfiguration("canonical-grabber")
        .get("enableCodeLens", true)
    ) {
      this.codeLenses = [];
      const regex = new RegExp(this.regex);
      const text = document.getText();
      let matches;

      while ((matches = regex.exec(text)) !== null) {
        const line = document.lineAt(document.positionAt(matches.index).line);
        const indexOf = line.text.indexOf(matches[0]);
        const position = new vscode.Position(line.lineNumber, indexOf);
        const range = document.getWordRangeAtPosition(
          position,
          new RegExp(this.regex)
        );
        if (range) {
          this.codeLenses.push(new vscode.CodeLens(range));
        }
      }
      return this.codeLenses;
    }
    return [];
  }

  private getCanonical(item: any, s: string) {
    return new Promise((resolve, _) => {
      for (const k of Object.keys(item)) {
        if (typeof item[k] === "object") {
          this.getCanonical(item[k], s).then((d) => resolve(d));
        }

        if (item[k] === s) {
          resolve(item.canonical);
        }
      }
    });
  }

  public async resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken
  ) {
    if (
      vscode.workspace
        .getConfiguration("canonical-grabber")
        .get("enableCodeLens", true)
    ) {
      let text = "";
      let title = "missing canonical";
      if (vscode.window.activeTextEditor) {
        text = vscode.window.activeTextEditor.document.getText().toString();
        if (text !== "") {
          const line = vscode.window.activeTextEditor.document.lineAt(
            codeLens.range.start.line
          );
          const matches = line.text.match(
            /\b[0-9a-f]{8}\b-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-\b[0-9a-f]{12}\b/
          );
          if (matches) {
            const [uuid] = matches;
            const r = await this.getCanonical(JSON.parse(text), uuid);
            if (typeof r === "string") title = r;
          }
        }
      }

      codeLens.command = {
        title: title,
        tooltip: "Tooltip provided by sample extension",
        command: "canonical-grabber.codelensAction",
        arguments: ["Argument 1", false],
      };
      return codeLens;
    }
    return null;
  }
}
