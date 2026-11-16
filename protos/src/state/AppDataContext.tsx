import { createContext, useContext, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { issues as seedIssues, tasks as seedTasks } from "../data";
import type { Issue, Task } from "../types/domain";

// A single in-memory store for tasks, issues, and task photos that lives ABOVE
// the per-app route split (mobile, network-operator, ...). Each app provider
// consumes this so a task completed in the mobile app is visible to the
// manager's Issues Dashboard within the same session.
interface AppDataValue {
  tasks: Task[];
  setTasks: Dispatch<SetStateAction<Task[]>>;
  issues: Issue[];
  setIssues: Dispatch<SetStateAction<Issue[]>>;
  taskPhotos: Record<string, string[]>;
  setTaskPhotos: Dispatch<SetStateAction<Record<string, string[]>>>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(seedTasks);
  const [issues, setIssues] = useState<Issue[]>(seedIssues);
  const [taskPhotos, setTaskPhotos] = useState<Record<string, string[]>>({});

  return (
    <AppDataContext.Provider
      value={{ tasks, setTasks, issues, setIssues, taskPhotos, setTaskPhotos }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within an AppDataProvider");
  return ctx;
}
