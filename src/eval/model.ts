export interface WebsiteModel {
  start: keyof this["pages"];
  pages: Record<string, PageModel>;
}

export interface PageModel {
  elements: Array<ElementModel>;
}

export type ElementModel = NumberModel | TextModel | ButtonModel | AModel;

export interface NumberModel {
  tag: "input";
  type: "number";
  value: string | undefined;
  min?: number;
  max?: number;
  onChange?: () => void;
}

export interface TextModel {
  tag: "input";
  type: "text";
  value: string;
  onChange?: () => void;
}

export interface ButtonModel {
  tag: "button";
  onClick?: () => void;
}

export interface AModel {
  tag: "a";
  destination: string;
}
