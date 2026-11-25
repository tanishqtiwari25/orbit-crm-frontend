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
        <circle
          cx={px(0)}
          cy={px(0) + 7}
          r={(size * unit) / 2}
          fill="#b8a783"
        />
        <circle
          cx={px(0)}
          cy={px(0)}
          r={(size * unit) / 2}
          fill="#edc995"
          stroke="#d7aa70"
          strokeWidth="3"
        />
        <circle
          cx={px(0)}
          cy={px(0)}
          r={(size * unit) / 2 - 10}
          fill="none"
          stroke="#f8e1be"
          strokeWidth="2"
        />
        <text
          x={px(0)}
          y={px(0) - 8}
          textAnchor="middle"
          fill="#3e493e"
          fontSize="22"
          fontWeight="600"
        >
          Shared workspace
        </text>
        <text
          x={px(0)}
          y={px(0) + 18}
          textAnchor="middle"
          fill="#6f786b"
          fontSize="13"
        >
          {employees.length} people at one table
        </text>
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
                <g className="seat-work-screen">
                  <rect
                    x="-16"
                    y="-41"
                    width="32"
                    height="4"
                    rx="1"
                    fill="#183f36"
                  />
                  {[0, 1, 2].map((row) => (
                    <rect
                      key={row}
                      className="seat-screen-line"
                      x="-15"
                      y={-34 + row * 4}
                      width={24 - row * 5}
                      height="2"
                      rx="1"
                      fill="#f0fff9"
                      style={{ animationDelay: `${row * -0.35}s` }}
                    />
                  ))}
                  <rect
                    className="seat-screen-cursor"
                    x="10"
                    y="-26"
                    width="2"
                    height="3"
                    fill="#183f36"
                  />
                </g>
                <rect
                  x="-18"
                  y="-11"
                  width="36"
                  height="11"
                  rx="3"
                  fill="#fff"
                  stroke="#738271"
                />
                {Array.from({ length: 18 }, (_, key) => (
                  <rect
                    key={key}
                    className="seat-key"
                    x={-15 + (key % 9) * 3.4}
                    y={-9 + Math.floor(key / 9) * 4}
                    width="2.5"
                    height="2.8"
                    rx=".5"
                    fill="#7a8e83"
                    style={{ animationDelay: `${key * -0.13}s` }}
                  />
                ))}
                <path
                  className="seat-hand-left"
                  d="M-12 18 Q-20 7 -9 -4"
                  stroke="#d9b69a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
                <path
                  className="seat-hand-right"
                  d="M12 18 Q20 7 9 -4"
                  stroke="#d9b69a"
                  strokeWidth="7"
                  strokeLinecap="round"
                />
              </g>
              <rect
                x={px(lx) - 78}
                y={px(lz) - 22}
                width="156"
                height="51"
                rx="25"
                fill="var(--surface,white)"
                stroke={selected === employee.userId ? "#568966" : "#dce5df"}
              />
              <circle cx={px(lx) - 52} cy={px(lz) + 3} r="18" fill="#edf3ef" />
              <text
                x={px(lx) - 52}
                y={px(lz) + 8}
                textAnchor="middle"
                fontSize="12"
                fill="#244f3c"
              >
                {employee.name
                  .trim()
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")}
              </text>
              <text
                x={px(lx) + 8}
                y={px(lz)}
                textAnchor="middle"
                className="shared-map-name"
              >
                {employee.name.length > 12
                  ? employee.name.slice(0, 11) + "…"
                  : employee.name}
              </text>
              <text
                x={px(lx) + 8}
                y={px(lz) + 18}
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
