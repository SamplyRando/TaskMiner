import {
  Activity,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Circle,
  FolderKanban,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Users,
} from "lucide-react";

import {
  FloatingPreviewWidgets,
  KanbanGlimpse,
} from "@/components/marketing/preview-widgets";

const previewNavigation = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: FolderKanban, label: "Projects", active: false },
  { icon: Check, label: "My tasks", active: false },
  { icon: Activity, label: "Activity", active: false },
] as const;

const kpis = [
  { label: "Backlog", value: "24", detail: "+12%", tone: "purple" },
  { label: "In progress", value: "8", detail: "3 due soon", tone: "blue" },
  { label: "Completed", value: "37", detail: "This month", tone: "green" },
  { label: "Velocity", value: "92%", detail: "+8%", tone: "amber" },
] as const;

const activities = [
  { initials: "AL", text: "moved a task to Done", time: "2m" },
  { initials: "SK", text: "commented on Roadmap", time: "8m" },
  { initials: "MJ", text: "created Project brief", time: "21m" },
] as const;

export function ProductPreview() {
  return (
    <figure
      className="marketing-preview marketing-reveal marketing-reveal--preview"
      id="demo"
    >
      <div aria-hidden="true" className="marketing-preview__glow" />
      <div aria-hidden="true" className="marketing-preview__window">
        <div className="marketing-preview__chrome">
          <div className="marketing-preview__traffic-lights">
            <span />
            <span />
            <span />
          </div>
          <div className="marketing-preview__address">
            <span className="marketing-preview__lock" />
            app.taskminer.io
          </div>
          <MoreHorizontal className="size-4" />
        </div>

        <div className="marketing-product">
          <aside className="marketing-product__sidebar">
            <div className="marketing-product__logo">
              <span>TM</span>
              TaskMiner
            </div>
            <div className="marketing-product__workspace">
              <span className="marketing-product__workspace-mark">A</span>
              <span>Acme Studio</span>
              <ChevronDown className="size-3.5" />
            </div>
            <div className="marketing-product__nav">
              {previewNavigation.map(({ active, icon: Icon, label }) => (
                <div
                  className={
                    active ? "marketing-product__nav-item--active" : undefined
                  }
                  key={label}
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
            <div className="marketing-product__sidebar-footer">
              <div>
                <Users className="size-3.5" />
                Team
              </div>
              <div>
                <Settings className="size-3.5" />
                Settings
              </div>
            </div>
          </aside>

          <div className="marketing-product__main">
            <div className="marketing-product__topbar">
              <div className="marketing-product__search">
                <Search className="size-3.5" />
                Search anything…
                <kbd>⌘ K</kbd>
              </div>
              <div className="marketing-product__topbar-actions">
                <span className="marketing-product__notification">
                  <Bell className="size-4" />
                  <span />
                </span>
                <span className="marketing-product__new-task">
                  <Plus className="size-3.5" />
                  New task
                </span>
                <span className="marketing-product__avatar">AL</span>
              </div>
            </div>

            <div className="marketing-product__content">
              <div className="marketing-product__heading">
                <div>
                  <span>MONDAY, MAY 12</span>
                  <h2>Good morning, Alex</h2>
                </div>
                <div className="marketing-product__presence">
                  <span>AL</span>
                  <span>SK</span>
                  <span>MJ</span>
                  <strong>+4</strong>
                </div>
              </div>

              <div className="marketing-product__kpis">
                {kpis.map((kpi) => (
                  <div
                    className={`marketing-kpi marketing-kpi--${kpi.tone}`}
                    key={kpi.label}
                  >
                    <div>
                      <span>{kpi.label}</span>
                      <Circle className="size-2.5" fill="currentColor" />
                    </div>
                    <strong>{kpi.value}</strong>
                    <small>{kpi.detail}</small>
                    <span className="marketing-kpi__sparkline">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </span>
                  </div>
                ))}
              </div>

              <div className="marketing-product__grid">
                <section className="marketing-panel marketing-panel--tasks">
                  <div className="marketing-panel__header">
                    <div>
                      <h3>Priority board</h3>
                      <span>12 tasks across 4 projects</span>
                    </div>
                    <span className="marketing-panel__link">Open board</span>
                  </div>
                  <KanbanGlimpse />
                </section>

                <section className="marketing-panel marketing-panel--activity">
                  <div className="marketing-panel__header">
                    <div>
                      <h3>Activity</h3>
                      <span>Live updates</span>
                    </div>
                    <span className="marketing-live-dot" />
                  </div>
                  <div className="marketing-activity-list">
                    {activities.map((item) => (
                      <div
                        className="marketing-activity"
                        key={`${item.initials}-${item.time}`}
                      >
                        <span>{item.initials}</span>
                        <p>{item.text}</p>
                        <time>{item.time}</time>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="marketing-panel marketing-panel--analytics">
                  <div className="marketing-panel__header">
                    <div>
                      <h3>Team momentum</h3>
                      <span>Last 7 days</span>
                    </div>
                    <div className="marketing-analytics__trend">
                      <BarChart3 className="size-3.5" />
                      18.4%
                    </div>
                  </div>
                  <div className="marketing-chart">
                    <div className="marketing-chart__labels">
                      <span>40</span>
                      <span>20</span>
                      <span>0</span>
                    </div>
                    <div className="marketing-chart__canvas">
                      <div className="marketing-chart__lines">
                        <span />
                        <span />
                        <span />
                      </div>
                      <svg preserveAspectRatio="none" viewBox="0 0 320 96">
                        <defs>
                          <linearGradient
                            id="marketing-chart-fill"
                            x1="0"
                            x2="0"
                            y1="0"
                            y2="1"
                          >
                            <stop
                              offset="0"
                              stopColor="#8b5cf6"
                              stopOpacity="0.34"
                            />
                            <stop
                              offset="1"
                              stopColor="#8b5cf6"
                              stopOpacity="0"
                            />
                          </linearGradient>
                        </defs>
                        <path
                          d="M0 76 C32 69 48 72 77 53 S124 63 153 40 S202 47 231 24 S277 31 320 10 L320 96 L0 96 Z"
                          fill="url(#marketing-chart-fill)"
                        />
                        <path
                          className="marketing-chart__comparison"
                          d="M0 82 C39 74 51 58 82 67 S128 44 158 53 S209 30 241 39 S282 19 320 27"
                          fill="none"
                          stroke="#5d5569"
                          strokeDasharray="3 5"
                          strokeLinecap="round"
                          strokeWidth="1.4"
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d="M0 76 C32 69 48 72 77 53 S124 63 153 40 S202 47 231 24 S277 31 320 10"
                          fill="none"
                          stroke="#a78bfa"
                          strokeLinecap="round"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                        <circle
                          className="marketing-chart__point"
                          cx="319"
                          cy="10"
                          fill="#d8ccff"
                          r="3.5"
                        />
                      </svg>
                      <div className="marketing-chart__days">
                        <span>Mon</span>
                        <span>Tue</span>
                        <span>Wed</span>
                        <span>Thu</span>
                        <span>Fri</span>
                        <span>Sat</span>
                        <span>Sun</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
      <FloatingPreviewWidgets />
      <figcaption className="sr-only">
        TaskMiner dashboard preview showing project metrics, a compact task
        board, team activity, analytics, AI assistance, and upcoming work.
      </figcaption>
    </figure>
  );
}
