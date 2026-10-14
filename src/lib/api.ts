const API_BASE_URL = "https://mediq-api-e9aa.onrender.com";

export interface PredictionResponse {
  generated_at: string;
  predicted_disease: string;
  top_class_score_percent: number;
  probability_distribution: { disease: string; score_percent: number }[];
  input_features: Record<string, number>;
  shap_contributions: {
    feature: string; input_value: number; contribution: number;
    absolute_contribution: number; direction: "positive" | "negative" | "neutral";
  }[];
  disease_information: Record<string, unknown>;
  shap_warning: string | null;
  disclaimer: string;
}
export interface DiseaseItem { name: string; information: Record<string, unknown> }
export interface PredictPayload {
  Age: number; Gender: number; ESR: number; CRP: number; RF: number;
  "Anti-CCP": number; "HLA-B27": number; ANA: number; "Anti-Ro": number;
  "Anti-La": number; "Anti-dsDNA": number; "Anti-Sm": number; C3: number; C4: number;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try { const body = await response.json(); detail = body.detail || detail; } catch {}
    throw new Error(detail);
  }
  return response.json() as Promise<T>;
}
export const api = {
  health: () => request<{status:string; model_loaded:boolean; feature_count:number; class_count:number}>("/health"),
  diseases: () => request<{diseases: DiseaseItem[]}>("/diseases"),
  predict: (payload: PredictPayload) => request<PredictionResponse>("/predict", { method: "POST", body: JSON.stringify(payload) }),
  report: (payload: PredictPayload) => request<{filename:string; content:string}>("/report", { method: "POST", body: JSON.stringify(payload) }),
};
export function toPredictPayload(values: Record<string,string>): PredictPayload {
  const number = (key: string) => {
    const value = values[key];
    if (value === undefined || value.trim() === "") throw new Error(`Please complete ${key}.`);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`${key} must be a valid number.`);
    return parsed;
  };
  const status = (key: string) => {
    const value = values[key];
    if (!value) throw new Error(`Please select ${key}.`);
    return value.toLowerCase() === "positive" ? 1 : 0;
  };
  const genderValue = values.gender?.toLowerCase();
  if (!genderValue) throw new Error("Please select Gender.");
  if (!["female", "male"].includes(genderValue)) throw new Error("Choose Female or Male because the current model supports only its original binary gender encoding.");
  return {
    Age:number("age"), Gender:genderValue === "male" ? 1 : 0, ESR:number("esr"), CRP:number("crp"), RF:number("rf"),
    "Anti-CCP":number("anti-ccp"), "HLA-B27":status("hla-b27"), ANA:status("ana"),
    "Anti-Ro":status("anti-ro"), "Anti-La":status("anti-la"), "Anti-dsDNA":status("anti-dsdna"),
    "Anti-Sm":status("anti-sm"), C3:number("c3"), C4:number("c4"),
  };
}
