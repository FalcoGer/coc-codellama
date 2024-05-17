import {CancellationToken, commands, CompletionContext, CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, ExtensionContext, integer, languages, listManager, Position, Range, sources, TextDocument, uinteger, window, workspace} from 'coc.nvim';
// import DemoList from './lists';

class CompletionItemImpl implements CompletionItem
{
    constructor(label: string, completion: string, detail: string)
    {
        this.label = label;
        this.detail = detail;
        this.insertText = completion;
        this.documentation = completion;
    }
    // the word displayed in the completion list
    label: string;
    kind: CompletionItemKind = CompletionItemKind.Text;
    // this is displayed in thedetails window at the very top
    detail: string;
    // this is actually inserted
    insertText?: string;
    // this is displayed in a separate window on the side
    documentation: string;
}

class CodeLlamaCompletionProvider implements CompletionItemProvider {
    host: string;
    port: uinteger;
    model: string;
    contextAbove: uinteger;
    contextBelow: uinteger;

    constructor(host: string, port:uinteger, model: string, contextAbove: uinteger, contextBelow: uinteger)
    {
        this.host = host;
        this.port = port;
        this.model = model;
        this.contextAbove = contextAbove;
        this.contextBelow = contextBelow;
    }

    async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[] | CompletionList | null | undefined> {
        if (token.isCancellationRequested)
        {
            return [];
        }

        const items = this.getCompletionItems(document, position);
        return items;
    }

    makeRequest(prompt: string, name: string): Promise<CompletionItem> {
        return new Promise((resolve, reject) => {
            // https://github.com/ollama/ollama/blob/main/docs/api.md
            const postData = {
                model: this.model,
                prompt: prompt,
                stream: false,
                keep_alive: "5m",
                options: {
                    // temperature: 0.0,
                    // seed: 0,
                    num_predict: 16
                }
            };

            const postDataString: string = JSON.stringify(postData);

            const options = {
                hostname: this.host,
                port: this.port,
                path: '/api/generate',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postDataString)
                }
            };

            let details: string = '';
            let response: string = '';

            const http = require('http');
            const req = http.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        const responseObject = JSON.parse(responseData);
                        response = responseObject.response;
                        const tokens: number = responseObject.eval_count;
                        const timeInSeconds: number = responseObject.total_duration / 1e9;
                        const tokensPerSecond: number = tokens / timeInSeconds;

                        details = `${tokens} tokens in ${timeInSeconds.toFixed(3)}s (${tokensPerSecond.toFixed(1)} tokens/s)`;

                        if (response === "") {
                            reject("Response was empty.");
                        } else {
                            resolve(new CompletionItemImpl(name, response, details));
                        }

                    } catch (error: any) {
                        reject(error);
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postDataString);
            req.end();
        });
    }

    async getCompletionItems(document: TextDocument, position: Position): Promise<CompletionItem[]> {
        // https://ollama.com/blog/how-to-prompt-code-llama

        // position holds "line" and "character" uinteger
        // document holds
        // - languageId: string ()
        // - offsetAt(pos) and positionAt(offset) to convert between offsets and positions
        // - getText(rng) to get the textat the specified range.
        // - lineCount
        // range holds start and end, of type Position.

        const firstLine = Math.min(position.line - this.contextAbove, 0);
        const lastLine = Math.max(position.line + this.contextBelow + 1, document.lineCount);

        const prefix: Range = {start: {character: 0, line: firstLine}, end: position};
        const suffix: Range = {start: position, end: {character: 0, line: lastLine}}
        const infillPrompt: string = "<PRE>" + document.getText(prefix) + " <SUF> " + document.getText(suffix) + " <MID>";

        let items: CompletionItem[] = [];

        try {
            const result = await this.makeRequest(infillPrompt, "llama");
            if (result !== null) {
                items.push(result);
            }
        } catch (error) {
            window.showErrorMessage(JSON.stringify(error));
        }

        return items;
    }
}

export async function activate(context: ExtensionContext): Promise<void> {
    window.showInformationMessage('coc-codellama loaded!');

    let {subscriptions} = context
    const {nvim} = workspace
    const configuration = workspace.getConfiguration('coc-codellama')
    // let mru = workspace.createMru('snippets-mru')

    // const channel = window.createOutputChannel('coc-codellama')
    // subscriptions.push(channel)
    // channel.appendLine("coc-codellama is loaded.")

    // load configuration
    let host = configuration.get<string>("host", "localhost");
    let port = configuration.get<uinteger>("port", 11434);
    let contextAbove = configuration.get<uinteger>("contextAbove", 7);
    let contextBelow = configuration.get<uinteger>("contextBelow", 7);
    let model = configuration.get<string>("model", "codellama:7b-code");
    let shortcut = configuration.get<string>("shortcut", "CL");
    let priority = configuration.get<integer>("priority", 995);

    // register commands
    let promptCmd = commands.registerCommand("codellama.Prompt", async (...args) => {
            if (args.length === 0) {
                window.showErrorMessage("Requires prompt");
                return;
            }
            // Convert each argument to a string
            let prompt = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
            window.showInformationMessage('coc-codellama ' + prompt);
        }
    );
    subscriptions.push(promptCmd);
    /*
    let showCmd = commands.registerCommand("codellama.Show", async () => {
            channel.show(false);
        }
    );
    subscriptions.push(showCmd);
    */

    // register lists
    // subscriptions.push(listManager.registerList(new DemoList));

    // register sources
    let source: CompletionItemProvider = new CodeLlamaCompletionProvider(host, port, model, contextAbove, contextBelow);
    let provider = languages.registerCompletionItemProvider("codellama", shortcut, null, source, [], priority);
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

