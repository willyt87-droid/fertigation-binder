import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import type { Entry } from '../types'
import { formatDate } from '../lib/format'
import { entriesByDate, seriesHasPoints } from '../lib/logSeries'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Legend, Tooltip)

type Mode = 'chem' | 'vol'

type RoomLogChartProps = {
  entries: Entry[]
}

const INK = '#e8f6ef'
const MUTED = '#8aa396'
const GRID = 'rgba(34, 211, 238, 0.08)'

export function RoomLogChart({ entries }: RoomLogChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<Mode>('chem')
  const days = useMemo(() => entriesByDate(entries), [entries])
  const averaged = days.some((day) => day.samples > 1)

  const empty =
    days.length === 0 ||
    (mode === 'chem'
      ? !seriesHasPoints(days, ['feed_ec', 'runoff_ec', 'feed_ph', 'runoff_ph'])
      : !seriesHasPoints(days, ['feed_ml', 'runoff_ml']))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || empty) return

    const labels = days.map((day) => formatDate(day.date))
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets:
          mode === 'chem'
            ? [
                line('Feed EC', days.map((d) => d.feed_ec), '#22d3ee', 'y1'),
                line('RO EC', days.map((d) => d.runoff_ec), '#0284c7', 'y1'),
                line('Feed pH', days.map((d) => d.feed_ph), '#22c573', 'y'),
                line('RO pH', days.map((d) => d.runoff_ph), '#9b84ff', 'y'),
              ]
            : [
                line('Feed mL', days.map((d) => d.feed_ml), '#e5a00d', 'y'),
                line('RO mL', days.map((d) => d.runoff_ml), '#ef5350', 'y'),
              ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        events: ['mousemove', 'mouseout', 'click', 'touchend'],
        plugins: {
          legend: {
            labels: { color: INK, boxWidth: 10, font: { size: 11, weight: 700 } },
          },
          tooltip: {
            backgroundColor: '#10261c',
            borderColor: 'rgba(34, 211, 238, 0.45)',
            borderWidth: 1,
            titleColor: INK,
            bodyColor: INK,
          },
        },
        scales: {
          x: {
            ticks: { color: MUTED, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
            grid: { color: GRID },
          },
          y: {
            position: 'left',
            suggestedMin: mode === 'chem' ? 5 : undefined,
            suggestedMax: mode === 'chem' ? 7 : undefined,
            ticks: { color: mode === 'chem' ? '#22c573' : MUTED },
            title: {
              display: true,
              text: mode === 'chem' ? 'pH' : 'mL',
              color: mode === 'chem' ? '#22c573' : MUTED,
            },
            grid: { color: GRID },
          },
          ...(mode === 'chem'
            ? {
                y1: {
                  position: 'right' as const,
                  suggestedMin: 0,
                  ticks: { color: '#22d3ee' },
                  title: { display: true, text: 'EC', color: '#22d3ee' },
                  grid: { drawOnChartArea: false },
                },
              }
            : {}),
        },
      },
    })
    return () => chart.destroy()
  }, [days, empty, mode])

  return (
    <section className="log-chart-card" aria-label="Collection chart">
      <div className="log-chart-head">
        <div>
          <p className="kicker" style={{ marginBottom: 0 }}>
            Cycle chart
          </p>
          {averaged ? <p className="quiet">Zone average per day</p> : null}
        </div>
        <div className="segmented two" role="tablist" aria-label="Chart series">
          <button type="button" className={mode === 'chem' ? 'on' : ''} onClick={() => setMode('chem')}>
            pH / EC
          </button>
          <button type="button" className={mode === 'vol' ? 'on' : ''} onClick={() => setMode('vol')}>
            Volumes
          </button>
        </div>
      </div>
      {empty ? (
        <div className="empty-slot chart-empty">No collections in this cycle yet.</div>
      ) : (
        <div className="log-chart">
          <canvas ref={canvasRef} role="img" aria-label="Feed and runoff over date" />
        </div>
      )}
    </section>
  )
}

function line(
  label: string,
  data: Array<number | null>,
  color: string,
  yAxisID: 'y' | 'y1',
) {
  return {
    label,
    data,
    yAxisID,
    borderColor: color,
    backgroundColor: color,
    pointBackgroundColor: color,
    pointBorderColor: color,
    borderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6,
    spanGaps: true,
    tension: 0.15,
  }
}
