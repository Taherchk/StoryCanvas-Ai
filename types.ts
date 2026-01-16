
export interface StoryScene {
  id: string;
  originalText: string;
  imagePrompt: string;
  motionPrompt: string;
  imageUrl?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  shotType: 'main' | 'b-roll';
}

export interface StoryState {
  originalStory: string;
  styleInput: string;
  aspectRatio: string;
  scenes: StoryScene[];
  isAnalyzing: boolean;
  isGenerating: boolean;
}
