export interface ScheduleEntry {
  day: string
  classroom: string
  building: string
  time_from: string
  time_to: string
}

export interface Commission {
  name: string
  schedule: ScheduleEntry[]
}

export interface Subject {
  section: string
  subject_id: string
  name: string
  credits: number
  dependencies: string[]
  credits_required: number | null
  course_start: string
  course_end: string
  commissions: Commission[]
}

export interface ApiResponse {
  [category: string]: {
    [year: string]: {
      [semester: string]: Subject[]
    }
  }
}

export interface Comment {
  id: string
  subjectId: string
  text: string
  timestamp: number
  likes: number
}
