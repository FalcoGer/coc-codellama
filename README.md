# coc-codellama

A completion engine for nvim.coc using the codellama LLM.

## Install

`:CocInstall coc-codellama`

## Options

| Option                     | Type    | Default value  | Description                                                                     |
|----------------------------|---------|----------------|---------------------------------------------------------------------------------|
| coc-codellama.enabled      | boolean | true           | Enable coc-codellama extension                                                  |
| coc-codellama.host         | string  | localhost      | The host to connect to.                                                         |
| coc-codellama.port         | number  | 11434          | The remote port to connect to.                                                  |
| coc-codellama.contextAbove | number  | 7              | How many lines above the current line to include in the context for completion. |
| coc-codellama.contextBelow | number  | 7              | How many lines below the current line to include in the context for completion. |
| coc-codellama.shortcut     | string  | CL             | The shortcut to use for this completion source.                                 |
| coc-codellama.priority     | number  | 995            | How far up in the list to put completions from this source.                     |
| coc-codellama.model        | string  | codellama:code | The large language model to use for completions.                                |

## License

MIT
