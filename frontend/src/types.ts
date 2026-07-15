export interface AppFlow {
  app_name: string;
  tagline: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  font_style: string;
  icon_style: string;
  target_audience: string;
  estimated_dev_time: string;
  tech_stack: string[];
  screens: AppScreen[];
}


export interface AppScreen {
  id: string;
  name: string;
  type: "splash" | "onboarding" | "auth" | "home" | "search" | "profile" | "detail" | "success" | "empty";
  description: string;
  content: ScreenContent;
}


export interface ScreenContent {
  greeting?: string;
  subtitle?: string;
  primary_action?: string;
  secondary_action?: string;
  elements?: string[];
}

export interface GenerationStep {
  step: number;
  message: string;
  done: boolean;
}

export interface GenerateOptions {
  primaryColor: string;
  style: string;
}

