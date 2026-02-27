export interface TastyValidationConfig {
  extends?: string;
  tokens?: false | string[];
  units?: false | string[];
  funcs?: false | string[];
  states?: string[];
  presets?: string[];
  recipes?: string[];
  styles?: string[];
  importSources?: string[];
}

export interface ResolvedConfig {
  tokens: false | string[];
  units: false | string[];
  funcs: false | string[];
  states: string[];
  presets: string[];
  recipes: string[];
  styles: string[];
  importSources: string[];
}
