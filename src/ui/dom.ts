export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    readonly className?: string;
    readonly text?: string;
    readonly attributes?: Readonly<Record<string, string>>;
  } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.attributes !== undefined) {
    for (const [name, value] of Object.entries(options.attributes)) {
      node.setAttribute(name, value);
    }
  }
  return node;
}

export function append(parent: Node, ...children: Node[]): void {
  for (const child of children) {
    parent.appendChild(child);
  }
}
