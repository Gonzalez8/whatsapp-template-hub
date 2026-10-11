export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";

export type ButtonType = "URL" | "PHONE_NUMBER" | "QUICK_REPLY";

export type ComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";

export interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
}

export interface NamedParamExample {
  param_name: string;
  example: string;
}

export interface TemplateComponent {
  type: ComponentType;
  text?: string;
  format?: string;
  buttons?: TemplateButton[];
  example?: {
    /** POSITIONAL templates: values for {{1}}, {{2}}… */
    body_text?: string[][];
    header_text?: string[];
    header_handle?: string[];
    /** NAMED templates: values for {{first_name}}… */
    body_text_named_params?: NamedParamExample[];
    header_text_named_params?: NamedParamExample[];
  };
}

export type PreviewMode = "template" | "example";

export interface Template {
  id: string;
  name: string;
  status: TemplateStatus;
  category: string;
  language: string;
  components?: TemplateComponent[];
  quality_score?: { score: "GREEN" | "YELLOW" | "RED" | "UNKNOWN" };
}

export interface WabaPhoneNumber {
  id: string;
  display_phone_number: string;
  verified_name: string;
  quality_rating?: string;
  status?: string;
}

export interface Waba {
  waba_id: string;
  waba_name: string;
  phone_numbers: WabaPhoneNumber[];
  templates: Template[];
  error?: string;
}

export interface TemplatesSnapshot {
  wabas: Waba[];
  /** Epoch ms of when the data was fetched from Meta. */
  fetchedAt: number;
}

export interface MetaWaba {
  id: string;
  name: string;
}

export interface MetaPaginatedResponse<T> {
  data: T[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
}
