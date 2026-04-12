// Shared wizard types — used by BuildWizard and all step components.

export type ThemeKey =
  | "geometric"
  | "neo_traditional"
  | "blackwork"
  | "realism"
  | "new_school"
  | "watercolor"
  | "auto";

export type LayoutKey = "monolith" | "split" | "showcase" | "raw" | "auto";

export type WizardState = {
  step: 1 | 2 | 3 | 4;
  igHandle: string;
  artistName: string;
  country: string;
  email: string;
  themeKey: ThemeKey;
  layout: LayoutKey;
};

export const INITIAL_WIZARD_STATE: WizardState = {
  step: 1,
  igHandle: "",
  artistName: "",
  country: "",
  email: "",
  themeKey: "auto",
  layout: "auto",
};
