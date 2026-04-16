export interface RsvpDocument {
  id: string;
  title: string;
  source: DocumentSource;
  sections: Section[];
  totalWords: number;
  createdAt: number;
}

export interface DocumentSource {
  type: 'url' | 'pdf' | 'markdown' | 'docx' | 'pptx' | 'text';
  uri: string;
}

export interface Section {
  index: number;
  heading: string | null;
  tokens: RsvpToken[];
}

export interface RsvpToken {
  index: number;
  text: string;
  orpIndex: number;
  displayMs: number;
  isParagraphEnd: boolean;
  isSectionEnd: boolean;
  hasPunctuation: boolean;
}
