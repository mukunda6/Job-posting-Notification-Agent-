'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useScheduler, cronToHuman, getScheduleLogs, triggerScheduleNow, type Schedule, type ExecutionLog } from '@/lib/scheduler'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  HiOutlineBriefcase,
  HiOutlineLocationMarker,
  HiOutlineCurrencyRupee,
  HiOutlineBell,
  HiOutlineBookmark,
  HiOutlineAdjustments,
  HiOutlineSearch,
  HiOutlineClock,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiOutlineExternalLink,
  HiOutlineX,
  HiOutlineCheck,
  HiOutlineRefresh,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineFilter,
  HiOutlineMenu,
  HiOutlineStar,
  HiOutlineCalendar,
  HiOutlineOfficeBuilding,
  HiOutlineAcademicCap,
  HiOutlineCode,
  HiOutlineLightningBolt
} from 'react-icons/hi'
import { Loader2 } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const JOB_SEARCH_AGENT_ID = '6999608e1b86f70befdb2389'
const DAILY_DIGEST_AGENT_ID = '6999608f938bc0103dbe0c78'
const SCHEDULE_ID = '69996097399dfadeac37e296'
const PREFS_KEY = 'jobconnect_preferences'
const SAVED_JOBS_KEY = 'jobconnect_saved_jobs'
const NOTIFICATIONS_KEY = 'jobconnect_notifications'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Job {
  id?: string
  role_title?: string
  company_name?: string
  location?: string
  package_range?: string
  role_type?: string
  experience_level?: string
  company_type?: string
  description?: string
  skills?: string[]
  apply_link?: string
  posted_date?: string
  source?: string
}

interface SavedJob extends Job {
  savedAt: string
}

interface Preferences {
  locations: string[]
  packageMin: number
  packageMax: number
  roleTypes: string[]
  skills: string[]
  experienceLevel: string
  companyTypes: string[]
}

interface Filters {
  locations: string[]
  packageMin: number
  packageMax: number
  roleTypes: string[]
  skills: string[]
  experienceLevel: string
  companyTypes: string[]
}

interface JobSearchResponse {
  jobs?: Job[]
  total_found?: number
  search_summary?: string
  filters_applied?: string
  filters_relaxed?: string
  text?: string
}

interface DailyDigestResponse {
  digest_date?: string
  total_new_opportunities?: number
  digest_summary?: string
  opportunities?: Job[]
  highlights?: string[]
  preferences_used?: string
  text?: string
}

interface NotificationDigest {
  id: string
  date: string
  digest: DailyDigestResponse
  isRead: boolean
}

type Screen = 'dashboard' | 'notifications' | 'saved' | 'preferences'

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------
const defaultPreferences: Preferences = {
  locations: [],
  packageMin: 0,
  packageMax: 50,
  roleTypes: [],
  skills: [],
  experienceLevel: '',
  companyTypes: [],
}

const defaultFilters: Filters = {
  locations: [],
  packageMin: 0,
  packageMax: 50,
  roleTypes: [],
  skills: [],
  experienceLevel: '',
  companyTypes: [],
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------
const sampleJobs: Job[] = [
  {
    id: 'sample-1',
    role_title: 'Frontend Developer',
    company_name: 'TechVista Solutions',
    location: 'Bangalore, Karnataka',
    package_range: '8-14 LPA',
    role_type: 'Full-time',
    experience_level: '1-3 years',
    company_type: 'Startup',
    description: 'We are looking for a passionate Frontend Developer to join our product team. You will work on building responsive web applications using React and Next.js, collaborating with designers and backend engineers to deliver exceptional user experiences.',
    skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS', 'GraphQL'],
    apply_link: 'https://example.com/apply/frontend-dev',
    posted_date: '2026-02-19',
    source: 'LinkedIn',
  },
  {
    id: 'sample-2',
    role_title: 'Data Science Intern',
    company_name: 'AnalytiQ Corp',
    location: 'Mumbai, Maharashtra',
    package_range: '3-5 LPA',
    role_type: 'Internship',
    experience_level: 'Fresher',
    company_type: 'MNC',
    description: 'Join our data science team as an intern and work on real-world projects involving machine learning, natural language processing, and predictive analytics. Great opportunity for fresh graduates looking to kickstart their career.',
    skills: ['Python', 'Machine Learning', 'Pandas', 'SQL', 'TensorFlow'],
    apply_link: 'https://example.com/apply/data-intern',
    posted_date: '2026-02-20',
    source: 'Naukri',
  },
  {
    id: 'sample-3',
    role_title: 'Full Stack Engineer',
    company_name: 'CloudNine Technologies',
    location: 'Hyderabad, Telangana',
    package_range: '12-20 LPA',
    role_type: 'Full-time',
    experience_level: '3-5 years',
    company_type: 'MNC',
    description: 'We are seeking an experienced Full Stack Engineer to design and build scalable microservices and dynamic frontends. You will lead technical decisions and mentor junior developers in an agile environment.',
    skills: ['Node.js', 'React', 'PostgreSQL', 'Docker', 'AWS', 'Kubernetes'],
    apply_link: 'https://example.com/apply/fullstack',
    posted_date: '2026-02-18',
    source: 'Indeed',
  },
  {
    id: 'sample-4',
    role_title: 'DevOps Engineer',
    company_name: 'InfraScale Pvt Ltd',
    location: 'Pune, Maharashtra',
    package_range: '10-16 LPA',
    role_type: 'Contract',
    experience_level: '1-3 years',
    company_type: 'Startup',
    description: 'Looking for a DevOps Engineer to help us build and maintain CI/CD pipelines, manage cloud infrastructure on AWS and GCP, and implement monitoring and alerting solutions for our growing platform.',
    skills: ['AWS', 'Terraform', 'Jenkins', 'Docker', 'Linux', 'Python'],
    apply_link: 'https://example.com/apply/devops',
    posted_date: '2026-02-17',
    source: 'LinkedIn',
  },
  {
    id: 'sample-5',
    role_title: 'UI/UX Designer',
    company_name: 'DesignHub Studio',
    location: 'Delhi, NCR',
    package_range: '6-10 LPA',
    role_type: 'Part-time',
    experience_level: '0-1 years',
    company_type: 'Startup',
    description: 'Creative UI/UX Designer needed to craft intuitive user interfaces for our mobile and web applications. You will conduct user research, create wireframes and prototypes, and work closely with developers to bring designs to life.',
    skills: ['Figma', 'Adobe XD', 'Sketch', 'User Research', 'Prototyping'],
    apply_link: 'https://example.com/apply/uiux',
    posted_date: '2026-02-21',
    source: 'Glassdoor',
  },
]

const sampleDigest: DailyDigestResponse = {
  digest_date: '2026-02-21',
  total_new_opportunities: 3,
  digest_summary: 'Found 3 new opportunities matching your preferences in the last 24 hours. Notable highlights include a well-funded startup in Bangalore offering competitive packages for frontend roles, and a new internship program at a leading MNC in Mumbai.',
  opportunities: sampleJobs.slice(0, 3),
  highlights: [
    'TechVista Solutions raised Series B funding -- actively hiring frontend developers',
    'AnalytiQ Corp launched new internship program for fresh graduates',
    'Remote-friendly roles have increased by 15% compared to last week',
  ],
  preferences_used: 'Locations: Bangalore, Mumbai | Role Types: Full-time, Internship | Skills: React, Python | Experience: Fresher to 3 years',
}

// ---------------------------------------------------------------------------
// Glass style constants
// ---------------------------------------------------------------------------
const glassStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.18)',
}

