export interface Milestone {
  id: string
  title: string
  description: string
  status: string
  dueDate?: string | null
  order: number
}

export interface Resource {
  id: string
  title: string
  url?: string | null
  type: string
}

export interface Task {
  id: string
  day: number
  week?: number | null
  phase?: string | null
  title: string
  description: string
  type: string
  platform?: string | null
  url?: string | null
  completed: boolean
}

export interface Goal {
  id: string
  title: string
  description: string
  category: string
  status: string
  targetDate?: string | null
  durationDays?: number | null
  skillLevel?: string | null
  milestones: Milestone[]
  resources: Resource[]
  tasks?: Task[]
}
