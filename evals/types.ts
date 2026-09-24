export type EvalTask = {
  name: string;
  prompt: string;
  check: (dir: string) => Promise<boolean>;
};