const gradientBg: React.CSSProperties = {
  background: 'linear-gradient(135deg, hsl(160,40%,94%) 0%, hsl(180,35%,93%) 30%, hsl(160,35%,95%) 60%, hsl(140,40%,94%) 100%)',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parseAgentResult(rawResult: unknown): Record<string, unknown> {
  if (!rawResult) return {}
  if (typeof rawResult === 'object' && !Array.isArray(rawResult)) {
    const obj = rawResult as Record<string, unknown>
    if (obj.jobs || obj.opportunities || obj.digest_date) {
      return obj
    }
    if (obj.result) {
      return parseAgentResult(obj.result)
    }
    if (obj.response) {
      return parseAgentResult(obj.response)
    }
    return obj
  }
  if (typeof rawResult === 'string') {
    try {
      const parsed = JSON.parse(rawResult)
      return parseAgentResult(parsed)
    } catch {
      return { text: rawResult }
    }
  }
  return {}
}

function buildSearchMessage(filters: Filters): string {
  const parts: string[] = ['Find current job postings and internships matching these criteria:']
  if (filters.locations.length > 0) parts.push(`Locations: ${filters.locations.join(', ')}`)
  if (filters.roleTypes.length > 0) parts.push(`Role Types: ${filters.roleTypes.join(', ')}`)
  if (filters.experienceLevel) parts.push(`Experience Level: ${filters.experienceLevel}`)
  if (filters.packageMin || filters.packageMax) parts.push(`Package Range: ${filters.packageMin || 0} - ${filters.packageMax || 50} LPA`)
  if (filters.skills.length > 0) parts.push(`Required Skills: ${filters.skills.join(', ')}`)
  if (filters.companyTypes.length > 0) parts.push(`Company Types: ${filters.companyTypes.join(', ')}`)
  parts.push('Return detailed results with company name, role title, location, package, skills, experience level, apply link, and source.')
  return parts.join('\n')
}

function buildDigestMessage(prefs: Preferences): string {
  const parts: string[] = ['Search for NEW job postings and internships from the last 24-48 hours matching these saved preferences:']
  if (prefs.locations.length > 0) parts.push(`Preferred Locations: ${prefs.locations.join(', ')}`)
  if (prefs.roleTypes.length > 0) parts.push(`Role Types: ${prefs.roleTypes.join(', ')}`)
  if (prefs.experienceLevel) parts.push(`Experience Level: ${prefs.experienceLevel}`)
  if (prefs.packageMin || prefs.packageMax) parts.push(`Package Range: ${prefs.packageMin || 0} - ${prefs.packageMax || 50} LPA`)
  if (prefs.skills.length > 0) parts.push(`Skills: ${prefs.skills.join(', ')}`)
  if (prefs.companyTypes.length > 0) parts.push(`Company Types: ${prefs.companyTypes.join(', ')}`)
  parts.push('Find new opportunities and compile a curated daily digest.')
  return parts.join('\n')
}

function getRoleTypeBadgeClass(roleType?: string): string {
  const rt = (roleType ?? '').toLowerCase()
  if (rt.includes('full')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
  if (rt.includes('intern')) return 'bg-blue-100 text-blue-800 border-blue-200'
  if (rt.includes('part')) return 'bg-amber-100 text-amber-800 border-amber-200'
  if (rt.includes('contract')) return 'bg-purple-100 text-purple-800 border-purple-200'
  return 'bg-gray-100 text-gray-800 border-gray-200'
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SkeletonJobCard() {
  return (
    <div className="rounded-xl p-5 space-y-3" style={glassStyle}>
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-28" />
    </div>
  )
}

function JobCard({
  job,
  isSaved,
  onSave,
  onRemove,
  showRemove,
}: {
  job: Job
  isSaved: boolean
  onSave: (job: Job) => void
  onRemove?: (jobId: string) => void
  showRemove?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const skills = Array.isArray(job?.skills) ? job.skills : []
  const displaySkills = skills.slice(0, 3)
  const remainingSkills = skills.length > 3 ? skills.length - 3 : 0

  return (
    <div className="rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group" style={glassStyle}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base tracking-tight text-foreground truncate">{job?.role_title ?? 'Untitled Role'}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <HiOutlineOfficeBuilding className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">{job?.company_name ?? 'Unknown Company'}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {showRemove && onRemove ? (
            <button onClick={() => onRemove(job?.id ?? '')} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Remove from saved">
              <HiOutlineX className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => onSave(job)} className={cn('p-1.5 rounded-lg transition-colors', isSaved ? 'text-amber-500 hover:bg-amber-50' : 'text-muted-foreground hover:bg-muted hover:text-foreground')} title={isSaved ? 'Already saved' : 'Save job'}>
              {isSaved ? <HiOutlineStar className="w-4 h-4 fill-amber-400" /> : <HiOutlineBookmark className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <HiOutlineLocationMarker className="w-3.5 h-3.5" />
          {job?.location ?? 'Remote'}
        </span>
        <span className="flex items-center gap-1">
          <HiOutlineCurrencyRupee className="w-3.5 h-3.5" />
          {job?.package_range ?? 'Not disclosed'}
        </span>
        <span className="flex items-center gap-1">
          <HiOutlineClock className="w-3.5 h-3.5" />
          {job?.posted_date ?? 'Recent'}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', getRoleTypeBadgeClass(job?.role_type))}>
          {job?.role_type ?? 'N/A'}
        </span>
        {job?.experience_level && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground">
            {job.experience_level}
          </span>
        )}
        {job?.company_type && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted/50 text-muted-foreground">
            {job.company_type}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {displaySkills.map((skill, idx) => (
          <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
            {skill}
          </span>
        ))}
        {remainingSkills > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
            +{remainingSkills} more
          </span>
        )}
      </div>

      {expanded && (
        <div className="mb-3 pt-2 border-t border-border/50">
          {job?.description && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <div className="text-sm text-foreground/90 leading-relaxed">{renderMarkdown(job.description)}</div>
            </div>
          )}
          {skills.length > 3 && (
            <div className="mb-2">
              <p className="text-xs font-medium text-muted-foreground mb-1">All Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, idx) => (
                  <span key={idx} className="text-xs px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {job?.source && (
            <p className="text-xs text-muted-foreground">Source: {job.source}</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-medium text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          {expanded ? <><HiOutlineChevronUp className="w-3 h-3" /> Less details</> : <><HiOutlineChevronDown className="w-3 h-3" /> View details</>}
        </button>
        {job?.apply_link && (
          <a href={job.apply_link} target="_blank" rel="noopener noreferrer" className="ml-auto text-xs font-medium bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1">
            Apply <HiOutlineExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  )
}

function FilterPanel({
  filters,
  setFilters,
  onSearch,
  searching,
  collapsed,
  setCollapsed,
}: {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  onSearch: () => void
  searching: boolean
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const [skillInput, setSkillInput] = useState('')
  const [locationInput, setLocationInput] = useState('')
  const roleTypeOptions = ['Full-time', 'Internship', 'Part-time', 'Contract']
  const experienceLevels = ['Fresher', '0-1 years', '1-3 years', '3-5 years']
  const companyTypeOptions = ['Startup', 'MNC', 'Government', 'NGO']

  const addSkill = () => {
    const trimmed = skillInput.trim()
    if (trimmed && !filters.skills.includes(trimmed)) {
      setFilters(prev => ({ ...prev, skills: [...prev.skills, trimmed] }))
    }
    setSkillInput('')
  }

  const removeSkill = (skill: string) => {
    setFilters(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))
  }

  const addLocation = () => {
    const trimmed = locationInput.trim()
    if (trimmed && !filters.locations.includes(trimmed)) {
      setFilters(prev => ({ ...prev, locations: [...prev.locations, trimmed] }))
    }
    setLocationInput('')
  }

  const removeLocation = (loc: string) => {
    setFilters(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }))
  }

  const toggleRoleType = (rt: string) => {
    setFilters(prev => ({
      ...prev,
      roleTypes: prev.roleTypes.includes(rt) ? prev.roleTypes.filter(r => r !== rt) : [...prev.roleTypes, rt],
    }))
  }

  const toggleCompanyType = (ct: string) => {
    setFilters(prev => ({
      ...prev,
      companyTypes: prev.companyTypes.includes(ct) ? prev.companyTypes.filter(c => c !== ct) : [...prev.companyTypes, ct],
    }))
  }

  const resetFilters = () => {
    setFilters({ ...defaultFilters })
  }

  return (
    <div className="rounded-xl overflow-hidden" style={glassStyle}>
      <button onClick={() => setCollapsed(!collapsed)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
        <span className="flex items-center gap-2 font-semibold text-sm tracking-tight">
          <HiOutlineFilter className="w-4 h-4 text-primary" />
          Filters
        </span>
        {collapsed ? <HiOutlineChevronDown className="w-4 h-4" /> : <HiOutlineChevronUp className="w-4 h-4" />}
      </button>
      {!collapsed && (
        <div className="px-4 pb-4 space-y-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Locations</Label>
            <div className="flex gap-1.5">
              <Input placeholder="Add city..." value={locationInput} onChange={(e) => setLocationInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addLocation() } }} className="h-8 text-xs bg-white/50" />
              <Button size="sm" variant="outline" onClick={addLocation} className="h-8 px-2 text-xs flex-shrink-0">Add</Button>
            </div>
            {filters.locations.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.locations.map(loc => (
                  <span key={loc} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    {loc}
                    <button onClick={() => removeLocation(loc)} className="hover:text-red-500"><HiOutlineX className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Role Type</Label>
            <div className="space-y-1.5">
              {roleTypeOptions.map(rt => (
                <label key={rt} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={filters.roleTypes.includes(rt)} onCheckedChange={() => toggleRoleType(rt)} className="h-3.5 w-3.5" />
                  {rt}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Experience Level</Label>
            <div className="space-y-1.5">
              {experienceLevels.map(el => (
                <label key={el} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="radio" name="filter-experience" checked={filters.experienceLevel === el} onChange={() => setFilters(prev => ({ ...prev, experienceLevel: el }))} className="h-3.5 w-3.5 accent-emerald-600" />
                  {el}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Package Range (LPA)</Label>
            <div className="flex gap-2 items-center">
              <Input type="number" placeholder="Min" value={filters.packageMin || ''} onChange={(e) => setFilters(prev => ({ ...prev, packageMin: Number(e.target.value) || 0 }))} className="h-8 text-xs bg-white/50 w-20" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="number" placeholder="Max" value={filters.packageMax || ''} onChange={(e) => setFilters(prev => ({ ...prev, packageMax: Number(e.target.value) || 0 }))} className="h-8 text-xs bg-white/50 w-20" />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Company Type</Label>
            <div className="space-y-1.5">
              {companyTypeOptions.map(ct => (
                <label key={ct} className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox checked={filters.companyTypes.includes(ct)} onCheckedChange={() => toggleCompanyType(ct)} className="h-3.5 w-3.5" />
                  {ct}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Skills</Label>
            <div className="flex gap-1.5">
              <Input placeholder="Add skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} className="h-8 text-xs bg-white/50" />
              <Button size="sm" variant="outline" onClick={addSkill} className="h-8 px-2 text-xs flex-shrink-0">Add</Button>
            </div>
            {filters.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {filters.skills.map(skill => (
                  <span key={skill} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="hover:text-red-500"><HiOutlineX className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={onSearch} disabled={searching} className="flex-1 h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90">
              {searching ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Searching...</> : <><HiOutlineSearch className="w-3.5 h-3.5 mr-1.5" /> Find Jobs Now</>}
            </Button>
            <Button variant="outline" onClick={resetFilters} className="h-9 text-xs px-3">
              Reset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function Page() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showSampleData, setShowSampleData] = useState(false)

  // Dashboard state
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters })
  const [filtersCollapsed, setFiltersCollapsed] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<JobSearchResponse | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Notifications state
  const [digestLoading, setDigestLoading] = useState(false)
  const [digestResult, setDigestResult] = useState<DailyDigestResponse | null>(null)
  const [digestError, setDigestError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationDigest[]>([])
  const [logsExpanded, setLogsExpanded] = useState(false)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null)

  // Saved jobs state
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [savedSort, setSavedSort] = useState<'date' | 'company' | 'package'>('date')

  // Preferences state
  const [preferences, setPreferences] = useState<Preferences>({ ...defaultPreferences })
  const [prefsSaved, setPrefsSaved] = useState(false)
  const [prefLocationInput, setPrefLocationInput] = useState('')
  const [prefSkillInput, setPrefSkillInput] = useState('')

  // Scheduler
  const { schedules, loading: schedulerLoading, fetchSchedules, toggleSchedule } = useScheduler()

  const digestSchedule = useMemo(() => {
    return schedules.find(s => s.id === SCHEDULE_ID) ?? null
  }, [schedules])

  // ---------------------------------------------------------------------------
  // Effects -- load from localStorage
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const storedPrefs = localStorage.getItem(PREFS_KEY)
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs)
        setPreferences(parsed)
        setFilters(prev => ({
          ...prev,
          locations: Array.isArray(parsed?.locations) ? parsed.locations : [],
          roleTypes: Array.isArray(parsed?.roleTypes) ? parsed.roleTypes : [],
          skills: Array.isArray(parsed?.skills) ? parsed.skills : [],
          experienceLevel: parsed?.experienceLevel ?? '',
          companyTypes: Array.isArray(parsed?.companyTypes) ? parsed.companyTypes : [],
          packageMin: parsed?.packageMin ?? 0,
          packageMax: parsed?.packageMax ?? 50,
        }))
      }
    } catch { /* ignore */ }

    try {
      const storedSaved = localStorage.getItem(SAVED_JOBS_KEY)
      if (storedSaved) {
        const parsed = JSON.parse(storedSaved)
        if (Array.isArray(parsed)) setSavedJobs(parsed)
      }
    } catch { /* ignore */ }

    try {
      const storedNotifs = localStorage.getItem(NOTIFICATIONS_KEY)
      if (storedNotifs) {
        const parsed = JSON.parse(storedNotifs)
        if (Array.isArray(parsed)) setNotifications(parsed)
      }
    } catch { /* ignore */ }

    fetchSchedules()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(savedJobs)) } catch { /* ignore */ }
  }, [savedJobs])

  useEffect(() => {
    try { localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications)) } catch { /* ignore */ }
  }, [notifications])

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleSearch = useCallback(async () => {
    setSearching(true)
    setSearchError(null)
    setSearchResults(null)
    setActiveAgentId(JOB_SEARCH_AGENT_ID)
    try {
      const message = buildSearchMessage(filters)
      const result = await callAIAgent(message, JOB_SEARCH_AGENT_ID)
      if (result.success) {
        const data = parseAgentResult(result?.response?.result)
        setSearchResults(data as unknown as JobSearchResponse)
      } else {
        setSearchError(result?.error ?? 'Search failed. Please try again.')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSearching(false)
      setActiveAgentId(null)
    }
  }, [filters])

  const handleFetchDigest = useCallback(async () => {
    setDigestLoading(true)
    setDigestError(null)
    setDigestResult(null)
    setActiveAgentId(DAILY_DIGEST_AGENT_ID)
    try {
      const message = buildDigestMessage(preferences)
      const result = await callAIAgent(message, DAILY_DIGEST_AGENT_ID)
      if (result.success) {
        const data = parseAgentResult(result?.response?.result) as unknown as DailyDigestResponse
        setDigestResult(data)
        const newNotification: NotificationDigest = {
          id: `digest-${Date.now()}`,
          date: data?.digest_date ?? new Date().toISOString().slice(0, 10),
          digest: data,
          isRead: false,
        }
        setNotifications(prev => [newNotification, ...prev])
      } else {
        setDigestError(result?.error ?? 'Failed to fetch digest.')
      }
    } catch (err) {
      setDigestError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setDigestLoading(false)
      setActiveAgentId(null)
    }
  }, [preferences])

  const handleSaveJob = useCallback((job: Job) => {
    const exists = savedJobs.some(s => s.id === job.id)
    if (!exists) {
      const savedJob: SavedJob = { ...job, savedAt: new Date().toISOString() }
      setSavedJobs(prev => [savedJob, ...prev])
    }
  }, [savedJobs])

  const handleRemoveJob = useCallback((jobId: string) => {
    setSavedJobs(prev => prev.filter(j => j.id !== jobId))
  }, [])

  const isJobSaved = useCallback((jobId?: string) => {
    if (!jobId) return false
    return savedJobs.some(s => s.id === jobId)
  }, [savedJobs])

  const handleSavePreferences = useCallback(() => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(preferences))
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 3000)
    } catch { /* ignore */ }
  }, [preferences])

  const handleToggleSchedule = useCallback(async () => {
    if (!digestSchedule) return
    await toggleSchedule(digestSchedule)
    await fetchSchedules()
  }, [digestSchedule, toggleSchedule, fetchSchedules])

  const handleTriggerNow = useCallback(async () => {
    setTriggerLoading(true)
    setTriggerMessage(null)
    try {
      const result = await triggerScheduleNow(SCHEDULE_ID)
      if (result.success) {
        setTriggerMessage('Schedule triggered successfully. Results will appear shortly.')
      } else {
        setTriggerMessage(result.error ?? 'Failed to trigger schedule.')
      }
    } catch {
      setTriggerMessage('Failed to trigger schedule.')
    } finally {
      setTriggerLoading(false)
      setTimeout(() => setTriggerMessage(null), 5000)
    }
  }, [])

  const handleFetchLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const result = await getScheduleLogs(SCHEDULE_ID, { limit: 10 })
      if (result.success) {
        setExecutionLogs(Array.isArray(result.executions) ? result.executions : [])
      }
    } catch { /* ignore */ }
    setLogsLoading(false)
  }, [])

  const sortedSavedJobs = useMemo(() => {
    const jobs = [...savedJobs]
    if (savedSort === 'date') {
      jobs.sort((a, b) => (b.savedAt ?? '').localeCompare(a.savedAt ?? ''))
    } else if (savedSort === 'company') {
      jobs.sort((a, b) => (a.company_name ?? '').localeCompare(b.company_name ?? ''))
    } else if (savedSort === 'package') {
      jobs.sort((a, b) => (a.package_range ?? '').localeCompare(b.package_range ?? ''))
    }
    return jobs
  }, [savedJobs, savedSort])

  const displayJobs = useMemo(() => {
    if (showSampleData && !searchResults) return sampleJobs
    return Array.isArray((searchResults as JobSearchResponse)?.jobs) ? (searchResults as JobSearchResponse).jobs! : []
  }, [showSampleData, searchResults])

  const displayDigest = useMemo(() => {
    if (showSampleData && !digestResult) return sampleDigest
    return digestResult
  }, [showSampleData, digestResult])

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length
  }, [notifications])

  const navItems: { key: Screen; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <HiOutlineBriefcase className="w-5 h-5" /> },
    { key: 'notifications', label: 'Notifications', icon: <HiOutlineBell className="w-5 h-5" />, badge: unreadCount > 0 ? unreadCount : undefined },
    { key: 'saved', label: 'Saved Jobs', icon: <HiOutlineBookmark className="w-5 h-5" />, badge: savedJobs.length > 0 ? savedJobs.length : undefined },
    { key: 'preferences', label: 'Preferences', icon: <HiOutlineAdjustments className="w-5 h-5" /> },
  ]

  // ---------------------------------------------------------------------------
  // Screen renderers
  // ---------------------------------------------------------------------------

  function renderDashboard() {
    const totalFound = (searchResults as JobSearchResponse)?.total_found
    const searchSummary = (searchResults as JobSearchResponse)?.search_summary
    const filtersApplied = (searchResults as JobSearchResponse)?.filters_applied
    const filtersRelaxed = (searchResults as JobSearchResponse)?.filters_relaxed

    return (
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        <div className="lg:w-72 flex-shrink-0">
          <FilterPanel
            filters={filters}
            setFilters={setFilters}
            onSearch={handleSearch}
            searching={searching}
            collapsed={filtersCollapsed}
            setCollapsed={setFiltersCollapsed}
          />
        </div>

        <div className="flex-1 min-w-0">
          {(searchResults || (showSampleData && !searchResults)) && (
            <div className="rounded-xl p-4 mb-4" style={glassStyle}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h2 className="font-semibold text-base tracking-tight flex items-center gap-2">
                    <HiOutlineBriefcase className="w-4 h-4 text-primary" />
                    {showSampleData && !searchResults ? (
                      <span>5 sample opportunities</span>
                    ) : (
                      <span>Found {totalFound ?? displayJobs.length} opportunities</span>
                    )}
                  </h2>
                  {searchSummary && <p className="text-xs text-muted-foreground mt-1">{searchSummary}</p>}
                </div>
                {filtersApplied && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">{filtersApplied}</span>
                )}
              </div>
              {filtersRelaxed && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <HiOutlineLightningBolt className="w-3.5 h-3.5" />
                  Filters relaxed: {filtersRelaxed}
                </p>
              )}
            </div>
          )}

          {searchError && (
            <div className="rounded-xl p-4 mb-4 bg-red-50 border border-red-200 text-red-700 text-sm">
              {searchError}
            </div>
          )}

          {searching && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => <SkeletonJobCard key={i} />)}
            </div>
          )}

          {!searching && displayJobs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayJobs.map((job, idx) => (
                <JobCard
                  key={job?.id ?? `job-${idx}`}
                  job={job}
                  isSaved={isJobSaved(job?.id)}
                  onSave={handleSaveJob}
                />
              ))}
            </div>
          )}

          {!searching && displayJobs.length === 0 && !searchError && (
            <div className="rounded-xl p-12 text-center" style={glassStyle}>
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <HiOutlineSearch className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg tracking-tight mb-2">Discover Your Next Opportunity</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                Set your preferences in the filter panel and hit Find Jobs to discover opportunities tailored to your skills and interests.
              </p>
              <Button onClick={() => setFiltersCollapsed(false)} variant="outline" className="text-xs">
                <HiOutlineFilter className="w-3.5 h-3.5 mr-1.5" /> Open Filters
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  function renderNotifications() {
    const displayDigestData = displayDigest
    const opportunities = Array.isArray(displayDigestData?.opportunities) ? displayDigestData!.opportunities : []
    const highlights = Array.isArray(displayDigestData?.highlights) ? displayDigestData!.highlights : []

    return (
      <div className="space-y-4">
        {/* Schedule Management Panel */}
        <div className="rounded-xl p-5" style={glassStyle}>
          <h2 className="font-semibold text-base tracking-tight flex items-center gap-2 mb-4">
            <HiOutlineCalendar className="w-4 h-4 text-primary" />
            Daily Digest Schedule
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', digestSchedule?.is_active ? 'bg-emerald-500' : 'bg-gray-400')} />
                <span className="text-sm font-medium">{digestSchedule?.is_active ? 'Active' : digestSchedule ? 'Paused' : 'Loading...'}</span>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Schedule</p>
              <p className="text-sm font-medium">{cronToHuman('0 8 * * *')}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Timezone</p>
              <p className="text-sm font-medium">Asia/Kolkata</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground mb-1">Next Run</p>
              <p className="text-sm font-medium">{digestSchedule?.next_run_time ? new Date(digestSchedule.next_run_time).toLocaleString() : 'N/A'}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={digestSchedule?.is_active ? 'outline' : 'default'} onClick={handleToggleSchedule} disabled={schedulerLoading || !digestSchedule} className="text-xs h-8">
              {schedulerLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : digestSchedule?.is_active ? <HiOutlinePause className="w-3.5 h-3.5 mr-1" /> : <HiOutlinePlay className="w-3.5 h-3.5 mr-1" />}
              {digestSchedule?.is_active ? 'Pause Schedule' : 'Resume Schedule'}
            </Button>
            <Button size="sm" variant="outline" onClick={handleTriggerNow} disabled={triggerLoading} className="text-xs h-8">
              {triggerLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <HiOutlineLightningBolt className="w-3.5 h-3.5 mr-1" />}
              Run Now
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setLogsExpanded(!logsExpanded); if (!logsExpanded) handleFetchLogs() }} className="text-xs h-8">
              <HiOutlineClock className="w-3.5 h-3.5 mr-1" />
              {logsExpanded ? 'Hide History' : 'Run History'}
            </Button>
          </div>

          {triggerMessage && (
            <div className={cn('mt-3 text-xs px-3 py-2 rounded-lg', triggerMessage.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200')}>
              {triggerMessage}
            </div>
          )}

          {logsExpanded && (
            <div className="mt-4 border-t border-border/50 pt-4">
              <h3 className="text-sm font-medium mb-2">Recent Executions</h3>
              {logsLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 w-full" />)}
                </div>
              ) : executionLogs.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {executionLogs.map((log, idx) => (
                    <div key={log?.id ?? `log-${idx}`} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full', log?.success ? 'bg-emerald-500' : 'bg-red-500')} />
                        <span>{log?.executed_at ? new Date(log.executed_at).toLocaleString() : 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">Attempt {log?.attempt ?? '?'}/{log?.max_attempts ?? '?'}</span>
                        <span className={cn('font-medium', log?.success ? 'text-emerald-600' : 'text-red-600')}>
                          {log?.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No execution logs available.</p>
              )}
            </div>
          )}
        </div>

        {/* Fetch latest digest */}
        <div className="rounded-xl p-4" style={glassStyle}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-sm tracking-tight">Latest Digest</h3>
              <p className="text-xs text-muted-foreground">Manually fetch the latest curated opportunities based on your preferences</p>
            </div>
            <Button onClick={handleFetchDigest} disabled={digestLoading} className="text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90">
              {digestLoading ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Fetching...</> : <><HiOutlineRefresh className="w-3.5 h-3.5 mr-1.5" /> Fetch Latest Digest</>}
            </Button>
          </div>
        </div>

        {digestError && (
          <div className="rounded-xl p-4 bg-red-50 border border-red-200 text-red-700 text-sm">
            {digestError}
          </div>
        )}

        {digestLoading && (
          <div className="space-y-4">
            <SkeletonJobCard />
            <SkeletonJobCard />
          </div>
        )}

        {!digestLoading && displayDigestData && (
          <div className="space-y-4">
            <div className="rounded-xl p-5" style={glassStyle}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h3 className="font-semibold text-base tracking-tight flex items-center gap-2">
                  <HiOutlineBell className="w-4 h-4 text-primary" />
                  Digest for {displayDigestData?.digest_date ?? 'Today'}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {displayDigestData?.total_new_opportunities ?? opportunities.length} new opportunities
                </Badge>
              </div>
              {displayDigestData?.digest_summary && (
                <div className="text-sm text-foreground/80 leading-relaxed mb-3">
                  {renderMarkdown(displayDigestData.digest_summary)}
                </div>
              )}
              {displayDigestData?.preferences_used && (
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Preferences used:</span> {displayDigestData.preferences_used}
                </p>
              )}
            </div>

            {highlights.length > 0 && (
              <div className="rounded-xl p-5" style={glassStyle}>
                <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
                  <HiOutlineStar className="w-4 h-4 text-amber-500" />
                  Highlights
                </h3>
                <ul className="space-y-2">
                  {highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {opportunities.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((job, idx) => (
                  <JobCard
                    key={job?.id ?? `digest-job-${idx}`}
                    job={job}
                    isSaved={isJobSaved(job?.id)}
                    onSave={handleSaveJob}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!digestLoading && !displayDigestData && (
          <div className="rounded-xl p-12 text-center" style={glassStyle}>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HiOutlineBell className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg tracking-tight mb-2">No Notifications Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Your daily digest will appear here at 8:00 AM. You can also manually fetch the latest digest using the button above.
            </p>
          </div>
        )}

        {notifications.length > 0 && (
          <div className="rounded-xl p-5" style={glassStyle}>
            <h3 className="font-semibold text-sm tracking-tight mb-3">Previous Digests</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {notifications.map(notif => (
                <div key={notif.id} className="flex items-center justify-between text-xs bg-muted/20 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={cn('w-1.5 h-1.5 rounded-full', notif.isRead ? 'bg-gray-400' : 'bg-primary')} />
                    <span>{notif.date}</span>
                    <span className="text-muted-foreground">
                      {notif.digest?.total_new_opportunities ?? 0} opportunities
                    </span>
                  </div>
                  <button onClick={() => {
                    setDigestResult(notif.digest)
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
                  }} className="text-primary hover:underline">
                    View
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  function renderSavedJobs() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl p-4" style={glassStyle}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-semibold text-base tracking-tight flex items-center gap-2">
              <HiOutlineBookmark className="w-4 h-4 text-primary" />
              Saved Jobs
              <Badge variant="secondary" className="text-xs">{savedJobs.length}</Badge>
            </h2>
            {savedJobs.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Sort by:</span>
                <select value={savedSort} onChange={(e) => setSavedSort(e.target.value as typeof savedSort)} className="text-xs bg-white/50 border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="date">Date Saved</option>
                  <option value="company">Company Name</option>
                  <option value="package">Package</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {sortedSavedJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedSavedJobs.map((job, idx) => (
              <JobCard
                key={job?.id ?? `saved-${idx}`}
                job={job}
                isSaved={true}
                onSave={handleSaveJob}
                onRemove={handleRemoveJob}
                showRemove={true}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl p-12 text-center" style={glassStyle}>
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <HiOutlineBookmark className="w-8 h-8 text-primary" />
            </div>
            <h3 className="font-semibold text-lg tracking-tight mb-2">No Saved Jobs Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Browse opportunities on the Dashboard and save the ones you are interested in. They will appear here for easy access.
            </p>
            <Button onClick={() => setActiveScreen('dashboard')} variant="outline" className="mt-4 text-xs">
              <HiOutlineSearch className="w-3.5 h-3.5 mr-1.5" /> Browse Jobs
            </Button>
          </div>
        )}
      </div>
    )
  }

  function renderPreferences() {
    const roleTypeOptions = ['Full-time', 'Internship', 'Part-time', 'Contract']
    const experienceLevels = ['Fresher', '0-1 years', '1-3 years', '3-5 years']
    const companyTypeOptions = ['Startup', 'MNC', 'Government', 'NGO']

    const addPrefLocation = () => {
      const trimmed = prefLocationInput.trim()
      if (trimmed && !preferences.locations.includes(trimmed)) {
        setPreferences(prev => ({ ...prev, locations: [...prev.locations, trimmed] }))
      }
      setPrefLocationInput('')
    }

    const addPrefSkill = () => {
      const trimmed = prefSkillInput.trim()
      if (trimmed && !preferences.skills.includes(trimmed)) {
        setPreferences(prev => ({ ...prev, skills: [...prev.skills, trimmed] }))
      }
      setPrefSkillInput('')
    }

    return (
      <div className="space-y-4 max-w-2xl">
        {prefsSaved && (
          <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center gap-2">
            <HiOutlineCheck className="w-4 h-4" />
            Preferences saved successfully. These will be used for job searches and daily digests.
          </div>
        )}

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineLocationMarker className="w-4 h-4 text-primary" />
            Location Preferences
          </h3>
          <div className="flex gap-1.5 mb-2">
            <Input placeholder="Add a city (e.g., Bangalore)..." value={prefLocationInput} onChange={(e) => setPrefLocationInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPrefLocation() } }} className="h-9 text-sm bg-white/50" />
            <Button size="sm" variant="outline" onClick={addPrefLocation} className="h-9 px-3 text-xs">Add</Button>
          </div>
          {preferences.locations.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {preferences.locations.map(loc => (
                <span key={loc} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  {loc}
                  <button onClick={() => setPreferences(prev => ({ ...prev, locations: prev.locations.filter(l => l !== loc) }))} className="hover:text-red-500">
                    <HiOutlineX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineCurrencyRupee className="w-4 h-4 text-primary" />
            Package Range (LPA)
          </h3>
          <div className="flex gap-3 items-center">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Minimum</Label>
              <Input type="number" placeholder="0" value={preferences.packageMin || ''} onChange={(e) => setPreferences(prev => ({ ...prev, packageMin: Number(e.target.value) || 0 }))} className="h-9 text-sm bg-white/50" />
            </div>
            <span className="text-sm text-muted-foreground mt-5">to</span>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Maximum</Label>
              <Input type="number" placeholder="50" value={preferences.packageMax || ''} onChange={(e) => setPreferences(prev => ({ ...prev, packageMax: Number(e.target.value) || 0 }))} className="h-9 text-sm bg-white/50" />
            </div>
          </div>
        </div>

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineBriefcase className="w-4 h-4 text-primary" />
            Role Types
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {roleTypeOptions.map(rt => (
              <label key={rt} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <Checkbox checked={preferences.roleTypes.includes(rt)} onCheckedChange={(checked) => {
                  setPreferences(prev => ({
                    ...prev,
                    roleTypes: checked ? [...prev.roleTypes, rt] : prev.roleTypes.filter(r => r !== rt),
                  }))
                }} />
                {rt}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineCode className="w-4 h-4 text-primary" />
            Skills
          </h3>
          <div className="flex gap-1.5 mb-2">
            <Input placeholder="Add a skill (e.g., React, Python)..." value={prefSkillInput} onChange={(e) => setPrefSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addPrefSkill() } }} className="h-9 text-sm bg-white/50" />
            <Button size="sm" variant="outline" onClick={addPrefSkill} className="h-9 px-3 text-xs">Add</Button>
          </div>
          {preferences.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {preferences.skills.map(skill => (
                <span key={skill} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  {skill}
                  <button onClick={() => setPreferences(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }))} className="hover:text-red-500">
                    <HiOutlineX className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineAcademicCap className="w-4 h-4 text-primary" />
            Experience Level
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {experienceLevels.map(el => (
              <label key={el} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <input type="radio" name="pref-experience" checked={preferences.experienceLevel === el} onChange={() => setPreferences(prev => ({ ...prev, experienceLevel: el }))} className="h-4 w-4 accent-emerald-600" />
                {el}
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-5" style={glassStyle}>
          <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 mb-3">
            <HiOutlineOfficeBuilding className="w-4 h-4 text-primary" />
            Company Type
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {companyTypeOptions.map(ct => (
              <label key={ct} className="flex items-center gap-2.5 text-sm cursor-pointer p-2 rounded-lg hover:bg-muted/30 transition-colors">
                <Checkbox checked={preferences.companyTypes.includes(ct)} onCheckedChange={(checked) => {
                  setPreferences(prev => ({
                    ...prev,
                    companyTypes: checked ? [...prev.companyTypes, ct] : prev.companyTypes.filter(c => c !== ct),
                  }))
                }} />
                {ct}
              </label>
            ))}
          </div>
        </div>

        <Button onClick={handleSavePreferences} className="w-full h-10 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90">
          <HiOutlineCheck className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Main Render
  // ---------------------------------------------------------------------------
  return (
    <ErrorBoundary>
      <div className="min-h-screen font-sans tracking-tight" style={gradientBg}>
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-40 px-4 py-3 flex items-center justify-between" style={{ ...glassStyle, background: 'rgba(255,255,255,0.9)' }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
            <HiOutlineMenu className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg tracking-tight text-foreground flex items-center gap-2">
            <HiOutlineBriefcase className="w-5 h-5 text-primary" />
            JobConnect
          </h1>
          <div className="flex items-center gap-1">
            <Label htmlFor="sample-mobile" className="text-xs text-muted-foreground">Sample</Label>
            <Switch id="sample-mobile" checked={showSampleData} onCheckedChange={setShowSampleData} className="scale-75" />
          </div>
        </div>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/30" onClick={() => setSidebarOpen(false)}>
            <div className="absolute left-0 top-0 bottom-0 w-64 rounded-r-2xl p-4 flex flex-col" style={{ ...glassStyle, background: 'rgba(255,255,255,0.95)' }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                    <HiOutlineBriefcase className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <span className="font-bold text-lg tracking-tight">JobConnect</span>
                </div>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-muted/30">
                  <HiOutlineX className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1 flex-1">
                {navItems.map(item => (
                  <button key={item.key} onClick={() => { setActiveScreen(item.key); setSidebarOpen(false) }} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', activeScreen === item.key ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-foreground/70')}>
                    {item.icon}
                    {item.label}
                    {(item.badge ?? 0) > 0 && (
                      <span className={cn('ml-auto text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center', activeScreen === item.key ? 'bg-white/20 text-primary-foreground' : 'bg-primary/10 text-primary')}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="flex min-h-screen">
          {/* Desktop sidebar */}
          <aside className="hidden lg:flex lg:flex-col w-64 p-4 sticky top-0 h-screen flex-shrink-0">
            <div className="rounded-2xl p-4 flex flex-col h-full" style={{ ...glassStyle, background: 'rgba(255,255,255,0.85)' }}>
              <div className="flex items-center gap-2.5 mb-8 px-2">
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
                  <HiOutlineBriefcase className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="font-bold text-xl tracking-tight">JobConnect</span>
              </div>

              <nav className="space-y-1 flex-1">
                {navItems.map(item => (
                  <button key={item.key} onClick={() => setActiveScreen(item.key)} className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200', activeScreen === item.key ? 'bg-primary text-primary-foreground shadow-md' : 'hover:bg-muted/50 text-foreground/70')}>
                    {item.icon}
                    {item.label}
                    {(item.badge ?? 0) > 0 && (
                      <span className={cn('ml-auto text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center', activeScreen === item.key ? 'bg-white/20 text-primary-foreground' : 'bg-primary/10 text-primary')}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>

              <Separator className="my-3" />

              <div className="px-2 py-2 flex items-center justify-between">
                <Label htmlFor="sample-data" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
                <Switch id="sample-data" checked={showSampleData} onCheckedChange={setShowSampleData} />
              </div>

              <div className="mt-2 px-2 py-3 rounded-xl bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Powered by</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === JOB_SEARCH_AGENT_ID ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300')} />
                    <span className="truncate text-foreground/70">Job Search Agent</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={cn('w-1.5 h-1.5 rounded-full', activeAgentId === DAILY_DIGEST_AGENT_ID ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300')} />
                    <span className="truncate text-foreground/70">Daily Digest Agent</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 min-w-0 p-4 lg:pl-0 lg:pr-6 lg:py-6">
            <div className="mb-5">
              <h1 className="font-bold text-2xl tracking-tight text-foreground">
                {activeScreen === 'dashboard' && 'Dashboard'}
                {activeScreen === 'notifications' && 'Notifications'}
                {activeScreen === 'saved' && 'Saved Jobs'}
                {activeScreen === 'preferences' && 'Preferences'}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeScreen === 'dashboard' && 'Search and discover job opportunities'}
                {activeScreen === 'notifications' && 'Your daily curated digest and schedule management'}
                {activeScreen === 'saved' && 'Review and apply to your bookmarked positions'}
                {activeScreen === 'preferences' && 'Configure your job search criteria'}
              </p>
            </div>

            <div className="pb-8">
              {activeScreen === 'dashboard' && renderDashboard()}
              {activeScreen === 'notifications' && renderNotifications()}
              {activeScreen === 'saved' && renderSavedJobs()}
              {activeScreen === 'preferences' && renderPreferences()}
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
