export interface DevUpdate {
  id: string;
  date: string;
  type: 'bug' | 'in-progress' | 'planned' | 'info';
  title: string;
  description?: string;
}

const devUpdates: DevUpdate[] = [];

export default devUpdates;
