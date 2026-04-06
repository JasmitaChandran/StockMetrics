'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  BrainCircuit,
  Briefcase,
  GraduationCap,
  Landmark,
  PiggyBank,
  TrendingUp,
} from 'lucide-react';
import { SectionCard } from '@/components/common/section-card';
import { cn } from '@/lib/utils/cn';
import {
  freeCourseCatalog,
  learningCategories,
  type FreeCourseResource,
  type LearningCategory,
  type LearningProvider,
} from '@/lib/learning/free-course-catalog';

const providerStyles: Record<LearningProvider, string> = {
  'Khan Academy': 'bg-emerald-500/15 text-emerald-200 border border-emerald-400/20',
  'MIT OpenCourseWare': 'bg-sky-500/15 text-sky-200 border border-sky-400/20',
  'Open Yale Courses': 'bg-rose-500/15 text-rose-200 border border-rose-400/20',
};

const themeStyles: Record<FreeCourseResource['thumbnailTheme'], string> = {
  emerald: 'from-emerald-500/90 via-teal-500/70 to-cyan-500/80 border-emerald-300/20',
  blue: 'from-blue-500/90 via-indigo-500/75 to-sky-500/80 border-blue-300/20',
  indigo: 'from-indigo-500/90 via-violet-500/75 to-blue-500/80 border-indigo-300/20',
  amber: 'from-amber-400/90 via-orange-500/70 to-rose-500/80 border-amber-200/20',
  rose: 'from-rose-500/90 via-fuchsia-500/75 to-orange-400/80 border-rose-200/20',
  cyan: 'from-cyan-500/90 via-sky-500/75 to-blue-500/80 border-cyan-200/20',
};

function categoryIcon(category: LearningCategory) {
  if (category === 'Stocks') return <TrendingUp className="h-5 w-5" />;
  if (category === 'Investing') return <PiggyBank className="h-5 w-5" />;
  if (category === 'Personal Finance') return <Briefcase className="h-5 w-5" />;
  if (category === 'Markets') return <Landmark className="h-5 w-5" />;
  return <BrainCircuit className="h-5 w-5" />;
}

function CourseCard({ course }: { course: FreeCourseResource }) {
  return (
    <article className="ui-panel glass surface-hover flex h-full flex-col overflow-hidden rounded-[28px]">
      <div
        className={cn(
          'relative overflow-hidden border-b bg-gradient-to-br px-5 py-5 text-white',
          themeStyles[course.thumbnailTheme],
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.06),transparent)]" />
        <div className="absolute right-4 top-4 rounded-2xl border border-white/20 bg-white/10 p-3 text-white/90 backdrop-blur-sm">
          {categoryIcon(course.category)}
        </div>
        <div className="relative space-y-3">
          <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
            {course.provider}
          </div>
          <div>
            <div className="font-sora text-2xl font-bold tracking-tight">{course.thumbnailTitle}</div>
            <p className="mt-1 max-w-[18rem] text-sm text-white/80">{course.thumbnailSubtitle}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]', providerStyles[course.provider])}>
              {course.provider}
            </span>
            <span className="rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              {course.level}
            </span>
            <span className="rounded-full border border-border bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
              {course.category}
            </span>
          </div>

          <div>
            <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{course.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{course.summary}</p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/45 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              Why It’s Useful
            </div>
            <div className="flex flex-wrap gap-2">
              {course.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-border/70 bg-card/80 px-3 py-1 text-xs text-slate-600 dark:text-slate-300"
                >
                  {highlight}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{course.format}</p>
          </div>
        </div>

        <Link
          href={course.url}
          target="_blank"
          rel="noreferrer"
          className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95"
        >
          Open Free Course
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

export function LearningCourseHub() {
  const [activeCategory, setActiveCategory] = useState<LearningCategory | 'All'>('All');
  const [query, setQuery] = useState('');

  const filteredCourses = useMemo(() => {
    return freeCourseCatalog.filter((course) => {
      const matchesCategory = activeCategory === 'All' || course.category === activeCategory;
      const normalizedQuery = query.trim().toLowerCase();
      const haystack = [course.title, course.provider, course.category, course.summary, ...course.highlights].join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

  return (
    <div className="mx-auto w-full max-w-[1560px] space-y-6">
      <SectionCard title="Learning" subtitle="Curated free finance courses from well-known education platforms.">
        <div className="ui-panel glass hero-glow overflow-hidden rounded-[32px] p-6 md:p-8">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <GraduationCap className="h-4 w-4 text-indigo-300" />
              Learn Finance Free
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl font-sora text-3xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
                Start with stocks, investing, and finance from trusted platforms.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                The Learning tab now focuses on free official courses. Every card opens the original course page on Khan Academy, MIT OpenCourseWare, or Open Yale Courses.
              </p>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {filteredCourses.length} courses shown • {freeCourseCatalog.length} total free courses
              </p>
            </div>
            <div className="max-w-xl">
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courses by topic, provider, or keyword..."
                className="w-full rounded-2xl border border-border bg-card/60 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-accent dark:text-white"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              {learningCategories.map((category) => (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setActiveCategory(category.value)}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm font-medium transition',
                    activeCategory === category.value
                      ? 'border-indigo-400/30 bg-indigo-500/20 text-white'
                      : 'border-border bg-card/55 text-slate-600 hover:bg-muted/55 dark:text-slate-300',
                  )}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      {filteredCourses.length ? (
        <div className="grid gap-6 md:grid-cols-2 2xl:grid-cols-3">
          {filteredCourses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      ) : (
        <SectionCard title="No Matches" subtitle="Try another keyword or switch the topic filter.">
          <div className="rounded-2xl border border-dashed border-border/70 bg-card/35 p-8 text-sm text-slate-500 dark:text-slate-400">
            No course matched your current search. Try terms like `stocks`, `banking`, `retirement`, `valuation`, or `taxes`.
          </div>
        </SectionCard>
      )}
    </div>
  );
}
