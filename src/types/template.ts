export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";

// Known types get autocompletion; Meta adds new ones over time, so any string is accepted.
export type ButtonType = "URL" | "PHONE_NUMBER" | "QUICK_REPLY" | "FLOW" | "COPY_CODE" | "OTP" | (string & {});

export type ComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";

export interface TemplateButton {
  type: ButtonType;
  text: string;
  url?: string;
  phone_number?: string;
  /** URL buttons: example of the final URL once its variable is filled. */
  example?: string[];
  flow_id?: number | string;
  flow_action?: string;
  navigate_screen?: string;
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
  /** Category before Meta changed it (affects the price per message). */
  previous_category?: string;
  sub_category?: string;
  parameter_format?: "POSITIONAL" | "NAMED";
  /** "NONE" unless the template was rejected. */
  rejected_reason?: string;
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
