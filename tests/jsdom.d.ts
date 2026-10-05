declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string, options?: { readonly url?: string });
    readonly window: Window;
  }
}
