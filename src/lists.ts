import { BasicList, ListAction, ListContext, ListItem, window } from 'coc.nvim';

export default class DemoList extends BasicList {
  public readonly name = 'demo_list';
  public readonly description = 'CocList for coc-codellama';
  public readonly defaultAction = 'open';
  public actions: ListAction[] = [];

  constructor() {
    super();

    this.addAction('open', (item: ListItem) => {
      window.showInformationMessage(`${item.label}, ${item.data.name}`);
    });
  }

  public async loadItems(context: ListContext): Promise<ListItem[]> {
    return [
      {
        label: 'coc-codellama list item 1',
        data: { name: 'list item 1' },
      },
      {
        label: 'coc-codellama list item 2',
        data: { name: 'list item 2' },
      },
    ];
  }
}
