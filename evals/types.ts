export type EvalTask = {
  name: string;
  prompt: string;
  check: (dir: string) => Promise<boolean>;
  setup?: (dir: string) => Promise<void>;
};

export type TaskResult = {
  name: string;
  passed: boolean;
  toolCallCount: number;
  error?: string;
};
