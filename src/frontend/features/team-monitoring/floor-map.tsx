"use client";
import { sharedTableSize, seatPoint, sharedSeat } from "./shared-table";
import {
  assignmentState,
  employeeLabel,
  type TeamEmployee,
} from "@/frontend/entities/workforce";

export function EmptyOffice() {
  return (
    <svg className="team-empty-office" viewBox="0 0 400 230" aria-hidden="true">
      <rect
        x="80"
        y="55"
        width="240"
        height="130"
        rx="30"
        fill="#eee0c8"
        stroke="#b8b59f"
        strokeWidth="3"
      />
      {[110, 260].map((x) => (
        <g key={x}>
          <rect x={x} y="27" width="32" height="22" rx="8" fill="#b7c8ae" />
          <rect x={x} y="190" width="32" height="22" rx="8" fill="#b7c8ae" />
        </g>
      ))}
      <path
        d="M185 120h30m-15-15v30"
        stroke="#8b9b82"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A shared-table fallback for devices where the interactive WebGL scene cannot run. */
export function FloorMap({
  employees,
  selected,
  onSelect,
  animate = true,
}: {
  employees: TeamEmployee[];
  selected: string;
  onSelect: (id: string) => void;
  animate?: boolean;
}) {
  const size = sharedTableSize(employees.length),
    span = size + 7,
    unit = 54,
    edge = span * unit;
  const px = (n: number) => (n + span / 2) * unit;
  return (
    <div
      className={`office-map shared-floor-map ${animate ? "has-motion" : ""}`}
    >
      <div className="office-map-header">
        <span>SHARED TEAM TABLE</span>
        <span>{employees.length} seats</span>
      </div>
      <svg
        viewBox={`0 0 ${edge} ${edge}`}
        style={{ minWidth: Math.max(480, edge) }}
        className="shared-table-map"
        role="group"
        aria-label="Shared employee table"
      >
        <rect
          x={px(-size / 2)}
          y={px(-size / 2) + 7}
          width={size * unit}
          height={size * unit}
          rx="32"
          fill="#b8b59f"
        />
        <rect
          x={px(-size / 2)}
          y={px(-size / 2)}
          width={size * unit}
          height={size * unit}
          rx="32"
          fill="#eee0c8"
        />
        {employees.map((employee, index) => {
          const seat = sharedSeat(index, employees.length),
            [lx, lz] = seatPoint(index, employees.length, 0, 2);
          return (
            <g
              key={employee.userId}
              role="button"
              tabIndex={0}
              aria-pressed={selected === employee.userId}
              aria-label={`${employee.name}, ${employeeLabel(employee)}, ${employee.assigned} assigned tasks`}
              onClick={() => onSelect(employee.userId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(employee.userId);
                }
              }}
              className={`shared-map-seat ${assignmentState(employee) === "active" ? "focusing" : employee.status} ${selected === employee.userId ? "selected" : ""}`}
            >
              <g
                transform={`translate(${px(seat.x)} ${px(seat.z)}) rotate(${(seat.angle * 180) / Math.PI})`}
              >
                <rect
                  className="seat-outline"
                  x="-28"
                  y="-57"
                  width="56"
                  height="118"
                  rx="15"
                  fill="transparent"
                  stroke="transparent"
                  strokeWidth="3"
                />
                <rect
                  x="-20"
                  y="8"
                  width="40"
                  height="47"
                  rx="14"
                  fill="#8aa27d"
                />
                <ellipse cx="0" cy="22" rx="17" ry="20" fill="#739267" />
                <circle cx="0" cy="15" r="13" fill="#d9b69a" />
                <path d="M-13 15Q-15-6 0 0Q15-6 13 15L4 9Z" fill="#374238" />
                <rect
                  x="-23"
                  y="-48"
                  width="46"
                  height="30"
                  rx="4"
                  fill="#354438"
                />
                <rect
                  x="-19"
                  y="-44"
                  width="38"
                  height="22"
                  rx="2"
                  fill={
                    employee.status === "focusing" ||
                    assignmentState(employee) === "active"
                      ? "#8ee0ab"
                      : "#45524b"
                  }
                />
                <rect
                  x="-18"
                  y="-11"
                  width="36"
                  height="11"
                  rx="3"
                  fill="#fff"
                  stroke="#738271"
                />
                <path
                  className="office-hand"
                  d="M-12 18-15-5m27 23 15-23"
                  stroke="#d9b69a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </g>
              <text
                x={px(lx)}
                y={px(lz)}
                textAnchor="middle"
                className="shared-map-name"
              >
                {employee.name.length > 20
                  ? employee.name.slice(0, 19) + "…"
                  : employee.name}
              </text>
              <text
                x={px(lx)}
                y={px(lz) + 19}
                textAnchor="middle"
                className="shared-map-status"
              >
                {employeeLabel(employee)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="office-map-note">
        GPU-free shared table · Select an employee for tasks and deadlines
      </p>
    </div>
  );
}
