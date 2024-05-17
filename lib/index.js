"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(src_exports);
var import_coc = require("coc.nvim");
var CompletionItemImpl = class {
  constructor(label, completion, detail) {
    this.kind = import_coc.CompletionItemKind.Text;
    this.label = label;
    this.detail = detail;
    this.insertText = completion;
    this.documentation = completion;
  }
};
var CodeLlamaCompletionProvider = class {
  constructor(host, port, model, contextAbove, contextBelow, prefix, suffix, middle, tokenLimit, temperature) {
    this.host = host;
    this.port = port;
    this.model = model;
    this.contextAbove = contextAbove;
    this.contextBelow = contextBelow;
    this.prefix = prefix;
    this.suffix = suffix;
    this.middle = middle;
    this.tokenLimit = tokenLimit;
    this.temperature = temperature;
  }
  async provideCompletionItems(document, position, token, context) {
    if (token.isCancellationRequested) {
      return [];
    }
    const items = this.getCompletionItems(document, position);
    return items;
  }
  async makeRequest(prompt) {
    return new Promise((resolve, reject) => {
      const postData = {
        model: this.model,
        prompt,
        stream: false,
        keep_alive: "5m",
        options: {
          temperature: this.temperature,
          num_predict: this.tokenLimit
          // seed: 0,
        }
      };
      const postDataString = JSON.stringify(postData);
      const options = {
        hostname: this.host,
        port: this.port,
        path: "/api/generate",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postDataString)
        }
      };
      let details = "";
      let response = "";
      const http = require("http");
      const req = http.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => {
          responseData += chunk;
        });
        res.on("end", () => {
          try {
            const responseObject = JSON.parse(responseData);
            response = responseObject.response;
            const tokens = responseObject.eval_count;
            const timeInSeconds = responseObject.total_duration / 1e9;
            const tokensPerSecond = tokens / timeInSeconds;
            details = `${tokens} tokens in ${timeInSeconds.toFixed(3)}s (${tokensPerSecond.toFixed(1)} tokens/s)`;
            if (response === "") {
              reject("Response was empty.");
            } else {
              let label = response.trim();
              label = label.length < 20 ? label : label.substring(0, 20);
              resolve(new CompletionItemImpl(label, response, details));
            }
          } catch (error) {
            reject(error);
          }
        });
      });
      req.on("error", (error) => {
        reject(error);
      });
      req.write(postDataString);
      req.end();
    });
  }
  async getCompletionItems(document, position) {
    const firstLine = Math.min(position.line - this.contextAbove, 0);
    const lastLine = Math.max(position.line + this.contextBelow + 1, document.lineCount);
    const prefix = { start: { character: 0, line: firstLine }, end: position };
    const suffix = { start: position, end: { character: 0, line: lastLine } };
    const infillPrompt = this.prefix + document.getText(prefix) + this.suffix + document.getText(suffix) + this.middle;
    let items = [];
    try {
      const result = await this.makeRequest(infillPrompt);
      if (result !== null) {
        items.push(result);
      }
    } catch (error) {
      import_coc.window.showErrorMessage(JSON.stringify(error));
    }
    return items;
  }
};
async function activate(context) {
  let { subscriptions } = context;
  const { nvim } = import_coc.workspace;
  const configuration = import_coc.workspace.getConfiguration("coc-codellama");
  let enabled = configuration.get("enabled", true);
  if (!enabled) {
    return;
  }
  let host = configuration.get("host", "localhost");
  let port = configuration.get("port", 11434);
  let contextAbove = configuration.get("contextAbove", 7);
  let contextBelow = configuration.get("contextBelow", 7);
  let model = configuration.get("model", "codellama:code");
  let shortcut = configuration.get("shortcut", "CL");
  let priority = configuration.get("priority", 995);
  let prefix = configuration.get("prefix", "<PRE>");
  let suffix = configuration.get("suffix", " <SUF> ");
  let middle = configuration.get("middle", " <MID>");
  let tokenLimit = configuration.get("token-limit", 24);
  let temperature = configuration.get("temperarture", 0.8);
  let promptCmd = import_coc.commands.registerCommand(
    "codellama.Prompt",
    async (...args) => {
      if (args.length === 0) {
        import_coc.window.showErrorMessage("Requires prompt");
        return;
      }
      let prompt = args.map((arg) => typeof arg === "object" ? JSON.stringify(arg) : String(arg)).join(" ");
      import_coc.window.showInformationMessage("coc-codellama " + prompt);
    }
  );
  subscriptions.push(promptCmd);
  let source = new CodeLlamaCompletionProvider(host, port, model, contextAbove, contextBelow, prefix, suffix, middle, tokenLimit, temperature);
  let provider = import_coc.languages.registerCompletionItemProvider("codellama", shortcut, null, source, [], priority);
  subscriptions.push(provider);
  subscriptions.push(
    /*
    workspace.registerKeymap(
      ['n'],
      'codellama-keymap',
      async () => {
        window.showInformationMessage('registerKeymap');
      },
      { sync: false }
    ),
    */
    /*
    workspace.registerAutocmd({
      event: 'InsertLeave',
      request: true,
      callback: () => {
        window.showInformationMessage('registerAutocmd on InsertLeave');
      },
    })
    */
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
